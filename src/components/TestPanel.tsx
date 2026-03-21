import { useState } from 'react'
import { CheckCircle2, XCircle, Terminal, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { RunResult, TestResult } from '../types'
import type { RunState } from '../hooks/useCodeRunner'

interface Props {
  result: RunResult | null
  state: RunState
}

// Extrae un preview corto de la entrada para mostrar en la fila colapsada
function inputPreview(input: string | undefined): string {
  if (!input) return ''
  const oneLine = input.replace(/\n/g, ' ').trim()
  return oneLine.length > 24 ? oneLine.slice(0, 24) + '…' : oneLine
}

function TestItem({ t }: { t: TestResult }) {
  const [open, setOpen] = useState(false)
  const hasDetail = t.input !== undefined || t.expected !== undefined || t.actual !== undefined

  return (
    <div className={`overflow-hidden rounded-lg border transition-colors ${
      t.passed ? 'border-green/20 bg-green/5' : 'border-red/20 bg-red/5'
    }`}>
      {/* Row header */}
      <button
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => hasDetail && setOpen((o) => !o)}
        disabled={!hasDetail}
      >
        {t.passed
          ? <CheckCircle2 size={14} className="shrink-0 text-green" />
          : <XCircle      size={14} className="shrink-0 text-red" />}

        <span className={`flex-1 truncate text-xs font-medium ${t.passed ? 'text-green' : 'text-red'}`}>
          {t.name}
        </span>

        {t.input !== undefined && (
          <span className="font-mono text-[10px] text-muted/60 truncate max-w-[120px]">
            → {inputPreview(t.input)}
          </span>
        )}

        <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${t.passed ? 'text-green' : 'text-red'}`}>
          {t.passed ? 'PASS' : 'FAIL'}
        </span>

        {hasDetail && (
          <span className="text-muted/50 shrink-0">
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        )}
      </button>

      {/* Expanded detail: 3-column grid */}
      {open && hasDetail && (
        <div className="border-t border-white/5 px-3 pb-3 pt-2.5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-[10px] font-mono">
            {t.input !== undefined && (
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-wider text-muted/50">Entrada</div>
                <pre className="rounded-lg bg-black/30 p-2 text-text/70 whitespace-pre-wrap break-all leading-4">{t.input}</pre>
              </div>
            )}
            {t.expected !== undefined && (
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-wider text-muted/50">Esperado</div>
                <pre className="rounded-lg bg-black/30 p-2 text-text/70 whitespace-pre-wrap break-all leading-4">{t.expected}</pre>
              </div>
            )}
            {t.actual !== undefined && (
              <div>
                <div className={`mb-1 text-[9px] uppercase tracking-wider ${t.passed ? 'text-green/60' : 'text-red/60'}`}>Obtenido</div>
                <pre className={`rounded-lg p-2 whitespace-pre-wrap break-all leading-4 ${
                  t.passed ? 'bg-green/10 text-green/80' : 'bg-red/10 text-red/80'
                }`}>{t.actual || '(sin salida)'}</pre>
              </div>
            )}
          </div>
          {t.error && (
            <p className="mt-2 font-sans text-xs text-red/70">{t.error}</p>
          )}
        </div>
      )}

      {/* Error legacy (sin campos ricos) */}
      {!hasDetail && t.error && (
        <div className="border-t border-white/5 px-3 py-2 font-mono text-xs text-red/70">{t.error}</div>
      )}
    </div>
  )
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
      <div className={`flex items-center justify-between border-b px-4 py-2 text-sm font-medium ${
        allPassed ? 'border-green/20 bg-green/10 text-green' : 'border-border bg-surface text-text'
      }`}>
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
        {tests.map((t, i) => <TestItem key={i} t={t} />)}
      </div>

      {/* Console logs */}
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
            {result.logs.length === 0 && !result.error && !tests.length && (
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
