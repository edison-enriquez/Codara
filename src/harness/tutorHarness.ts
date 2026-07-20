/**
 * Orquestador del turno del tutor — el "loop" del harness.
 *
 * Cada turno es un pequeño bucle agente:
 *
 *   1. Llamada al modelo con salida estructurada nativa (schema) si el proveedor la admite.
 *   2. Validación de la respuesta (parse.ts):
 *      a. TOOL CALL → el harness ejecuta la herramienta (tools.ts), devuelve el
 *         resultado al modelo y el bucle continúa (máx. `maxToolRounds`).
 *      b. TURNO VÁLIDO → se devuelve (marcas ya verificadas contra la lección).
 *      c. INVÁLIDO → REINTENTO con feedback: el harness explica al modelo por
 *         qué se rechazó su salida (máx. `maxAttempts` intentos de validación).
 *   3. Si se agotan las llamadas: fallback controlado para no dejar al
 *      estudiante sin respuesta, registrado en telemetría.
 *
 * Todo queda medido (telemetry.ts): sin métricas no hay harness, hay suerte.
 */
import type { AgentConfig } from '../context/AgentContext'
import { completeLLM, type Message, type LoadProgress, type StructuredOutputSpec } from '../utils/llmClient'
import { TUTOR_RESPONSE_SCHEMA, type TutorTurn } from './tutorSchema'
import { validateModelResponse } from './parse'
import { executeTutorTool } from './tools'
import type { LessonSection } from './context'
import { recordMetric } from './telemetry'

/** Firma inyectable de la llamada al LLM (permite tests sin red ni modelo). */
export type CompleteFn = (
  config: AgentConfig,
  messages: Message[],
  signal?: AbortSignal,
  onProgress?: (p: LoadProgress) => void,
  responseFormat?: StructuredOutputSpec,
) => Promise<string>

export interface TutorTurnRequest {
  config: AgentConfig
  /** Mensajes del turno (system + historial + última respuesta del estudiante). */
  messages: Message[]
  /** Contenido de la lección visible: las marcas se verifican contra esto. */
  lessonContent: string
  /** Secciones de la lección: habilita la herramienta `get_lesson_section`. */
  sections?: LessonSection[]
  signal?: AbortSignal
  onProgress?: (p: LoadProgress) => void
  /** Intentos de validación (1 = sin reintento). Por defecto 2. */
  maxAttempts?: number
  /** Rondas de herramientas permitidas por turno. Por defecto 2. */
  maxToolRounds?: number
  /** Inyección para tests; por defecto `completeLLM`. */
  complete?: CompleteFn
}

export interface TutorTurnResult {
  turn: TutorTurn
  /** Cuántas llamadas al modelo hicieron falta (incluye rondas de herramientas). */
  attempts: number
  /** Cuántas tool calls ejecutó el harness en este turno. */
  toolCalls: number
  /** La salida válida se obtuvo reparando un JSON truncado. */
  repaired: boolean
  /** Se agotaron las llamadas y se usó el texto crudo como último recurso. */
  usedFallback: boolean
}

function buildFeedback(errors: string[]): string {
  return (
    'Tu respuesta anterior fue RECHAZADA porque no cumple el formato requerido:\n' +
    errors.map((e) => `- ${e}`).join('\n') +
    '\nResponde ÚNICAMENTE con el objeto JSON válido: {"speech": string, "marks": [...], ' +
    '"advance": boolean, "action": string|null, "verdict": "correct"|"partial"|"incorrect"|null}. ' +
    'Sin markdown, sin texto fuera del JSON.'
  )
}

const TOOLS_EXHAUSTED_MSG =
  'No puedes usar más herramientas en este turno. Responde AHORA ÚNICAMENTE con el ' +
  'objeto JSON del tutor (speech, marks, advance, action, verdict), sin markdown.'

export async function runTutorTurn(req: TutorTurnRequest): Promise<TutorTurnResult> {
  const complete = req.complete ?? completeLLM
  const maxAttempts = Math.max(1, req.maxAttempts ?? 2)
  const toolsEnabled = !!req.sections?.length
  const maxToolRounds = toolsEnabled ? Math.max(0, req.maxToolRounds ?? 2) : 0
  const maxCalls = maxAttempts + maxToolRounds
  recordMetric('turns')

  const messages = [...req.messages]
  let lastRaw = ''
  let toolCalls = 0
  let hadParseFailure = false

  for (let call = 1; call <= maxCalls; call++) {
    recordMetric('structuredOutputRequests')
    lastRaw = (
      await complete(req.config, messages, req.signal, req.onProgress, TUTOR_RESPONSE_SCHEMA)
    ).trim()

    if (req.signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const v = validateModelResponse(lastRaw, req.lessonContent)

    // ── a) Tool call: el harness la ejecuta y el bucle sigue ──────────────
    if (v.type === 'tool_call' && toolCalls < maxToolRounds) {
      toolCalls++
      recordMetric('toolCalls')
      const result = executeTutorTool(v.call, { sections: req.sections! })
      if (!result.ok) recordMetric('toolErrors')
      messages.push({ role: 'assistant', content: lastRaw })
      messages.push({ role: 'user', content: `[Resultado de la herramienta ${v.call.name}]\n${result.content}` })
      continue
    }

    // ── b) Turno válido ────────────────────────────────────────────────────
    if (v.type === 'turn') {
      if (v.rejectedMarks.length) recordMetric('marksRejected', v.rejectedMarks.length)
      if (v.repaired) recordMetric('repairedOutputs')
      if (hadParseFailure) recordMetric('retrySuccesses')
      return { turn: v.turn, attempts: call, toolCalls, repaired: v.repaired, usedFallback: false }
    }

    // ── c) Tool call con herramientas agotadas / inválido → feedback ──────
    messages.push({ role: 'assistant', content: lastRaw })
    if (v.type === 'tool_call') {
      messages.push({ role: 'user', content: TOOLS_EXHAUSTED_MSG })
    } else {
      recordMetric('parseFailures')
      recordMetric('retries')
      hadParseFailure = true
      messages.push({ role: 'user', content: buildFeedback(v.errors) })
    }
  }

  // Último recurso: no dejar al estudiante sin respuesta hablada.
  recordMetric('fallbackUsed')
  return {
    turn: { speech: lastRaw, marks: [], advance: false, action: null, verdict: null },
    attempts: maxCalls,
    toolCalls,
    repaired: false,
    usedFallback: true,
  }
}
