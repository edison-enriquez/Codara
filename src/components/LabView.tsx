import { useState } from 'react'
import { Play, RotateCcw, CheckCircle2, Server, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import CodeEditor from './CodeEditor'
import HintPanel from './HintPanel'
import TestPanel from './TestPanel'
import MarkdownRenderer from './MarkdownRenderer'
import AgentPanel from './AgentPanel'
import { useCodeRunner } from '../hooks/useCodeRunner'
import { useAgent } from '../context/AgentContext'
import { markComplete } from '../utils/courseLoader'
import type { ParsedLesson, LessonMeta } from '../types'

interface Props {
  lesson: ParsedLesson
  courseId: string
  prevLesson?: LessonMeta | null
  nextLesson?: LessonMeta | null
}

export default function LabView({ lesson, courseId, prevLesson, nextLesson }: Props) {
  const { meta, displayContent, starterCode = '', testCode = '', ioTests = [] } = lesson
  const lang = meta.language === 'python' ? 'python' : meta.language === 'c' ? 'c' : 'javascript'

  const [code, setCode] = useState(starterCode)
  const { result, state, runTests, runIOTests, reset } = useCodeRunner(lang)

  const hasIOTests = ioTests.length > 0
  const hasTests   = hasIOTests || !!testCode

  const handleRun = () => {
    if (hasIOTests) runIOTests(code, ioTests)
    else runTests(code, testCode)
  }
  const handleReset = () => {
    setCode(starterCode)
    reset()
  }

  const allPassed =
    !!result?.testResults?.length && result.testResults.every((t) => t.passed)

  if (allPassed) markComplete(courseId, meta.id)

  const checks = meta.checks ?? []
  const isCLang = lang === 'c'
  const { isConfigured } = useAgent()

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

        {/* Progressive hints — solo si el agente NO está configurado */}
        {!isConfigured && meta.hints && meta.hints.length > 0 && (
          <div className={`p-4 ${checks.length ? '' : 'border-t border-border'}`}>
            <HintPanel hints={meta.hints} courseId={courseId} lessonId={meta.id} />
          </div>
        )}

        {/* Agent panel — reemplaza hints cuando el agente está activo */}
        {(checks.length > 0 || result?.error || isConfigured) && (
          <div className="border-t border-border p-4">
            <AgentPanel
              code={code}
              language={lang}
              labTitle={meta.title}
              checks={checks}
              error={result?.error}
              testResults={result?.testResults}
            />
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
              disabled={state === 'running' || !hasTests}
              className="flex items-center gap-2 rounded bg-blue px-4 py-1.5 text-xs font-medium text-base hover:bg-blue/80 disabled:opacity-50 transition-colors"
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

        {/* Nav inferior — siempre visible */}
        <div className="shrink-0 flex items-center justify-between border-t border-border bg-surface px-4 py-2">
          {prevLesson ? (
            <Link
              to={`/course/${courseId}/${prevLesson.id}`}
              className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-muted hover:border-green/40 hover:text-text uppercase tracking-wider transition-colors"
            >
              <ChevronLeft size={12} />
              Anterior
            </Link>
          ) : <div />}

          {nextLesson ? (
            <Link
              to={`/course/${courseId}/${nextLesson.id}`}
              className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                allPassed
                  ? 'border-green/50 bg-green/10 text-green hover:bg-green/20 animate-fade-in'
                  : 'border-border text-muted hover:border-green/40 hover:text-text'
              }`}
            >
              {allPassed ? '¡Siguiente!' : 'Siguiente'}
              <ChevronRight size={12} />
            </Link>
          ) : allPassed ? (
            <Link
              to="/"
              className="flex items-center gap-1.5 border border-green/50 bg-green/10 px-3 py-1.5 text-xs font-medium text-green hover:bg-green/20 uppercase tracking-wider transition-colors animate-fade-in"
            >
              ¡Curso completado! <ChevronRight size={12} />
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  )
}
