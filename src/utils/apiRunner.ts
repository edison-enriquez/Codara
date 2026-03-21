import type { RunResult, TestResult } from '../types'

const WANDBOX_API = 'https://wandbox.org/api/compile.json'
const COMPILER = 'gcc-head'
const COMPILER_OPTIONS_RAW = '-x c -std=c11 -Wall -Wextra'

// ─── C Test Framework ─────────────────────────────────────────────────────────

const C_TEST_HEADER = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

static int __t_run = 0, __t_pass = 0;

#define TEST(name, cond, msg) do { \\
    __t_run++; \\
    if (cond) { \\
        printf("__PASS__%s\\n", name); \\
        __t_pass++; \\
    } else { \\
        printf("__FAIL__%s__%s\\n", name, msg); \\
    } \\
} while(0)

#define EXPECT_EQ(a, b)  ((a) == (b))
#define EXPECT_NEQ(a, b) ((a) != (b))
#define EXPECT_GT(a, b)  ((a) >  (b))
#define EXPECT_LT(a, b)  ((a) <  (b))
#define EXPECT_STR_EQ(a, b) (strcmp((a), (b)) == 0)
`

const C_TEST_FOOTER = `
int main(void) {
    run_tests();
    printf("__SUMMARY__%d__%d__\\n", __t_pass, __t_run);
    return (__t_pass == __t_run) ? 0 : 1;
}
`

function stripMainFunction(code: string): string {
  const mainRe = /\bint\s+main\s*\([^)]*\)\s*\{/
  const match = mainRe.exec(code)
  if (!match) return code

  const openBrace = match.index + match[0].length - 1
  let depth = 0
  let end = openBrace

  for (let i = openBrace; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }

  return (code.slice(0, match.index) + code.slice(end + 1)).replace(/\n{3,}/g, '\n\n').trim()
}

function buildCExecProgram(code: string): string {
  if (/\bint\s+main\s*\(/.test(code)) return code
  return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

int main(void) {
${code}
    return 0;
}
`
}

function buildCTestProgram(solutionCode: string, testCode: string): string {
  const cleanCode = stripMainFunction(solutionCode)
  return `${C_TEST_HEADER}

/* ── Solución del usuario (sin main) ── */
${cleanCode}

/* ── Tests ── */
void run_tests(void);
${testCode.includes('void run_tests') ? '' : 'void run_tests(void) {'}
${testCode}
${testCode.includes('void run_tests') ? '' : '}'}

${C_TEST_FOOTER}
`
}

function parseCTestOutput(output: string): { tests: TestResult[]; logs: string[] } {
  const lines = output.split('\n')
  const tests: TestResult[] = []
  const logs: string[] = []

  for (const line of lines) {
    if (line.startsWith('__PASS__')) {
      tests.push({ name: line.slice(8), passed: true })
    } else if (line.startsWith('__FAIL__')) {
      const parts = line.slice(8).split('__')
      tests.push({ name: parts[0], passed: false, error: parts[1] ?? '' })
    } else if (line.startsWith('__SUMMARY__')) {
      // ignorar
    } else if (line.trim()) {
      logs.push(line)
    }
  }

  return { tests, logs }
}

// ─── Llamada a Wandbox ────────────────────────────────────────────────────────

interface WandboxResponse {
  status: string
  program_output?: string
  program_error?: string
  compiler_output?: string
  compiler_error?: string
  compiler_message?: string
}

async function compileAndRun(source: string): Promise<WandboxResponse> {
  const res = await fetch(WANDBOX_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ compiler: COMPILER, code: source, 'compiler-option-raw': COMPILER_OPTIONS_RAW }),
  })
  if (!res.ok) throw new Error(`Wandbox respondió con HTTP ${res.status}`)
  return res.json()
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function runCCode(code: string): Promise<RunResult> {
  try {
    const source = buildCExecProgram(code)
    const data = await compileAndRun(source)

    const compileError = (data.compiler_error ?? data.compiler_message ?? '').trim()
    if (data.status !== '0' && !data.program_output && compileError) {
      return { logs: [], error: `Error de compilación:\n${compileError}` }
    }

    const output = (data.program_output ?? '') + (data.program_error ?? '')
    const logs = output.split('\n').filter(l => l.trim() !== '')
    const warn = compileError ? [`⚠ ${compileError}`] : []

    return { logs: [...warn, ...logs], error: null }
  } catch (e) {
    return { logs: [], error: `No se pudo conectar a Wandbox: ${(e as Error).message}` }
  }
}

export async function runCTests(code: string, testCode: string): Promise<RunResult> {
  try {
    const source = buildCTestProgram(code, testCode)
    const data = await compileAndRun(source)

    const compileError = (data.compiler_error ?? data.compiler_message ?? '').trim()
    if (data.status !== '0' && !data.program_output && compileError) {
      return { logs: [], error: `Error de compilación:\n${compileError}`, testResults: [] }
    }

    const output = (data.program_output ?? '') + (data.program_error ?? '')
    const { tests, logs } = parseCTestOutput(output)
    const warn = compileError ? [`⚠ ${compileError}`] : []

    return { logs: [...warn, ...logs], error: null, testResults: tests }
  } catch (e) {
    return {
      logs: [],
      error: `No se pudo conectar a Wandbox: ${(e as Error).message}`,
      testResults: [],
    }
  }
}
