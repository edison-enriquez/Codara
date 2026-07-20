/**
 * Herramientas del agente tutor.
 *
 * Protocolo mediado por el harness (JSON en la salida, ver tutorPrompt.ts):
 * el modelo responde `{"tool_call": {name, args}}` en vez del turno final,
 * el harness ejecuta la herramienta, devuelve el resultado y el bucle sigue.
 *
 * ¿Por qué no tool-calling nativo del proveedor? Porque el tutor también corre
 * en modelos locales de 1–3B (WebLLM), cuyo soporte de tools nativo es
 * inconsistente. El protocolo JSON funciona igual en Groq y en WebLLM, es
 * testeable sin red y se valida con el mismo contrato de siempre.
 */
import type { LessonSection } from './context'
import type { ToolCall } from './parse'

export interface ToolResult {
  ok: boolean
  content: string
}

export interface ToolContext {
  /** Todas las secciones de la lección (incluidas o no en el contexto). */
  sections: LessonSection[]
}

const MAX_SECTION_CHARS = 2500

/** Nombre de las herramientas disponibles (para docs y validación). */
export const TUTOR_TOOL_NAMES = ['get_lesson_section'] as const

export function executeTutorTool(call: ToolCall, ctx: ToolContext): ToolResult {
  if (call.name !== 'get_lesson_section') {
    return {
      ok: false,
      content: `Herramienta desconocida: "${call.name}". Disponibles: ${TUTOR_TOOL_NAMES.join(', ')}.`,
    }
  }

  const idx = typeof call.args.section === 'number' ? Math.trunc(call.args.section) : NaN
  if (!Number.isInteger(idx) || idx < 0 || idx >= ctx.sections.length) {
    const available = ctx.sections.map((s, i) => `[${i}] ${s.title || '(introducción)'}`).join(', ')
    return {
      ok: false,
      content: `Sección inválida: ${JSON.stringify(call.args.section)}. Secciones disponibles: ${available || '(ninguna)'}.`,
    }
  }

  const s = ctx.sections[idx]
  const body = s.text.length > MAX_SECTION_CHARS ? s.text.slice(0, MAX_SECTION_CHARS) + '…' : s.text
  return { ok: true, content: `Sección [${idx}] ${s.title || '(introducción)'}:\n${body}` }
}
