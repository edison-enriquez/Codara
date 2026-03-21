import { useState, useRef, useCallback, useEffect } from 'react'
import { Bot, Sparkles, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle, Circle, Lock, Zap } from 'lucide-react'
import { useAgent } from '../context/AgentContext'
import { streamGroq, type Message } from '../utils/groqClient'
import type { CodeCheck, TestResult } from '../types'

// ─── Helpers de evaluación (igual que LiveAnalysis) ───────────────────────────

function stripCommentsAndStrings(code: string): string {
  let result = ''
  let i = 0
  while (i < code.length) {
    if (code[i] === '/' && code[i + 1] === '*') {
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2; result += ' '; continue
    }
    if (code[i] === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++
      result += ' '; continue
    }
    if (code[i] === '"') {
      i++
      while (i < code.length && code[i] !== '"') { if (code[i] === '\\') i++; i++ }
      i++; result += '""'; continue
    }
    if (code[i] === "'") {
      i++
      while (i < code.length && code[i] !== "'") { if (code[i] === '\\') i++; i++ }
      i++; result += "''"; continue
    }
    result += code[i]; i++
  }
  return result
}

interface Props {
  code: string
  language: string
  labTitle: string
  checks: CodeCheck[]
  error?: string | null
  testResults?: TestResult[]
}

interface AgentCheckResult {
  id: string
  description: string
  passed: boolean
  feedback: string
}

function evaluateCheck(check: CodeCheck, code: string): boolean {
  try {
    const clean = stripCommentsAndStrings(code)
    const type = check.type ?? 'regex'
    if (type === 'contains') return clean.includes(check.pattern)
    if (type === 'not-contains') return !clean.includes(check.pattern)
    const flags = check.pattern === check.pattern.toLowerCase() ? 'im' : 'm'
    return new RegExp(check.pattern, flags).test(clean)
  } catch {
    return false
  }
}

function firstFailingIdx(statuses: { check: CodeCheck; passed: boolean }[]): number {
  return statuses.findIndex((s) => !s.passed && s.check.required !== false)
}

/** Extrae el primer bloque JSON válido del texto del modelo */
function parseAgentChecks(raw: string, checks: CodeCheck[]): AgentCheckResult[] | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    const items: AgentCheckResult[] = (parsed.checks ?? []).map((item: any) => {
      const original = checks.find((c) => c.id === item.id)
      return {
        id: item.id ?? '',
        description: original?.description ?? item.description ?? item.id,
        passed: !!item.passed,
        feedback: item.feedback ?? '',
      }
    })
    return items.length ? items : null
  } catch {
    return null
  }
}

