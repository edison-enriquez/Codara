import type { RunResult } from '../types'

const API_BASE = '/api'

export async function runCCode(code: string): Promise<RunResult> {
  try {
    const res = await fetch(`${API_BASE}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'c', code }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      return { logs: [], error: err.error ?? `Error del servidor: ${res.status}` }
    }
    return res.json()
  } catch (e) {
    return { logs: [], error: `No se pudo conectar al servidor sandbox: ${(e as Error).message}` }
  }
}

export async function runCTests(code: string, testCode: string): Promise<RunResult> {
  try {
    const res = await fetch(`${API_BASE}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'c', code, testCode }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      return { logs: [], error: err.error ?? `Error del servidor: ${res.status}`, testResults: [] }
    }
    return res.json()
  } catch (e) {
    return {
      logs: [],
      error: `No se pudo conectar al servidor sandbox: ${(e as Error).message}`,
      testResults: [],
    }
  }
}

export async function checkSandboxHealth(): Promise<{ ok: boolean; runtime: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) })
    return res.json()
  } catch {
    return { ok: false, runtime: 'unavailable' }
  }
}
