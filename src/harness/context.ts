/**
 * Ingeniería de contexto de la lección.
 *
 * Antes: el contexto era `join().slice(0, 6000)` — un truncado ciego que podía
 * cortar una frase a la mitad y dejar fuera justo la sección sobre la que el
 * estudiante está preguntando.
 *
 * Ahora: la lección se divide en SECCIONES (por encabezados markdown), se
 * puntúa cada una por relevancia contra los últimos turnos de la conversación
 * (solapamiento de palabras clave) y se rellena el presupuesto con las más
 * relevantes, en orden de documento. Las secciones omitidas quedan anunciadas
 * en el índice y el modelo puede pedirlas con la herramienta
 * `get_lesson_section` (ver tools.ts) — chunking y tool calling se complementan.
 */
import { extractReadableChunks } from '../utils/speechText'
import { norm } from './parse'

export interface LessonSection {
  /** Texto del encabezado; '' para la sección inicial sin encabezado. */
  title: string
  /** Prosa legible de la sección (bloques de código omitidos). */
  text: string
}

/** Palabras vacías del español: no aportan relevancia temática. */
export const SPANISH_STOP_WORDS = new Set([
  'ahora', 'antes', 'aquello', 'como', 'cuando', 'desde', 'donde', 'esta', 'este',
  'estas', 'estos', 'hacia', 'hasta', 'luego', 'mientras', 'para', 'porque',
  'puede', 'puedes', 'sobre', 'tambien', 'tiene', 'tienen', 'todo', 'todos',
  'vamos', 'veras', 'muy', 'bien', 'solo', 'ser', 'eso', 'aqui',
  'entonces', 'pero', 'cada', 'forma', 'parte', 'ejemplo',
])

/** Divide el markdown de la lección en secciones por encabezados (`#`…`######`).
 *  Secciones sin prosa legible (p.ej. solo código) se descartan. */
export function splitIntoSections(markdown: string): LessonSection[] {
  const sections: LessonSection[] = []
  let title = ''
  let buf: string[] = []

  const flush = () => {
    const text = extractReadableChunks(buf.join('\n')).join(' ').replace(/\s+/g, ' ').trim()
    buf = []
    if (text) sections.push({ title: title.trim(), text })
  }

  for (const line of markdown.split('\n')) {
    const h = line.match(/^#{1,6}\s+(.*)/)
    if (h) {
      flush()
      title = h[1]
    } else {
      buf.push(line)
    }
  }
  flush()
  return sections
}

function keywords(text: string): Set<string> {
  return new Set(
    norm(text)
      .split(' ')
      .filter((w) => w.length >= 4 && !SPANISH_STOP_WORDS.has(w))
  )
}

export interface BuiltContext {
  /** Texto de contexto listo para el prompt (secciones en orden de documento). */
  context: string
  /** included[i] === true si la sección i entró en el contexto. */
  included: boolean[]
  includedCount: number
  totalCount: number
}

function sectionText(s: LessonSection): string {
  return (s.title ? s.title + '. ' : '') + s.text
}

/**
 * Compone el contexto de la lección dentro de `budget` caracteres:
 * - Si todo cabe, devuelve la lección completa (camino rápido).
 * - Si no, incluye siempre la primera sección y luego las más relevantes
 *   a la conversación reciente, respetando el presupuesto.
 */
export function buildLessonContext(opts: {
  sections: LessonSection[]
  /** Últimos turnos de la conversación (texto del tutor y del estudiante). */
  recentTurns: string[]
  /** Presupuesto en caracteres (por defecto 6000). */
  budget?: number
}): BuiltContext {
  const { sections, recentTurns } = opts
  const budget = opts.budget ?? 6000
  const none: BuiltContext = { context: '', included: [], includedCount: 0, totalCount: 0 }
  if (!sections.length) return none

  const full = sections.map(sectionText).join('\n\n')
  if (full.length <= budget) {
    return {
      context: full,
      included: sections.map(() => true),
      includedCount: sections.length,
      totalCount: sections.length,
    }
  }

  const convoKeys = keywords(recentTurns.join(' '))
  const scored = sections.map((s, i) => {
    const keys = keywords(s.title + ' ' + s.text)
    let score = 0
    for (const k of keys) if (convoKeys.has(k)) score++
    return { i, score }
  })
  // Más relevantes primero; empate → orden de documento.
  const order = [...scored].sort((a, b) => b.score - a.score || a.i - b.i)

  const included = sections.map(() => false)
  let used = 0
  const pick = (i: number) => {
    if (included[i]) return
    const len = sectionText(sections[i]).length + 2 // +\n\n
    if (used + len <= budget) {
      included[i] = true
      used += len
    }
  }

  pick(0) // la introducción da contexto base al tutor
  for (const { i } of order) pick(i)

  const context = sections
    .map((s, i) => (included[i] ? sectionText(s) : null))
    .filter((x): x is string => x !== null)
    .join('\n\n')

  return {
    context,
    included,
    includedCount: included.filter(Boolean).length,
    totalCount: sections.length,
  }
}

/** Índice de la lección para el system prompt; anuncia las secciones omitidas
 *  para que el modelo sepa que puede pedirlas con `get_lesson_section`. */
export function formatSectionIndex(sections: LessonSection[], included: boolean[]): string {
  return sections
    .map((s, i) => {
      const label = `[${i}] ${s.title || '(introducción)'}`
      return included[i]
        ? label
        : `${label} — NO incluida en el contexto; si la necesitas, léela con la herramienta get_lesson_section`
    })
    .join('\n')
}
