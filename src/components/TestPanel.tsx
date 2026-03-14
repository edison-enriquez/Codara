import { CheckCircle2, XCircle, Terminal, Loader2 } from 'lucide-react'
import type { RunResult } from '../types'
import type { RunState } from '../hooks/useCodeRunner'

interface Props {
  result: RunResult | null
  state: RunState
}

export default function TestPanel({ result, state }: Props) {
  if (state === 'idle') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Haz clic en <span className="mx-1 rounded bg-elevated px-1.5 py-0.5 text-xs font-mono">Ejecutar pruebas</span> para ver los resultados
      </div>
    )
  }

  if (state === 'running') {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" />
        Ejecutando pruebas…
      </div>
    )
  }

  const tests = result?.testResults ?? []
  const passed = tests.filter((t) => t.passed).length
  const total = tests.length
  const allPassed = total > 0 && passed === total

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Summary bar */}
      <div
        className={`flex items-center justify-between border-b px-4 py-2 text-sm font-medium ${
          allPassed ? 'border-green/20 bg-green/10 text-green' : 'border-border bg-surface text-text'
        }`}
      >
        <span>
          {total > 0
            ? allPassed
              ? `✅ ¡Todas las pruebas pasaron! (${passed}/${total})`
              : `${passed}/${total} pruebas pasaron`
            : 'Sin pruebas'}
        </span>
        {total > 0 && (
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-elevated">
            <div
              className={`h-full rounded-full transition-all ${allPassed ? 'bg-green' : 'bg-blue'}`}
              style={{ width: `${(passed / total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Compilation / runtime error */}
      {result?.error && !tests.length && (
        <div className="m-3 rounded-lg border border-red/20 bg-red/5 p-3">
          <div className="mb-1 flex items-center gap-1 text-xs font-medium text-red">
            <XCircle size={12} />
            Error de ejecución
          </div>
          <pre className="whitespace-pre-wrap font-mono text-xs text-red/80">{result.error}</pre>
        </div>
      )}

      {/* Test list */}
      <div className="flex-1 space-y-1 p-3">
        {tests.map((t, i) => (
          <div
            key={i}
            className={`rounded-lg border px-3 py-2.5 ${
              t.passed
                ? 'border-green/20 bg-green/5'
                : 'border-red/20 bg-red/5'
            }`}
          >
            <div className="flex items-start gap-2">
              {t.passed ? (
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green" />
              ) : (
                <XCircle size={14} className="mt-0.5 shrink-0 text-red" />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-medium ${t.passed ? 'text-green' : 'text-red'}`}>{t.name}</p>
                {t.error && (
                  <p className="mt-0.5 font-mono text-xs text-red/70 break-words">{t.error}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Console logs — always visible when there is a result */}
      {result && (
        <div className="border-t border-border">
          <div className="flex items-center gap-1.5 border-b border-border/50 bg-elevated px-3 py-1.5">
            <Terminal size={11} className="text-muted" />
            <span className="text-xs text-muted">Consola</span>
            {result.logs.length === 0 && !result.error && (
              <span className="ml-auto text-xs text-muted italic">sin salida</span>
            )}
          </div>
          <div className="min-h-[2.5rem] p-3 font-mono text-xs bg-base">
            {result.logs.map((l, i) => (
              <div key={i} className={`leading-5 ${l.startsWith('[error]') ? 'text-red' : l.startsWith('[warn]') ? 'text-yellow' : 'text-text/70'}`}>
                {l}
              </div>
            ))}
            {result.logs.length === 0 && !result.error && (
              <span className="text-muted/50 italic">El programa no produjo salida.</span>
            )}
          </div>
        </div>
      )}

      {/* All passed celebration */}
      {allPassed && (
        <div className="border-t border-green/20 bg-green/5 px-4 py-3 text-center text-sm text-green">
          🎉 ¡Excelente trabajo! Puedes continuar con la siguiente lección.
        </div>
      )}
    </div>
  )
}
