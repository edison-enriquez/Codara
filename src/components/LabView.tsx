import { useState } from 'react'
import { Play, RotateCcw, CheckCircle2, Server } from 'lucide-react'
import CodeEditor from './CodeEditor'
import HintPanel from './HintPanel'
import TestPanel from './TestPanel'
import MarkdownRenderer from './MarkdownRenderer'
import LiveAnalysis from './LiveAnalysis'
import { useCodeRunner } from '../hooks/useCodeRunner'
import { markComplete } from '../utils/courseLoader'
import type { ParsedLesson } from '../types'

interface Props {
  lesson: ParsedLesson
  courseId: string
}

export default function LabView({ lesson, courseId }: Props) {
  const { meta, displayContent, starterCode = '', testCode = '' } = lesson
  const lang = meta.language === 'python' ? 'python' : meta.language === 'c' ? 'c' : 'javascript'

  const [code, setCode] = useState(starterCode)
  const { result, state, runTests, reset } = useCodeRunner(lang)

  const handleRun = () => runTests(code, testCode)
  const handleReset = () => {
    setCode(starterCode)
    reset()
  }

  const allPassed =
    !!result?.testResults?.length && result.testResults.every((t) => t.passed)

  if (allPassed) markComplete(courseId, meta.id)

  const checks = meta.checks ?? []
  const isCLang = lang === 'c'

  return (
    <div className="flex h-full flex-col overflow-hidden lg:flex-row">
      {/* ── Left: description ──────────────────────────────────────────── */}
      <div className="flex w-full flex-col overflow-y-auto border-b border-border lg:w-2/5 lg:border-b-0 lg:border-r">
        <div className="flex-1 p-5">
          <div className="mb-1 flex items-center gap-2 flex-wrap">
            <span className="rounded bg-blue/15 px-2 py-0.5 text-xs font-medium text-blue">Lab</span>
            <span className="text-xs text-muted capitalize">{lang}</span>
            {isCLang && (
              <span className="flex items-center gap-1 rounded bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange border border-orange/20">
                <Server size={10} />
                Sandbox
              </span>
            )}
          </div>
          <h1 className="mb-4 text-xl font-bold text-text">{meta.title}</h1>

          <MarkdownRenderer content={displayContent} />
        </div>

        {/* Live analysis (CryptoZombies-style) */}
        {checks.length > 0 && (
          <div className="border-t border-border p-4">
            <LiveAnalysis code={code} checks={checks} />
          </div>
        )}

        {/* Progressive hints */}
        {meta.hints && meta.hints.length > 0 && (
          <div className={`p-4 ${checks.length ? '' : 'border-t border-border'}`}>
            <HintPanel hints={meta.hints} courseId={courseId} lessonId={meta.id} />
          </div>
        )}
      </div>

      {/* ── Right: editor + tests ──────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Editor toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted capitalize">{lang}</span>
            {isCLang && (
              <span className="text-xs text-muted/60">· compilado en servidor</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs text-muted hover:bg-elevated hover:text-text transition-colors"
            >
              <RotateCcw size={12} />
              Reiniciar
            </button>
            <button
              onClick={handleRun}
              disabled={state === 'running' || !testCode}
              className="flex items-center gap-2 rounded bg-blue px-4 py-1.5 text-xs font-medium text-white hover:bg-blue/80 disabled:opacity-50 transition-colors"
            >
              {state === 'running' ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  {isCLang ? 'Compilando…' : 'Ejecutando…'}
                </>
              ) : (
                <>
                  <Play size={11} fill="currentColor" />
                  Ejecutar pruebas
                </>
              )}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="shrink-0" style={{ height: '50%', minHeight: 200 }}>
          <CodeEditor value={code} onChange={setCode} language={lang} height="100%" />
        </div>

        {/* Test Results */}
        <div className="min-h-0 flex-1 overflow-hidden border-t border-border bg-base">
          <TestPanel result={result} state={state} />
        </div>
      </div>
    </div>
  )
}
