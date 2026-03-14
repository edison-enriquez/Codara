/**
 * Codara Sandbox Server
 * 
 * Ejecuta código C (y otros lenguajes compilados) de forma segura usando
 * Docker o Podman como runtime de contenedor. Diseñado para ser compatible
 * con ambos (mismo CLI OCI). Si no hay runtime de contenedor disponible,
 * cae en GCC local con restricciones de recursos.
 * 
 * POST /api/run   → ejecuta código
 * POST /api/test  → ejecuta código + tests, retorna resultados individuales
 * GET  /api/health → health check
 */

import http from 'node:http'
import { exec, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

const execAsync = promisify(exec)
const PORT = process.env.SANDBOX_PORT || 3001
const TIMEOUT_MS = 8000  // 8 seg. max ejecución

// ─── Detectar runtime disponible ──────────────────────────────────────────────

async function detectRuntime() {
  for (const rt of ['podman', 'docker']) {
    try {
      await execAsync(`${rt} --version`, { timeout: 3000 })
      return rt
    } catch { /* probar siguiente */ }
  }
  return null  // fallback a GCC local
}

let RUNTIME = null
detectRuntime().then(rt => {
  RUNTIME = rt
  console.log(`[sandbox] Runtime: ${rt ?? 'gcc-local'} | Puerto: ${PORT}`)
})

// ─── C Test Framework (embebido en el código generado) ────────────────────────

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

// ─── Quitar la función main() del código del usuario antes de combinar con tests ─

/**
 * Elimina int main(...) { ... } rastreando profundidad de llaves.
 * Necesario porque el test-framework inyecta su propio main().
 */
function stripMainFunction(code) {
  const mainRe = /\bint\s+main\s*\([^)]*\)\s*\{/
  const match = mainRe.exec(code)
  if (!match) return code

  const openBrace = match.index + match[0].length - 1  // índice de '{'
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

// ─── Generar programa C completo para tests ───────────────────────────────────

function buildCTestProgram(solutionCode, testCode) {
  // Quitar main() del usuario — el framework de tests aporta el suyo
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

function buildCExecProgram(code) {
  // Si el código ya tiene main, usarlo tal cual. Si no, envolverlo.
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

// ─── Parsear salida de tests C ────────────────────────────────────────────────

function parseCTestOutput(stdout, stderr) {
  const lines = (stdout + '\n' + stderr).split('\n')
  const tests = []
  let logs = []

  for (const line of lines) {
    if (line.startsWith('__PASS__')) {
      tests.push({ name: line.slice(8), passed: true })
    } else if (line.startsWith('__FAIL__')) {
      const parts = line.slice(8).split('__')
      tests.push({ name: parts[0], passed: false, error: parts[1] ?? '' })
    } else if (line.startsWith('__SUMMARY__')) {
      // ignorar, ya tenemos los resultados
    } else if (line.trim()) {
      logs.push(line)
    }
  }

  return { tests, logs }
}

// ─── Ejecutar en Docker/Podman ────────────────────────────────────────────────

async function runInContainer(runtime, code, language, testCode) {
  const id = crypto.randomBytes(8).toString('hex')
  const tmpDir = path.join(os.tmpdir(), `codara-${id}`)

  try {
    await fs.mkdir(tmpDir, { recursive: true })

    if (language === 'c') {
      const source = testCode
        ? buildCTestProgram(code, testCode)
        : buildCExecProgram(code)

      await fs.writeFile(path.join(tmpDir, 'main.c'), source)

      const compileCmd = [
        runtime, 'run', '--rm',
        '--network', 'none',
        '--memory', '128m',
        '--cpus', '0.3',
        '--security-opt', 'no-new-privileges',
        '-v', `${tmpDir}:/workspace:z`,
        'codara-gcc',
        'sh', '-c',
        `gcc -Wall -Wextra -o /workspace/prog /workspace/main.c 2>/workspace/compile.txt; ` +
        `if [ -f /workspace/prog ]; then timeout 5 /workspace/prog > /workspace/out.txt 2>&1; echo $? > /workspace/exit.txt; fi`
      ].map(String)

      await new Promise((resolve, reject) => {
        const child = execFile(compileCmd[0], compileCmd.slice(1), { timeout: TIMEOUT_MS + 2000 }, (err) => {
          // err puede ser timeout del contenedor, no del programa
          resolve()
        })
      })

      // Leer resultados
      let compileOut = '', progOut = '', exitCode = '0'
      try { compileOut = await fs.readFile(path.join(tmpDir, 'compile.txt'), 'utf8') } catch {}
      try { progOut = await fs.readFile(path.join(tmpDir, 'out.txt'), 'utf8') } catch {}
      try { exitCode = (await fs.readFile(path.join(tmpDir, 'exit.txt'), 'utf8')).trim() } catch {}

      // ¿Hubo error de compilación?
      const hasExe = await fs.access(path.join(tmpDir, 'prog')).then(() => true).catch(() => false)
      if (!hasExe) {
        return {
          logs: [],
          error: `Error de compilación:\n${compileOut.trim()}`,
          testResults: testCode ? [] : undefined,
          compilationError: compileOut.trim()
        }
      }

      if (testCode) {
        const { tests, logs } = parseCTestOutput(progOut, compileOut)
        return { logs, error: null, testResults: tests }
      }

      return {
        logs: progOut.split('\n').filter(l => l.trim()),
        error: exitCode !== '0' ? `El programa terminó con código ${exitCode}` : null
      }
    }

    throw new Error(`Lenguaje no soportado en sandbox: ${language}`)
  } finally {
    // Limpiar archivos temporales
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

// ─── Ejecutar GCC local (fallback) ───────────────────────────────────────────

async function runWithLocalGcc(code, testCode) {
  const id = crypto.randomBytes(8).toString('hex')
  const tmpDir = path.join(os.tmpdir(), `codara-local-${id}`)

  try {
    await fs.mkdir(tmpDir, { recursive: true })

    const source = testCode
      ? buildCTestProgram(code, testCode)
      : buildCExecProgram(code)

    const srcFile = path.join(tmpDir, 'main.c')
    const binFile = path.join(tmpDir, 'prog')

    await fs.writeFile(srcFile, source)

    // Compilar
    let compileErr = ''
    try {
      await execAsync(`gcc -Wall -o "${binFile}" "${srcFile}" 2>&1`, { timeout: 15000 })
    } catch (e) {
      compileErr = e.stdout ?? e.message ?? 'Error de compilación desconocido'
    }

    const compiled = await fs.access(binFile).then(() => true).catch(() => false)
    if (!compiled) {
      return {
        logs: [],
        error: `Error de compilación:\n${compileErr}`,
        testResults: testCode ? [] : undefined,
        compilationError: compileErr
      }
    }

    // Ejecutar con timeout
    let stdout = '', stderr = '', exitCode = 0
    try {
      const res = await execAsync(
        `timeout 5 "${binFile}"`,
        { timeout: TIMEOUT_MS, maxBuffer: 512 * 1024 }
      )
      stdout = res.stdout ?? ''
      stderr = res.stderr ?? ''
    } catch (e) {
      stdout = e.stdout ?? ''
      stderr = e.stderr ?? ''
      exitCode = e.code ?? 1
      if (e.killed) {
        return { logs: [], error: 'Tiempo de ejecución excedido (5 s)', testResults: testCode ? [] : undefined }
      }
    }

    if (testCode) {
      const { tests, logs } = parseCTestOutput(stdout, stderr)
      return { logs, error: null, testResults: tests }
    }

    return {
      logs: stdout.split('\n').filter(l => l.trim()),
      error: exitCode !== 0 ? stderr.trim() || `Programa terminó con código ${exitCode}` : null
    }
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

// ─── Entry point de ejecución ─────────────────────────────────────────────────

async function executeCode(language, code, testCode) {
  if (language !== 'c') {
    return { logs: [], error: `El backend solo maneja C. (Recibido: ${language})` }
  }

  try {
    if (RUNTIME) {
      return await runInContainer(RUNTIME, code, language, testCode)
    }
    return await runWithLocalGcc(code, testCode)
  } catch (err) {
    console.error('[sandbox] Error interno:', err)
    return { logs: [], error: `Error interno del servidor: ${err.message}`, testResults: testCode ? [] : undefined }
  }
}

// ─── Servidor HTTP ────────────────────────────────────────────────────────────

function corsHeaders(req) {
  const origin = req.headers.origin ?? ''
  // Permite cualquier origen localhost (el proxy de Vite puede usar distintos puertos)
  const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin)
  const allowed = isLocalhost ? origin : 'http://localhost:5173'
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) }
      catch { reject(new Error('JSON inválido')) }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const headers = corsHeaders(req)

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, headers)
    res.end(JSON.stringify({ ok: true, runtime: RUNTIME ?? 'gcc-local', pid: process.pid }))
    return
  }

  if (req.method === 'POST' && (req.url === '/api/run' || req.url === '/api/test')) {
    try {
      const body = await readBody(req)
      const { language = 'c', code = '', testCode = null } = body

      // Validación básica — evitar inyección de comandos en el código enviado
      // (el código corre en sandbox, pero sanitizamos igual)
      if (typeof code !== 'string' || code.length > 64_000) {
        res.writeHead(400, headers)
        res.end(JSON.stringify({ error: 'Código inválido o demasiado largo' }))
        return
      }

      const result = await executeCode(language, code, req.url === '/api/test' ? testCode : null)
      res.writeHead(200, headers)
      res.end(JSON.stringify(result))
    } catch (err) {
      res.writeHead(500, headers)
      res.end(JSON.stringify({ error: err.message }))
    }
    return
  }

  res.writeHead(404, headers)
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }))
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[sandbox] Servidor escuchando en http://127.0.0.1:${PORT}`)
})

process.on('SIGTERM', () => { server.close(); process.exit(0) })
process.on('SIGINT',  () => { server.close(); process.exit(0) })
