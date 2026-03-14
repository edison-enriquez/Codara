import { useEffect, useState, useRef } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Zap, Lock } from 'lucide-react'
import type { CodeCheck } from '../types'

interface CheckStatus {
  check: CodeCheck
  passed: boolean
}

interface Props {
  code: string
  checks: CodeCheck[]
  /** Si hay un progreso anterior del usuario, se restaura */
  onAllPassed?: () => void
}

/**
 * Elimina comentarios de línea (//) y de bloque (/* *\/) del código
 * para que los checks no coincidan con código comentado.
 * También elimina contenido de strings literales ("..." y '...') para
 * evitar falsos positivos en valores de string.
 */
function stripCommentsAndStrings(code: string): string {
  let result = ''
  let i = 0
  while (i < code.length) {
    // Bloque /* ... */
    if (code[i] === '/' && code[i + 1] === '*') {
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2
      result += ' '
      continue
    }
    // Línea //
    if (code[i] === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++
      result += ' '
      continue
    }
    // String con comillas dobles
    if (code[i] === '"') {
      i++
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\') i++ // skip escape
        i++
      }
      i++ // closing "
      result += '""'
      continue
    }
    // Char literal / string con comilla simple (C)
    if (code[i] === "'") {
      i++
      while (i < code.length && code[i] !== "'") {
        if (code[i] === '\\') i++
        i++
      }
      i++
      result += "''"
      continue
    }
    result += code[i]
    i++
  }
  return result
}

function evaluateCheck(check: CodeCheck, code: string): boolean {
  try {
    const cleanCode = stripCommentsAndStrings(code)
    const type = check.type ?? 'regex'
    if (type === 'contains') {
      return cleanCode.includes(check.pattern)
    }
    if (type === 'not-contains') {
      return !cleanCode.includes(check.pattern)
    }
    // default: regex
    const flags = check.pattern === check.pattern.toLowerCase() ? 'im' : 'm'
    return new RegExp(check.pattern, flags).test(cleanCode)
  } catch {
    return false
  }
}

/** Índice del primer check no superado (sin contar opcionales) */
function firstFailingIdx(statuses: CheckStatus[]): number {
  return statuses.findIndex((s) => !s.passed && s.check.required !== false)
}

export default function LiveAnalysis({ code, checks, onAllPassed }: Props) {
  const [statuses, setStatuses] = useState<CheckStatus[]>(() =>
    checks.map((c) => ({ check: c, passed: false }))
  )
  const [expanded, setExpanded] = useState(true)
  const [showHintFor, setShowHintFor] = useState<string | null>(null)
  const prevAllPassed = useRef(false)

  // Debounce 250ms — recalcular en cada cambio
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatuses(checks.map((c) => ({ check: c, passed: evaluateCheck(c, code) })))
    }, 250)
    return () => clearTimeout(timer)
  }, [code, checks])

  // Detectar cuando todos los checks requeridos pasan
  useEffect(() => {
    const allRequired = statuses
      .filter((s) => s.check.required !== false)
      .every((s) => s.passed)

    if (allRequired && !prevAllPassed.current && statuses.length > 0) {
      prevAllPassed.current = true
      onAllPassed?.()
    } else if (!allRequired) {
      prevAllPassed.current = false
    }
  }, [statuses, onAllPassed])

  if (!checks.length) return null

  const passedRequired = statuses.filter((s) => s.check.required !== false && s.passed).length
  const totalRequired = statuses.filter((s) => s.check.required !== false).length
  const allPassed = passedRequired === totalRequired
  const failingIdx = firstFailingIdx(statuses)

  // La pista activa es para el primer check que falla
  const activeHint = failingIdx !== -1 ? statuses[failingIdx].check : null

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-colors ${
        allPassed
          ? 'border-green/30 bg-green/5'
          : 'border-blue/20 bg-blue/5'
      }`}
    >
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Zap
            size={14}
            className={allPassed ? 'text-green' : 'text-blue'}
            fill={allPassed ? 'currentColor' : 'none'}
          />
          <span
            className={`text-sm font-semibold ${allPassed ? 'text-green' : 'text-blue'}`}
          >
            {allPassed ? '¡Todo correcto!' : `Requisitos (${passedRequired}/${totalRequired})`}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={13} className="text-muted" />
        ) : (
          <ChevronDown size={13} className="text-muted" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-blue/10 px-4 pb-4 pt-3 space-y-1.5">
          {/* ─── Check list ──────────────────────────────────────────── */}
          {statuses.map((s, idx) => {
            const isNext = idx === failingIdx            // próximo en resolver
            const isBlocked = !s.passed && idx > failingIdx && s.check.required !== false
            const isOptional = s.check.required === false

            return (
              <div
                key={s.check.id}
                className={`flex items-start gap-2.5 rounded-md px-2.5 py-2 transition-colors ${
                  s.passed
                    ? 'bg-green/10'
                    : isNext
                    ? 'bg-blue/10 ring-1 ring-blue/20'
                    : 'opacity-60'
                }`}
              >
                {/* Ícono de estado */}
                <div className="mt-0.5 shrink-0">
                  {s.passed ? (
                    <CheckCircle2 size={14} className="text-green" />
                  ) : isBlocked ? (
                    <Lock size={13} className="text-muted" />
                  ) : (
                    <Circle
                      size={14}
                      className={isNext ? 'text-blue' : 'text-muted'}
                    />
                  )}
                </div>

                {/* Descripción */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium leading-4 ${
                      s.passed
                        ? 'text-green'
                        : isNext
                        ? 'text-blue'
                        : 'text-muted'
                    }`}
                  >
                    {s.check.description}
                    {isOptional && (
                      <span className="ml-1.5 rounded bg-purple/20 px-1 py-0.5 text-[10px] text-purple">
                        extra
                      </span>
                    )}
                  </p>

                  {/* Pista del check activo */}
                  {isNext && s.check.hint && (
                    <div className="mt-1.5">
                      {showHintFor === s.check.id ? (
                        <p className="text-xs leading-4 text-blue/80 italic">
                          💡 {s.check.hint}
                        </p>
                      ) : (
                        <button
                          onClick={() => setShowHintFor(s.check.id)}
                          className="text-[11px] text-blue/60 hover:text-blue underline underline-offset-2 transition-colors"
                        >
                          Ver pista
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* ─── Mensaje de finalización ──────────────────────────────── */}
          {allPassed && (
            <div className="mt-3 rounded-md bg-green/15 px-3 py-2 text-center text-xs font-medium text-green">
              🎉 ¡Excelente! Pulsa <strong>Ejecutar pruebas</strong> para verificar tu solución completa.
            </div>
          )}

          {/* ─── Indicador de progreso ────────────────────────────────── */}
          {!allPassed && totalRequired > 1 && (
            <div className="mt-2">
              <div className="h-1 w-full overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full rounded-full bg-blue transition-all duration-500"
                  style={{ width: `${(passedRequired / totalRequired) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
