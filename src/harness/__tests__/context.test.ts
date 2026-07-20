import { describe, it, expect } from 'vitest'
import { splitIntoSections, buildLessonContext, formatSectionIndex } from '../context'

const LESSON = `Introducción general al tema de las variables y sus usos principales.

## Variables

Una variable es un contenedor para guardar datos. Se declara con la palabra clave let.

\`\`\`js exec
let edad = 25
\`\`\`

## Constantes

Las constantes se declaran con const y no se pueden reasignar después.

## Ámbito

El ámbito determina dónde vive una variable dentro del programa.
`

describe('splitIntoSections', () => {
  it('divide por encabezados conservando la introducción', () => {
    const s = splitIntoSections(LESSON)
    expect(s).toHaveLength(4)
    expect(s[0].title).toBe('')
    expect(s[1].title).toBe('Variables')
    expect(s[2].title).toBe('Constantes')
    expect(s[3].title).toBe('Ámbito')
  })

  it('omite bloques de código del texto de la sección', () => {
    const s = splitIntoSections(LESSON)
    expect(s[1].text).not.toContain('let edad')
    expect(s[1].text).toContain('contenedor para guardar datos')
  })

  it('descarta secciones sin prosa legible', () => {
    const md = '## Solo código\n\n```js exec\nlet x = 1\n```\n\n## Prosa\n\nTexto legible aquí.'
    const s = splitIntoSections(md)
    expect(s).toHaveLength(1)
    expect(s[0].title).toBe('Prosa')
  })

  it('devuelve [] para markdown vacío', () => {
    expect(splitIntoSections('')).toEqual([])
  })
})

describe('buildLessonContext', () => {
  const sections = splitIntoSections(LESSON)

  it('camino rápido: si todo cabe, incluye todo', () => {
    const r = buildLessonContext({ sections, recentTurns: [], budget: 100000 })
    expect(r.includedCount).toBe(4)
    expect(r.included).toEqual([true, true, true, true])
    expect(r.context).toContain('Ámbito')
  })

  it('respeta el presupuesto y siempre incluye la introducción', () => {
    const r = buildLessonContext({ sections, recentTurns: [], budget: 120 })
    expect(r.context.length).toBeLessThanOrEqual(122) // budget + separadores
    expect(r.included[0]).toBe(true)
    expect(r.includedCount).toBeLessThan(4)
  })

  it('prioriza la sección relevante a la conversación', () => {
    const r = buildLessonContext({
      sections,
      recentTurns: ['¿y las constantes? no entiendo lo de reasignar'],
      budget: 220,
    })
    expect(r.included[2]).toBe(true) // Constantes entra por relevancia
    expect(r.context).toContain('constantes')
    // El orden del documento se conserva: Constantes (2) antes que Ámbito (3) si ambas entran
    if (r.included[3]) {
      expect(r.context.indexOf('Constantes')).toBeLessThan(r.context.indexOf('Ámbito'))
    }
  })

  it('sin conversación reciente, rellena en orden de documento', () => {
    const r = buildLessonContext({ sections, recentTurns: [], budget: 220 })
    const firstIncluded = r.included.indexOf(true)
    expect(firstIncluded).toBe(0)
    expect(r.included[1]).toBe(true)
  })

  it('devuelve estructura vacía para 0 secciones', () => {
    const r = buildLessonContext({ sections: [], recentTurns: ['hola'], budget: 100 })
    expect(r.context).toBe('')
    expect(r.totalCount).toBe(0)
  })
})

describe('formatSectionIndex', () => {
  it('anuncia las secciones no incluidas', () => {
    const sections = splitIntoSections(LESSON)
    const idx = formatSectionIndex(sections, [true, true, false, true])
    expect(idx).toContain('[2] Constantes — NO incluida')
    expect(idx).toContain('get_lesson_section')
    expect(idx).not.toContain('[1] Variables — NO incluida')
  })
})
