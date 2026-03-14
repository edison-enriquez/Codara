import type { RunResult, TestResult } from '../types'

// ─── JavaScript / TypeScript sandbox execution ────────────────────────────────

const JS_CONSOLE_SHIM = `
const __logs = [];
const console = {
  log:   (...a) => __logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ')),
  error: (...a) => __logs.push('[error] ' + a.map(x => String(x)).join(' ')),
  warn:  (...a) => __logs.push('[warn] '  + a.map(x => String(x)).join(' ')),
  info:  (...a) => __logs.push('[info] '  + a.map(x => String(x)).join(' ')),
  table: (x)    => __logs.push(JSON.stringify(x, null, 2)),
};
`

const TEST_FRAMEWORK = `
const __tests = [];
function test(name, fn) {
  try { fn(); __tests.push({ name, passed: true }); }
  catch (e) { __tests.push({ name, passed: false, error: e.message }); }
}
function it(name, fn)       { test(name, fn); }
function describe(name, fn) { fn(); }
function expect(received) {
  const fail = (msg) => { throw new Error(msg); };
  return {
    toBe:            (e) => { if (received !== e)  fail(\`Esperaba \${JSON.stringify(e)} pero obtuvo \${JSON.stringify(received)}\`); },
    toEqual:         (e) => { if (JSON.stringify(received) !== JSON.stringify(e)) fail(\`Esperaba \${JSON.stringify(e)} pero obtuvo \${JSON.stringify(received)}\`); },
    toBeTruthy:      ()  => { if (!received) fail(\`Esperaba truthy, obtuvo \${JSON.stringify(received)}\`); },
    toBeFalsy:       ()  => { if (received)  fail(\`Esperaba falsy, obtuvo \${JSON.stringify(received)}\`); },
    toBeNull:        ()  => { if (received !== null) fail(\`Esperaba null, obtuvo \${JSON.stringify(received)}\`); },
    toBeDefined:     ()  => { if (received === undefined) fail('Esperaba un valor definido'); },
    toBeUndefined:   ()  => { if (received !== undefined) fail(\`Esperaba undefined, obtuvo \${JSON.stringify(received)}\`); },
    toBeGreaterThan: (n) => { if (!(received > n))  fail(\`Esperaba \${received} > \${n}\`); },
    toBeLessThan:    (n) => { if (!(received < n))  fail(\`Esperaba \${received} < \${n}\`); },
    toContain:       (i) => { if (!received?.includes?.(i)) fail(\`Esperaba que contenga \${JSON.stringify(i)}\`); },
    toHaveLength:    (n) => { if (received?.length !== n) fail(\`Esperaba longitud \${n}, obtuvo \${received?.length}\`); },
    not: {
      toBe:      (e) => { if (received === e) fail(\`No esperaba \${JSON.stringify(e)}\`); },
      toBeNull:  ()  => { if (received === null) fail('No esperaba null'); },
      toBeDefined: () => { if (received !== undefined) fail('No esperaba un valor definido'); },
    },
  };
}
`

function buildIframeSrc(fullCode: string): string {
  const escaped = fullCode.replace(/<\/script>/gi, '<\\/script>')
  return `<!doctype html><html><body><script>${escaped}<\/script></body></html>`
}

function runInIframe(iframeSrc: string, msgId: string, timeoutMs = 5000): Promise<{ logs: string[]; error: string | null; tests?: TestResult[] }> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'display:none;position:fixed;width:0;height:0;'
    iframe.setAttribute('sandbox', 'allow-scripts')

    const cleanup = () => {
      window.removeEventListener('message', handler)
      if (document.body.contains(iframe)) document.body.removeChild(iframe)
    }

    const handler = (e: MessageEvent) => {
      if (e.data?.cid !== msgId) return
      clearTimeout(timer)
      cleanup()
      resolve({ logs: e.data.logs ?? [], error: e.data.error ?? null, tests: e.data.tests })
    }

    const timer = setTimeout(() => {
      cleanup()
      resolve({ logs: [], error: 'Tiempo de ejecución excedido (5 s)' })
    }, timeoutMs)

    window.addEventListener('message', handler)
    iframe.srcdoc = iframeSrc
    document.body.appendChild(iframe)
  })
}

