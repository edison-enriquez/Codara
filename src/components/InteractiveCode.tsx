import { useState, useRef } from 'react'
import { Play, RotateCcw, Copy, Check, Terminal } from 'lucide-react'
import { useCodeRunner } from '../hooks/useCodeRunner'
import { highlightCode } from '../utils/highlight'
import CodeEditor from './CodeEditor'

const LANG_RUNNABLE = new Set(['javascript', 'js', 'typescript', 'ts', 'python', 'py', 'c'])
const LANG_LABEL: Record<string, string> = {
  javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript',
  python: 'Python', py: 'Python',
  c: 'C', cpp: 'C++', java: 'Java',
  bash: 'Shell', sh: 'Shell',
}
const LANG_COLOR: Record<string, string> = {
  javascript: 'text-yellow', js: 'text-yellow',
  typescript: 'text-blue', ts: 'text-blue',
  python: 'text-blue', py: 'text-blue',
  c: 'text-orange', cpp: 'text-orange',
}

interface Props {
  lang: string
  code: string
  executable?: boolean
}

export default function InteractiveCode({ lang, code, executable = false }: Props) {
  const normalizedLang = lang.toLowerCase()
  const canRun = executable && LANG_RUNNABLE.has(normalizedLang)
  const runLang = normalizedLang === 'py' ? 'python' : normalizedLang === 'ts' ? 'javascript' : normalizedLang
  const isC = normalizedLang === 'c'
  const { result, state, run, reset } = useCodeRunner(runLang)
  const [copied, setCopied] = useState(false)
  const [editableCode, setEditableCode] = useState(code)
  const codeRef = useRef<HTMLPreElement>(null)

  const isDirty = editableCode !== code
  const handleRun = () => run(editableCode)
  const handleReset = () => { setEditableCode(code); reset() }
  const handleCopy = async () => {
    await navigator.clipboard.writeText(canRun ? editableCode : code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const editorHeight = `${Math.max(80, editableCode.split('\n').length * 21 + 24)}px`

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border bg-base shadow-md">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
        <span className={`text-xs font-mono font-medium ${LANG_COLOR[normalizedLang] ?? 'text-muted'}`}>
          {LANG_LABEL[normalizedLang] ?? lang}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:bg-elevated hover:text-text transition-colors"
          >
            {copied ? <Check size={12} className="text-green" /> : <Copy size={12} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          {canRun && (
            <>
              {(state !== 'idle' || isDirty) && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:bg-elevated hover:text-text transition-colors"
                  title="Restaurar código original"
                >
                  <RotateCcw size={12} />
                </button>
              )}
              <button
                onClick={handleRun}
                disabled={state === 'running'}
                className="flex items-center gap-1 rounded bg-blue/15 px-3 py-1 text-xs font-medium text-blue hover:bg-blue/25 disabled:opacity-50 transition-colors"
              >
                {state === 'running' ? (
                  <>
                    <span className="h-2 w-2 animate-spin rounded-full border border-blue border-t-transparent" />
                    {isC ? 'Compilando…' : 'Ejecutando…'}
                  </>
                ) : (
                  <>
                    <Play size={11} fill="currentColor" />
                    Ejecutar
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Code — editable Monaco cuando es ejecutable, highlighted estático si no */}
      {canRun ? (
        <CodeEditor
          value={editableCode}
          onChange={setEditableCode}
          language={normalizedLang}
          height={editorHeight}
        />
      ) : (
        <pre
          ref={codeRef}
          className="hljs overflow-x-auto p-4 text-sm font-mono leading-relaxed bg-base"
        >
          <code
            // highlight.js escapa el HTML internamente — seguro para contenido del repo
            dangerouslySetInnerHTML={{ __html: highlightCode(code, normalizedLang) }}
          />
        </pre>
      )}

      {/* Output */}
      {result && (
        <div className="border-t border-border">
          <div className="flex items-center gap-2 border-b border-border/50 bg-elevated px-3 py-1.5">
            <Terminal size={12} className="text-muted" />
            <span className="text-xs text-muted">Salida</span>
            {result.error && (
              <span className="ml-auto text-xs text-red">Error</span>
            )}
          </div>
          <div className="bg-base p-3 font-mono text-xs">
            {result.logs.map((line, i) => (
              <div key={i} className={`leading-5 ${line.startsWith('[error]') ? 'text-red' : line.startsWith('[warn]') ? 'text-yellow' : 'text-green'}`}>
                {line}
              </div>
            ))}
            {result.error && (
              <div className="text-red leading-5">⚠ {result.error}</div>
            )}
            {result.logs.length === 0 && !result.error && (
              <div className="text-muted italic">Sin salida</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
