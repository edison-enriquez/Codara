import { useMemo, useRef, useState } from 'react'
import { Play, Loader2, RotateCcw, ChevronsRight } from 'lucide-react'
import { segmentMarkdown } from '../utils/courseLoader'
import { runPython, resetPythonKernel } from '../utils/codeRunner'
import CodeEditor from './CodeEditor'
import MarkdownRenderer from './MarkdownRenderer'
import { highlightCode } from '../utils/highlight'
import type { ParsedLesson } from '../types'

interface CellOut { logs: string[]; error: string | null; count: number }

const isPy = (lang: string) => {
  const l = lang.toLowerCase()
  return l === 'python' || l === 'py'
}

export default function NotebookView({ lesson }: { lesson: ParsedLesson }) {
  const segments = useMemo(() => segmentMarkdown(lesson.content), [lesson.content])

  // Índices de celdas de código Python (ejecutables)
  const codeCells = useMemo(
    () => segments
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => (s.type === 'exec' || s.type === 'code') && isPy(s.lang)),
    [segments]
  )

  const initialSources = useMemo(() => {
    const m: Record<number, string> = {}
    for (const { s, i } of codeCells) m[i] = (s as { content: string }).content
    return m
  }, [codeCells])

  const [sources, setSources] = useState<Record<number, string>>(initialSources)
  const [outputs, setOutputs] = useState<Record<number, CellOut>>({})
  const [running, setRunning] = useState<number | null>(null)
  const [runningAll, setRunningAll] = useState(false)
  const countRef = useRef(0)

  const runCell = async (idx: number): Promise<void> => {
    setRunning(idx)
    const res = await runPython(sources[idx] ?? initialSources[idx] ?? '')
    countRef.current += 1
    setOutputs((o) => ({ ...o, [idx]: { logs: res.logs, error: res.error, count: countRef.current } }))
    setRunning(null)
  }

  const runAll = async () => {
    setRunningAll(true)
    for (const { i } of codeCells) {
      // Ejecuta secuencialmente para respetar el estado compartido del kernel
      // (no usar runCell porque setRunning es asíncrono)
      setRunning(i)
      const res = await runPython(sources[i] ?? initialSources[i] ?? '')
      countRef.current += 1
      setOutputs((o) => ({ ...o, [i]: { logs: res.logs, error: res.error, count: countRef.current } }))
    }
    setRunning(null)
    setRunningAll(false)
  }

  const resetKernel = async () => {
    await resetPythonKernel()
    setOutputs({})
    countRef.current = 0
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-16 pt-4">
      {/* Toolbar del notebook */}
      <div className="sticky top-0 z-10 -mx-6 mb-5 flex items-center gap-2 border-b border-border bg-base/95 px-6 py-2 backdrop-blur">
        <span className="mr-auto flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-blue" />
          Notebook · Python (Pyodide)
        </span>
        <button
          onClick={runAll}
          disabled={runningAll || running !== null}
          className="flex items-center gap-1.5 rounded border border-blue/40 bg-blue/10 px-3 py-1 text-xs font-medium text-blue hover:bg-blue/20 disabled:opacity-50 transition-colors"
        >
          {runningAll ? <Loader2 size={12} className="animate-spin" /> : <ChevronsRight size={12} />}
          Ejecutar todo
        </button>
        <button
          onClick={resetKernel}
          disabled={runningAll || running !== null}
          className="flex items-center gap-1.5 rounded border border-border px-3 py-1 text-xs text-muted hover:text-text disabled:opacity-50 transition-colors"
          title="Limpiar variables del kernel"
        >
          <RotateCcw size={12} />
          Reiniciar kernel
        </button>
      </div>

      {/* Celdas */}
      <div className="space-y-4">
        {segments.map((seg, i) => {
          if (seg.type === 'prose') {
            return <MarkdownRenderer key={i} content={seg.content} />
          }
          if ((seg.type === 'exec' || seg.type === 'code') && isPy(seg.lang)) {
            return (
              <CodeCell
                key={i}
                source={sources[i] ?? ''}
                onChange={(v) => setSources((s) => ({ ...s, [i]: v }))}
                onRun={() => runCell(i)}
                running={running === i}
                disabled={running !== null || runningAll}
                output={outputs[i]}
              />
            )
          }
          // Código de otro lenguaje → estático
          if (seg.type === 'code' || seg.type === 'exec') {
            return (
              <pre key={i} className="hljs my-2 overflow-x-auto rounded-lg border border-border p-4 text-sm font-mono bg-base">
                <code dangerouslySetInnerHTML={{ __html: highlightCode(seg.content, seg.lang) }} />
              </pre>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}

function CodeCell({
  source, onChange, onRun, running, disabled, output,
}: {
  source: string
  onChange: (v: string) => void
  onRun: () => void
  running: boolean
  disabled: boolean
  output?: CellOut
}) {
  const height = `${Math.max(60, source.split('\n').length * 21 + 16)}px`

  return (
    <div className="flex gap-2">
      {/* Marcador In[n] + botón run */}
      <div className="flex w-12 shrink-0 flex-col items-end gap-1 pt-1">
        <button
          onClick={onRun}
          disabled={disabled}
          title="Ejecutar celda"
          className="flex h-7 w-7 items-center justify-center rounded border border-blue/40 bg-blue/10 text-blue hover:bg-blue/20 disabled:opacity-40 transition-colors"
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
        </button>
        <span className="font-mono text-[10px] text-muted/60">
          In[{output?.count ?? ' '}]
        </span>
      </div>

      {/* Editor + salida */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-base">
        <CodeEditor value={source} onChange={onChange} language="python" height={height} />
        {output && (
          <div className="border-t border-border bg-surface/40 px-3 py-2 font-mono text-xs">
            {output.logs.map((line, k) => (
              <div key={k} className={`leading-5 ${line.startsWith('[stderr]') ? 'text-red' : 'text-text/80'}`}>{line}</div>
            ))}
            {output.error && <div className="leading-5 text-red">⚠ {output.error}</div>}
            {output.logs.length === 0 && !output.error && <div className="italic text-muted/60">Sin salida</div>}
          </div>
        )}
      </div>
    </div>
  )
}