export async function runJavaScript(code: string): Promise<RunResult> {
  const id = `cdr-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const fullCode = `
${JS_CONSOLE_SHIM}
try {
${code}
  window.parent.postMessage({ cid: '${id}', logs: __logs, error: null }, '*');
} catch(e) {
  window.parent.postMessage({ cid: '${id}', logs: __logs, error: e.message }, '*');
}
`
  const { logs, error } = await runInIframe(buildIframeSrc(fullCode), id)
  return { logs, error }
}

export async function runJavaScriptTests(solutionCode: string, testCode: string): Promise<RunResult> {
  const id = `cdr-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const fullCode = `
${JS_CONSOLE_SHIM}
${TEST_FRAMEWORK}
try {
${solutionCode}
${testCode}
  window.parent.postMessage({ cid: '${id}', logs: __logs, tests: __tests, error: null }, '*');
} catch(e) {
  window.parent.postMessage({ cid: '${id}', logs: __logs, tests: __tests ?? [], error: e.message }, '*');
}
`
  const { logs, error, tests } = await runInIframe(buildIframeSrc(fullCode), id, 10000)
  return { logs, error, testResults: tests ?? [] }
}

// ─── Python execution via Pyodide ─────────────────────────────────────────────

let _pyodidePromise: Promise<unknown> | null = null

async function getPyodide(): Promise<unknown> {
  if (_pyodidePromise) return _pyodidePromise
  _pyodidePromise = (async () => {
    if (!(window as { loadPyodide?: unknown }).loadPyodide) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement('script')
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js'
        s.onload = () => res()
        s.onerror = () => rej(new Error('No se pudo cargar Pyodide'))
        document.head.appendChild(s)
      })
    }
    return (window as unknown as { loadPyodide: () => Promise<unknown> }).loadPyodide()
  })()
  return _pyodidePromise
}

export async function runPython(code: string): Promise<RunResult> {
  try {
    const py = await getPyodide() as {
      setStdout: (opts: { batched: (s: string) => void }) => void
      setStderr: (opts: { batched: (s: string) => void }) => void
      runPythonAsync: (code: string) => Promise<void>
    }
    const logs: string[] = []
    py.setStdout({ batched: (s) => logs.push(s) })
    py.setStderr({ batched: (s) => logs.push(`[stderr] ${s}`) })
    await py.runPythonAsync(code)
    return { logs, error: null }
  } catch (e) {
    return { logs: [], error: (e as Error).message }
  }
}

export async function runPythonTests(solutionCode: string, testCode: string): Promise<RunResult> {
  const fullCode = `
${solutionCode}

__tests = []

def test(name, fn):
    try:
        fn()
        __tests.append({"name": name, "passed": True})
    except AssertionError as e:
        __tests.append({"name": name, "passed": False, "error": str(e)})
    except Exception as e:
        __tests.append({"name": name, "passed": False, "error": str(e)})

${testCode}

import json
print("__TEST_RESULTS__:" + json.dumps(__tests))
`
  try {
    const py = await getPyodide() as {
      setStdout: (opts: { batched: (s: string) => void }) => void
      setStderr: (opts: { batched: (s: string) => void }) => void
      runPythonAsync: (code: string) => Promise<void>
    }
    const raw: string[] = []
    py.setStdout({ batched: (s) => raw.push(s) })
    py.setStderr({ batched: (s) => raw.push(`[stderr] ${s}`) })
    await py.runPythonAsync(fullCode)

    const testLine = raw.find((l) => l.startsWith('__TEST_RESULTS__:'))
    const testResults: TestResult[] = testLine ? JSON.parse(testLine.replace('__TEST_RESULTS__:', '')) : []
    const logs = raw.filter((l) => !l.startsWith('__TEST_RESULTS__:'))
    return { logs, error: null, testResults }
  } catch (e) {
    return { logs: [], error: (e as Error).message, testResults: [] }
  }
}

export async function runCode(language: string, code: string): Promise<RunResult> {
  if (language === 'python') return runPython(code)
  return runJavaScript(code)
}

export async function runCodeTests(language: string, solution: string, tests: string): Promise<RunResult> {
  if (language === 'python') return runPythonTests(solution, tests)
  return runJavaScriptTests(solution, tests)
}
