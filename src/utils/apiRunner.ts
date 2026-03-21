import type { RunResult, TestResult, IOTest } from '../types'

const WANDBOX_API = 'https://wandbox.org/api/compile.json'
const COMPILER = 'gcc-head'
const COMPILER_OPTIONS_RAW = '-x c -std=c11 -Wall -Wextra'

// ─── C Test Framework ─────────────────────────────────────────────────────────

const C_TEST_HEADER = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <unistd.h>

static int __t_run = 0, __t_pass = 0;

/* ── Macro legacy (solo pass/fail) ── */
#define TEST(name, cond, msg) do { \\
    __t_run++; \\
    if (cond) { \\
        printf("__PASS__%s\\n", name); \\
        __t_pass++; \\
    } else { \\
        printf("__FAIL__%s__%s\\n", name, msg); \\
    } \\
} while(0)

/* ── Macros con valor real vs esperado ── */
#define TEST_EQ_INT(name, input_str, actual_expr, expected) do { \\
    __t_run++; \\
    int __act = (int)(actual_expr); \\
    int __exp = (int)(expected); \\
    if (__act == __exp) { \\
        printf("__PASS__%s__IN__%s__EXP__%d__ACT__%d\\n", name, input_str, __exp, __act); \\
        __t_pass++; \\
    } else { \\
        printf("__FAIL__%s__IN__%s__EXP__%d__ACT__%d\\n", name, input_str, __exp, __act); \\
    } \\
} while(0)

#define TEST_EQ_FLOAT(name, input_str, actual_expr, expected, tol) do { \\
    __t_run++; \\
    double __act = (double)(actual_expr); \\
    double __exp = (double)(expected); \\
    if (fabs(__act - __exp) <= (tol)) { \\
        printf("__PASS__%s__IN__%s__EXP__%.4g__ACT__%.4g\\n", name, input_str, __exp, __act); \\
        __t_pass++; \\
    } else { \\
        printf("__FAIL__%s__IN__%s__EXP__%.4g__ACT__%.4g\\n", name, input_str, __exp, __act); \\
    } \\
} while(0)

#define TEST_EQ_STR(name, input_str, actual_expr, expected) do { \\
    __t_run++; \\
    const char *__act = (actual_expr); \\
    const char *__exp = (expected); \\
    if (__act && __exp && strcmp(__act, __exp) == 0) { \\
        printf("__PASS__%s__IN__%s__EXP__%s__ACT__%s\\n", name, input_str, __exp, __act); \\
        __t_pass++; \\
    } else { \\
        printf("__FAIL__%s__IN__%s__EXP__%s__ACT__%s\\n", name, input_str, __exp ? __exp : "(null)", __act ? __act : "(null)"); \\
    } \\
} while(0)

/* ── Captura de stdout del programa del estudiante ── */
static char __student_out[8192] = "";
#define CAPTURE_STUDENT_OUTPUT() do { \\
    int __sv = dup(STDOUT_FILENO); \\
    FILE *__tmp = tmpfile(); \\
    dup2(fileno(__tmp), STDOUT_FILENO); \\
    student_main(); \\
    fflush(stdout); \\
    dup2(__sv, STDOUT_FILENO); \\
    close(__sv); \\
    rewind(__tmp); \\
    int __n = (int)fread(__student_out, 1, sizeof(__student_out)-1, __tmp); \\
    __student_out[__n] = '\\0'; \\
    fclose(__tmp); \\
} while(0)

#define TEST_OUTPUT_CONTAINS(name, substr) do { \\
    __t_run++; \\
    if (strstr(__student_out, substr)) { \\
        printf("__PASS__%s__IN____EXP__%s__ACT__encontrado\\n", name, substr); \\
        __t_pass++; \\
    } else { \\
        char __excerpt[120] = "(sin salida)"; \\
        if (__student_out[0]) { strncpy(__excerpt, __student_out, 119); __excerpt[119] = '\\0'; } \\
        printf("__FAIL__%s__IN____EXP__%s__ACT__%s\\n", name, substr, __excerpt); \\
    } \\
} while(0)

