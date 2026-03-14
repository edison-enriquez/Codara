import { useState, useCallback } from 'react'
import { runCode, runCodeTests } from '../utils/codeRunner'
import { runCCode, runCTests } from '../utils/apiRunner'
import type { RunResult } from '../types'

export type RunState = 'idle' | 'running' | 'done' | 'error'

export function useCodeRunner(language: string) {
  const [result, setResult] = useState<RunResult | null>(null)
  const [state, setState] = useState<RunState>('idle')

  const isC = language === 'c'

  const run = useCallback(async (code: string) => {
    setState('running')
    setResult(null)
    const r = isC ? await runCCode(code) : await runCode(language, code)
    setResult(r)
    setState(r.error ? 'error' : 'done')
  }, [language, isC])

  const runTests = useCallback(async (solution: string, tests: string) => {
    setState('running')
    setResult(null)
    const r = isC ? await runCTests(solution, tests) : await runCodeTests(language, solution, tests)
    setResult(r)
    setState(r.error && !r.testResults?.length ? 'error' : 'done')
  }, [language, isC])

  const reset = useCallback(() => {
    setResult(null)
    setState('idle')
  }, [])

  return { result, state, run, runTests, reset }
}