export default function AgentPanel({ code, language, labTitle, checks, error, testResults }: Props) {
  const { config, isConfigured, openSettings } = useAgent()

  // ── Modo regex (tiempo real, sin IA) ─────────────────────────────────────
  const [liveStatuses, setLiveStatuses] = useState(() =>
    checks.map((c) => ({ check: c, passed: false }))
  )
  const [expanded, setExpanded] = useState(true)
  const [showHintFor, setShowHintFor] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setLiveStatuses(checks.map((c) => ({ check: c, passed: evaluateCheck(c, code) })))
    }, 250)
    return () => clearTimeout(t)
  }, [code, checks])

  // ── Modo IA ──────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false)
  const [errorResponse, setErrorResponse] = useState('')
  const [checkResults, setCheckResults] = useState<AgentCheckResult[] | null>(null)
  const [checkSummary, setCheckSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<'checks' | 'error' | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Para "checks": acumula todo y parsea JSON al final
  const handleVerifyChecks = useCallback(async () => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setCheckResults(null)
    setCheckSummary('')
    setActiveAction('checks')
    setLoading(true)
    setOpen(true)

    const checkList = checks
      .map((c) => `{ "id": "${c.id}", "description": "${c.description}", "local_passed": ${evaluateCheck(c, code)} }`)
      .join(',\n')

    const messages: Message[] = [
      {
        role: 'system',
        content: `Eres un tutor de programación. El estudiante aprende ${language}. Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin bloques de código markdown.`,
      },
      {
        role: 'user',
        content: `Lab: "${labTitle}"

Analiza si el código del estudiante cumple cada requisito. Responde SOLO con JSON, sin ningún texto fuera del JSON.

Requisitos a evaluar:
[
${checkList}
]

Código del estudiante:
\`\`\`${language}
${code}
\`\`\`

Formato de respuesta (JSON puro, sin markdown):
{
  "checks": [
    { "id": "id-del-requisito", "passed": true, "feedback": "frase corta en español para el estudiante" }
  ],
  "summary": "mensaje general alentador en español (1 oración)"
}`,
      },
    ]

    let accumulated = ''
    try {
      await streamGroq(config, messages, (text) => { accumulated += text }, abortRef.current.signal)
      const parsed = parseAgentChecks(accumulated, checks)
      if (parsed) {
        setCheckResults(parsed)
        try {
          const jsonMatch = accumulated.match(/\{[\s\S]*\}/)
          if (jsonMatch) setCheckSummary(JSON.parse(jsonMatch[0]).summary ?? '')
        } catch {}
      } else {
        // fallback: mostrar texto crudo si no se pudo parsear
        setCheckSummary(accumulated)
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setCheckSummary(`⚠ Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [config, code, language, labTitle, checks])

  // Para "error": streaming de texto plano
  const handleExplainError = useCallback(async () => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setErrorResponse('')
    setActiveAction('error')
    setLoading(true)
    setOpen(true)
    const messages: Message[] = [
      {
        role: 'system',
        content: `Eres un tutor de programación para principiantes. Responde en español de forma simple y alentadora. Evita términos técnicos sin explicar.`,
      },
      {
        role: 'user',
        content: `Mi código produjo este error:\n\n${error}\n\nCódigo:\n\`\`\`${language}\n${code}\n\`\`\`\n\nExplica qué significa el error y cómo solucionarlo. Máximo 3 párrafos cortos.`,
      },
    ]
    try {
      await streamGroq(config, messages, (text) => setErrorResponse((prev) => prev + text), abortRef.current.signal)
    } catch (e: any) {
      if (e.name !== 'AbortError') setErrorResponse(`⚠ Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [config, code, language, error])

  const passedRequired = liveStatuses.filter((s) => s.check.required !== false && s.passed).length
  const totalRequired = liveStatuses.filter((s) => s.check.required !== false).length
  const allLivePassed = totalRequired > 0 && passedRequired === totalRequired
  const failingIdx = firstFailingIdx(liveStatuses)
  const hasError = !!error
  const hasAiContent = checkResults !== null || !!errorResponse || !!checkSummary

  if (!checks.length && !hasError) return null

  // ── Sin agente configurado: panel de requisitos con regex en tiempo real ──
  if (!isConfigured) {
    if (!checks.length) return null
    return (
      <div className={`overflow-hidden rounded-lg border transition-colors ${
        allLivePassed ? 'border-green/30 bg-green/5' : 'border-blue/20 bg-blue/5'
      }`}>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <Zap size={14} className={allLivePassed ? 'text-green' : 'text-blue'} fill={allLivePassed ? 'currentColor' : 'none'} />
            <span className={`text-sm font-semibold ${allLivePassed ? 'text-green' : 'text-blue'}`}>
              {allLivePassed ? '¡Todo correcto!' : `Requisitos (${passedRequired}/${totalRequired})`}
            </span>
          </div>
          {expanded ? <ChevronUp size={13} className="text-muted" /> : <ChevronDown size={13} className="text-muted" />}
        </button>

        {expanded && (
          <div className="border-t border-blue/10 px-4 pb-4 pt-3 space-y-1.5">
            {liveStatuses.map((s, idx) => {
              const isNext = idx === failingIdx
              const isBlocked = !s.passed && idx > failingIdx && s.check.required !== false
              const isOptional = s.check.required === false
              return (
                <div key={s.check.id} className={`flex items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors ${
                  s.passed ? 'bg-green/10' : isNext ? 'bg-blue/10 ring-1 ring-blue/20' : 'opacity-60'
                }`}>
                  <div className="mt-0.5 shrink-0">
                    {s.passed ? <CheckCircle2 size={14} className="text-green" />
                      : isBlocked ? <Lock size={13} className="text-muted" />
                      : <Circle size={14} className={isNext ? 'text-blue' : 'text-muted'} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium leading-4 ${
                      s.passed ? 'text-green' : isNext ? 'text-blue' : 'text-muted'
                    }`}>
                      {s.check.description}
                      {isOptional && <span className="ml-1.5 rounded bg-purple/20 px-1 py-0.5 text-[10px] text-purple">extra</span>}
                    </p>
                    {isNext && s.check.hint && (
                      <div className="mt-1.5">
                        {showHintFor === s.check.id ? (
                          <p className="text-xs leading-4 text-blue/80 italic">💡 {s.check.hint}</p>
                        ) : (
                          <button onClick={() => setShowHintFor(s.check.id)} className="text-[11px] text-blue/60 hover:text-blue underline underline-offset-2 transition-colors">
                            Ver pista
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {allLivePassed && (
              <div className="mt-3 rounded-md bg-green/15 px-3 py-2 text-center text-xs font-medium text-green">
                🎉 ¡Excelente! Pulsa <strong>Ejecutar pruebas</strong> para verificar tu solución.
              </div>
            )}
            {!allLivePassed && totalRequired > 1 && (
              <div className="mt-2">
                <div className="h-1 w-full overflow-hidden rounded-full bg-elevated">
                  <div className="h-full rounded-full bg-blue transition-all duration-500" style={{ width: `${(passedRequired / totalRequired) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Con agente configurado: panel IA ──────────────────────────────────────
  return (
    <div className="rounded-lg border border-purple/20 bg-purple/5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-purple" />
          <span className="text-sm font-medium text-purple">Agente IA</span>
          {checks.length > 0 && (
            <span className="rounded-full bg-purple/15 px-2 py-0.5 text-xs text-purple">
              {passedRequired}/{totalRequired} requisitos
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
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
          {hasAiContent && (
            <button onClick={() => setOpen((o) => !o)} className="p-1 text-muted hover:text-text transition-colors">
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {open && (
        <div className="border-t border-purple/10 pb-3 pt-2">
          {/* Spinner mientras analiza */}
          {loading && activeAction === 'checks' && !checkResults && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted">
              <span className="h-2 w-2 animate-spin rounded-full border border-purple border-t-transparent" />
              Analizando requisitos…
            </div>
          )}

          {/* Check-list con mismo estilo que LiveAnalysis */}
          {checkResults && (
            <div className="space-y-1 px-3">
              {checkResults.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${
                    item.passed
                      ? 'border-green/20 bg-green/5'
                      : 'border-red/20 bg-red/5'
                  }`}
                >
                  {item.passed ? (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green" />
                  ) : (
                    <XCircle size={14} className="mt-0.5 shrink-0 text-red" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-xs font-medium leading-5 ${item.passed ? 'text-green' : 'text-red'}`}>
                      {item.description}
                    </p>
                    {item.feedback && (
                      <p className="mt-0.5 text-xs text-muted leading-5">{item.feedback}</p>
                    )}
                  </div>
                </div>
              ))}
              {checkSummary && (
                <p className="mt-2 px-1 text-xs text-muted italic">{checkSummary}</p>
              )}
            </div>
          )}

          {/* Fallback si no se pudo parsear JSON */}
          {!checkResults && checkSummary && activeAction === 'checks' && (
            <p className="px-4 text-xs text-muted">{checkSummary}</p>
          )}

          {/* Error explanation — streaming texto */}
          {activeAction === 'error' && (errorResponse || (loading)) && (
            <div className="px-4">
              {loading && !errorResponse && (
                <div className="flex items-center gap-2 py-2 text-xs text-muted">
                  <span className="h-2 w-2 animate-spin rounded-full border border-purple border-t-transparent" />
                  Pensando…
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm text-text/85 leading-relaxed">
                {errorResponse}
                {loading && (
                  <span className="ml-0.5 inline-block h-3 w-0.5 bg-purple animate-pulse" />
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
