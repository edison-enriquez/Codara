/**
 * Validación del contrato del tutor contra la salida cruda del modelo.
 *
 * Funciones puras y testeables: ninguna toca el LLM, el DOM ni el estado
 * de la aplicación. El harness las usa para aceptar, reparar o rechazar
 * cada respuesta del modelo.
 */
import { extractReadableChunks } from '../utils/speechText'
import type { TutorMark, TutorTurn, Verdict } from './tutorSchema'

// ─── Extracción de objetos JSON ─────────────────────────────────────────────

/** Extrae todos los objetos JSON de nivel superior de un texto (tolera
 *  fences markdown, texto antes/después, y varios objetos). */
export function extractJsonObjects(raw: string): string[] {
  const source = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '')
  const objects: string[] = []
  let start = -1
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') {
      if (depth === 0) start = i
      depth++
    } else if (char === '}' && depth > 0) {
      depth--
      if (depth === 0 && start >= 0) {
        objects.push(source.slice(start, i + 1))
        start = -1
      }
    }
  }
  return objects
}

// ─── Verificación de citas contra la lección ────────────────────────────────

export function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** ¿La cita (mark) del LLM aparece realmente en el contenido de la lección? */
export function markIsValid(markText: string, lessonContent: string): boolean {
  if (!markText || markText.length < 4) return true
  const refN = norm(markText)
  const chunks = extractReadableChunks(lessonContent)
  for (const ch of chunks) {
    const cN = norm(ch)
    if (cN.includes(refN)) return true
    const refWords = refN.split(' ').filter((w) => w.length > 3)
    if (!refWords.length) continue
    const chunkWords = new Set(cN.split(' ').filter((w) => w.length > 3))
    let hits = 0
    for (const w of refWords) if (chunkWords.has(w)) hits++
    if (hits / refWords.length >= 0.6 && hits >= 2) return true
  }
  return false
}

/** Deja solo las marcas verificables contra el contenido de la lección. */
export function filterValidMarks(marks: TutorMark[], lessonContent: string): TutorMark[] {
  return marks.filter((mk) => mk.text.length >= 3 && markIsValid(mk.text, lessonContent))
}

// ─── Validación del turno completo ──────────────────────────────────────────

export interface TurnValidation {
  ok: boolean
  turn: TutorTurn | null
  /** Marcas descartadas por no ser citas exactas de la lección. */
  rejectedMarks: TutorMark[]
  /** true si hubo que reparar la salida (JSON truncado recuperado por regex). */
  repaired: boolean
  /** Errores legibles, usados como feedback al modelo en el reintento. */
  errors: string[]
}

/** Llamada a herramienta emitida por el modelo (protocolo JSON del harness). */
export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

/** Lo que el modelo pudo querer decir: turno final, tool call, o inválido. */
export type ModelResponse =
  | { type: 'turn'; turn: TutorTurn; rejectedMarks: TutorMark[]; repaired: boolean }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'invalid'; errors: string[] }

const VERDICTS: Verdict[] = ['correct', 'partial', 'incorrect']

function fail(errors: string[]): TurnValidation {
  return { ok: false, turn: null, rejectedMarks: [], repaired: false, errors }
}

/**
 * Interpreta la salida cruda del modelo:
 * - `{"tool_call": {name, args}}` → llamada a herramienta (el bucle la ejecuta).
 * - Objeto con `speech` no vacío → turno final validado (marcas verificadas
 *   contra la lección; retrocompatibilidad `reference` → highlight).
 * - JSON truncado → recuperación por regex (repaired=true).
 * - Nada de lo anterior → inválido con errores legibles para el feedback.
 */
export function validateModelResponse(raw: string, lessonContent: string): ModelResponse {
  const candidates = extractJsonObjects(raw)

  for (const candidate of candidates) {
    let o: any
    try {
      o = JSON.parse(candidate)
    } catch {
      continue // Algunos modelos locales generan JSON casi válido; probar el siguiente.
    }

    // ¿Llamada a herramienta?
    const tc = o?.tool_call
    if (tc && typeof tc.name === 'string' && tc.name.trim()) {
      const args = tc.args && typeof tc.args === 'object' && !Array.isArray(tc.args) ? tc.args : {}
      return { type: 'tool_call', call: { name: tc.name.trim(), args } }
    }

    if (typeof o.speech !== 'string' || !o.speech.trim()) continue

    let marks: TutorMark[] = []
    if (Array.isArray(o.marks)) {
      marks = o.marks
        .filter((mk: any) => typeof mk?.text === 'string' && (mk?.style === 'highlight' || mk?.style === 'underline'))
        .map((mk: any) => ({ text: mk.text.trim(), style: mk.style as TutorMark['style'] }))
    } else if (typeof o.reference === 'string') {
      // retrocompatibilidad: reference única → highlight
      marks = [{ text: o.reference.trim(), style: 'highlight' }]
    }

    const validMarks = filterValidMarks(marks, lessonContent)
    const rejectedMarks = marks.filter((mk) => !validMarks.includes(mk))

    const turn: TutorTurn = {
      speech: o.speech.trim(),
      marks: validMarks,
      advance: o.advance === true,
      action: typeof o.action === 'string' ? o.action : null,
      verdict: VERDICTS.includes(o.verdict) ? o.verdict : null,
    }
    return { type: 'turn', turn, rejectedMarks, repaired: false }
  }

  // Recuperación para JSON truncado o con una coma inválida: evita mostrar el objeto entero.
  const speechMatch = raw.match(/"speech"\s*:\s*"((?:\\.|[^"\\])*)/s)
  if (speechMatch) {
    try {
      const speech = JSON.parse(`"${speechMatch[1]}"`)
      if (typeof speech === 'string' && speech.trim()) {
        return {
          type: 'turn',
          turn: { speech: speech.trim(), marks: [], advance: false, action: null, verdict: null },
          rejectedMarks: [],
          repaired: true,
        }
      }
    } catch {}
  }

  if (candidates.length === 0) return { type: 'invalid', errors: ['No se encontró ningún objeto JSON en la respuesta.'] }
  return {
    type: 'invalid',
    errors: ['Se encontraron objetos JSON, pero ninguno tiene un campo "speech" válido y no vacío.'],
  }
}

/**
 * Valida la salida cruda como turno final del tutor (sin herramientas).
 * Wrapper de `validateModelResponse` para consumidores que solo aceptan turnos.
 */
export function validateTutorTurn(raw: string, lessonContent: string): TurnValidation {
  const v = validateModelResponse(raw, lessonContent)
  if (v.type === 'turn') {
    return { ok: true, turn: v.turn, rejectedMarks: v.rejectedMarks, repaired: v.repaired, errors: [] }
  }
  if (v.type === 'tool_call') {
    return fail(['La respuesta es una llamada a herramienta (tool_call), no un turno del tutor.'])
  }
  return fail(v.errors)
}
