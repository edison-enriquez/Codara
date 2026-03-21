import { useState, useRef, useCallback } from 'react'
import { Bot, Sparkles, AlertTriangle, ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { useAgent } from '../context/AgentContext'
import { streamGroq, type Message } from '../utils/groqClient'
import type { CodeCheck, TestResult } from '../types'

interface Props {
  code: string
  language: string
  labTitle: string
  checks: CodeCheck[]
  error?: string | null
  testResults?: TestResult[]
}

function evaluateCheck(check: CodeCheck, code: string): boolean {
  try {
    const type = check.type ?? 'regex'
    if (type === 'contains') return code.includes(check.pattern)
    if (type === 'not-contains') return !code.includes(check.pattern)
    const flags = check.pattern === check.pattern.toLowerCase() ? 'im' : 'm'
    return new RegExp(check.pattern, flags).test(code)
  } catch {
    return false
  }
}

export default function AgentPanel({ code, language, labTitle, checks, error, testResults }: Props) {
  const { config, isConfigured, openSettings } = useAgent()
  const [open, setOpen] = useState(false)
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<'checks' | 'error' | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stream = useCallback(async (messages: Message[], action: 'checks' | 'error') => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setResponse('')
    setActiveAction(action)
    setLoading(true)
    setOpen(true)
    try {
      await streamGroq(config, messages, (text) => setResponse((prev) => prev + text), abortRef.current.signal)
    } catch (e: any) {
      if (e.name !== 'AbortError') setResponse(`⚠ Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [config])

  const handleVerifyChecks = () => {
    const checkList = checks
      .map((c) => `- [${evaluateCheck(c, code) ? '✓' : '✗'}] ${c.description}`)
      .join('\n')

    stream([
      {
        role: 'system',
        content: `Eres un tutor amigable de programación. El estudiante aprende ${language}. Responde siempre en español, de forma concisa y alentadora. No des el código completo, guía con pistas específicas.`,
      },
      {
        role: 'user',
        content: `Lab: "${labTitle}"\n\nRequisitos evaluados:\n${checkList}\n\nCódigo del estudiante:\n\`\`\`${language}\n${code}\n\`\`\`\n\nPara cada requisito NO cumplido, explica brevemente por qué falla y cómo corregirlo. Para los cumplidos, un breve elogio. Sé conciso y usa formato Markdown.`,
      },
    ], 'checks')
  }

  const handleExplainError = () => {
    stream([
      {
        role: 'system',
        content: `Eres un tutor de programación para principiantes. Responde en español de forma simple y alentadora. Evita términos técnicos sin explicar.`,
      },
      {
        role: 'user',
        content: `Mi código produjo este error:\n\n${error}\n\nCódigo:\n\`\`\`${language}\n${code}\n\`\`\`\n\nExplica qué significa el error y cómo solucionarlo. Máximo 3 párrafos cortos.`,
      },
    ], 'error')
  }

  const passedCount = checks.filter((c) => evaluateCheck(c, code)).length
  const hasError = !!error
  const hasResponse = !!response

  return (
    <div className="rounded-lg border border-purple/20 bg-purple/5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-purple" />
          <span className="text-sm font-medium text-purple">Agente IA</span>
          {checks.length > 0 && (
            <span className="rounded-full bg-purple/15 px-2 py-0.5 text-xs text-purple">
              {passedCount}/{checks.length} requisitos
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!isConfigured ? (
            <button
              onClick={openSettings}
              className="flex items-center gap-1.5 rounded border border-purple/30 px-2 py-1 text-xs text-purple hover:bg-purple/10 transition-colors"
            >
              <Settings size={11} />
              Configurar API Key
            </button>
          ) : (
            <>
              {checks.length > 0 && (
                <button
                  onClick={handleVerifyChecks}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded bg-purple/15 px-3 py-1 text-xs font-medium text-purple hover:bg-purple/25 disabled:opacity-50 transition-colors"
                >
                  <Sparkles size={11} />
                  {loading && activeAction === 'checks' ? 'Analizando…' : 'Verificar requisitos'}
                </button>
              )}
              {hasError && (
                <button
                  onClick={handleExplainError}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded bg-red/10 px-3 py-1 text-xs font-medium text-red hover:bg-red/20 disabled:opacity-50 transition-colors"
                >
                  <AlertTriangle size={11} />
                  {loading && activeAction === 'error' ? 'Analizando…' : 'Explicar error'}
                </button>
              )}
            </>
          )}

          {hasResponse && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="p-1 text-muted hover:text-text transition-colors"
            >
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Streaming response */}
      {open && (response || loading) && (
        <div className="border-t border-purple/10 px-4 pb-4 pt-3">
          {loading && !response && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="h-2 w-2 animate-spin rounded-full border border-purple border-t-transparent" />
              Pensando…
            </div>
          )}
          <div className="whitespace-pre-wrap text-sm text-text/85 leading-relaxed">
            {response}
            {loading && (
              <span className="ml-0.5 inline-block h-3 w-0.5 bg-purple animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