#define EXPECT_EQ(a, b)  ((a) == (b))
#define EXPECT_NEQ(a, b) ((a) != (b))
#define EXPECT_GT(a, b)  ((a) >  (b))
#define EXPECT_LT(a, b)  ((a) <  (b))
#define EXPECT_STR_EQ(a, b) (strcmp((a), (b)) == 0)
`

// Renombra int main( → int student_main( para poder llamarlo desde el framework de tests
function renameMainFunction(code: string): string {
  return code.replace(/\bint\s+main\s*\(/, (m) => m.replace('main', 'student_main'))
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
  const hasMain = /\bint\s+main\s*\(/.test(solutionCode)
  // Renombrar main → student_main para ejecutarlo antes de los tests
  const preparedCode = hasMain ? renameMainFunction(solutionCode) : solutionCode

  return `${C_TEST_HEADER}

/* ── Solución del usuario ── */
${preparedCode}

/* ── Tests ── */
void run_tests(void);
${testCode.includes('void run_tests') ? '' : 'void run_tests(void) {'}
${testCode}
${testCode.includes('void run_tests') ? '' : '}'}

int main(void) {
${hasMain ? '    student_main(); /* ejecutar código del estudiante */' : ''}
    run_tests();
    printf("__SUMMARY__%d__%d__\\n", __t_pass, __t_run);
    return (__t_pass == __t_run) ? 0 : 1;
}
`
}

function parseCTestOutput(output: string): { tests: TestResult[]; logs: string[] } {
  const lines = output.split('\n')
  const tests: TestResult[] = []
  const logs: string[] = []

  for (const line of lines) {
    if (line.startsWith('__PASS__') || line.startsWith('__FAIL__')) {
      const passed = line.startsWith('__PASS__')
      const rest = line.slice(8) // quita __PASS__ o __FAIL__

      // Formato rico: name__IN__input__EXP__expected__ACT__actual
      const inIdx  = rest.indexOf('__IN__')
      const expIdx = rest.indexOf('__EXP__')
      const actIdx = rest.indexOf('__ACT__')

      if (inIdx !== -1 && expIdx !== -1 && actIdx !== -1) {
        const name     = rest.slice(0, inIdx)
        const rawInput = rest.slice(inIdx + 6, expIdx)
        const input    = rawInput.length > 0 ? rawInput : undefined
        const expected = rest.slice(expIdx + 7, actIdx)
        const actual   = rest.slice(actIdx + 7)
        tests.push({ name, passed, input, expected, actual })
      } else {
        // Formato legacy: name__msg (solo para __FAIL__) o solo name
        const parts = rest.split('__')
        tests.push({ name: parts[0], passed, error: parts[1] ?? '' })
      }
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

async function compileAndRun(source: string, stdin?: string): Promise<WandboxResponse> {
  const body: Record<string, string> = {
    compiler: COMPILER,
    code: source,
    'compiler-option-raw': COMPILER_OPTIONS_RAW,
  }
  if (stdin !== undefined) body.stdin = stdin
  const res = await fetch(WANDBOX_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

// ─── IO tests: corre el programa con stdin y compara stdout ──────────────────

function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())   // quita espacios/tabs al final de cada línea
    .join('\n')
    .trimEnd()                        // quita líneas vacías al final
}

export async function runCIOTests(code: string, ioTests: IOTest[]): Promise<RunResult> {
  // Primero compilamos una vez para detectar errores de compilación
  const source = buildCExecProgram(code)
  let compileError = ''
  try {
    const probe = await compileAndRun(source, '')
    compileError = (probe.compiler_error ?? probe.compiler_message ?? '').trim()
    if (probe.status !== '0' && !probe.program_output && compileError) {
      return { logs: [], error: `Error de compilación:\n${compileError}`, testResults: [] }
    }
  } catch (e) {
    return { logs: [], error: `No se pudo conectar a Wandbox: ${(e as Error).message}`, testResults: [] }
  }

  // Lanzar todos los test cases en paralelo
  const results = await Promise.all(
    ioTests.map(async (test): Promise<TestResult> => {
      try {
        const data = await compileAndRun(source, test.input)
        const actual   = normalizeOutput(data.program_output ?? '')
        const expected = normalizeOutput(test.expected)
        const passed   = actual === expected
        return { name: test.name, passed, input: test.input, expected, actual }
      } catch (e) {
        return {
          name: test.name,
          passed: false,
          input: test.input,
          expected: normalizeOutput(test.expected),
          actual: '',
          error: (e as Error).message,
        }
      }
    })
  )

  const warn = compileError ? [`⚠ ${compileError}`] : []
  return { logs: warn, error: null, testResults: results }
}
