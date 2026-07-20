import { describe, it, expect } from 'vitest'
import { validateTutorTurn, extractJsonObjects, markIsValid, filterValidMarks, norm } from '../parse'

const LESSON = `## Variables en JavaScript

Una variable es un contenedor para guardar datos. Se declara con la palabra clave let o const.

\`\`\`js exec
let edad = 25
\`\`\`

Las constantes no se pueden reasignar después de su declaración.
`

describe('extractJsonObjects', () => {
  it('extrae un objeto limpio', () => {
    expect(extractJsonObjects('{"a":1}')).toEqual(['{"a":1}'])
  })

  it('tolera fences markdown y texto alrededor', () => {
    const raw = 'Aquí va:\n```json\n{"speech":"hola"}\n```\nfin'
    expect(extractJsonObjects(raw)).toEqual(['{"speech":"hola"}'])
  })

  it('extrae varios objetos y respeta llaves dentro de strings', () => {
    const raw = '{"speech":"usa { llaves }"} {"speech":"otro"}'
    expect(extractJsonObjects(raw)).toHaveLength(2)
  })
})

describe('norm / markIsValid / filterValidMarks', () => {
  it('normaliza acentos, mayúsculas y puntuación', () => {
    expect(norm('  ¡Constánts,  TÉCNICAS! ')).toBe('constants tecnicas')
  })

  it('valida citas exactas de la lección', () => {
    expect(markIsValid('Una variable es un contenedor para guardar datos', LESSON)).toBe(true)
  })

  it('rechaza citas inventadas', () => {
    expect(markIsValid('Las clases heredan prototipos dinámicos', LESSON)).toBe(false)
  })

  it('filterValidMarks separa marcas verificables de inventadas', () => {
    const marks = [
      { text: 'Las constantes no se pueden reasignar', style: 'highlight' as const },
      { text: 'el hoisting eleva las declaraciones', style: 'underline' as const },
    ]
    const valid = filterValidMarks(marks, LESSON)
    expect(valid).toHaveLength(1)
    expect(valid[0].style).toBe('highlight')
  })
})

describe('validateTutorTurn', () => {
  it('acepta un turno válido completo', () => {
    const raw = JSON.stringify({
      speech: 'Mira, una variable guarda datos.',
      marks: [{ text: 'contenedor para guardar datos', style: 'highlight' }],
      advance: false,
      action: null,
      verdict: 'correct',
    })
    const v = validateTutorTurn(raw, LESSON)
    expect(v.ok).toBe(true)
    expect(v.turn?.speech).toContain('variable')
    expect(v.turn?.marks).toHaveLength(1)
    expect(v.turn?.verdict).toBe('correct')
    expect(v.repaired).toBe(false)
  })

  it('descarta marcas que no son citas de la lección', () => {
    const raw = JSON.stringify({
      speech: 'Veamos el hoisting.',
      marks: [{ text: 'el hoisting eleva declaraciones', style: 'underline' }],
      advance: false,
      action: null,
      verdict: null,
    })
    const v = validateTutorTurn(raw, LESSON)
    expect(v.ok).toBe(true)
    expect(v.turn?.marks).toHaveLength(0)
    expect(v.rejectedMarks).toHaveLength(1)
  })

  it('soporta retrocompatibilidad con el campo reference', () => {
    const raw = JSON.stringify({
      speech: 'Fíjate aquí.',
      reference: 'Las constantes no se pueden reasignar',
      advance: false,
    })
    const v = validateTutorTurn(raw, LESSON)
    expect(v.ok).toBe(true)
    expect(v.turn?.marks).toEqual([{ text: 'Las constantes no se pueden reasignar', style: 'highlight' }])
  })

  it('normaliza verdict inválido a null', () => {
    const raw = JSON.stringify({ speech: 'Bien.', marks: [], advance: false, action: null, verdict: 'genial' })
    expect(validateTutorTurn(raw, LESSON).turn?.verdict).toBeNull()
  })

  it('recupera JSON truncado (repaired)', () => {
    const raw = '{"speech": "Las variables se declaran con let o cons'
    const v = validateTutorTurn(raw, LESSON)
    expect(v.ok).toBe(true)
    expect(v.repaired).toBe(true)
    expect(v.turn?.advance).toBe(false)
    expect(v.turn?.marks).toEqual([])
  })

  it('rechaza prosa sin JSON con errores legibles', () => {
    const v = validateTutorTurn('Claro, una variable guarda datos, mira...', LESSON)
    expect(v.ok).toBe(false)
    expect(v.errors.length).toBeGreaterThan(0)
  })

  it('ignora objetos JSON sin speech y usa el primero válido', () => {
    const raw = '{"marks": []} {"speech": "Válido.", "marks": [], "advance": true, "action": "nextSlide", "verdict": "partial"}'
    const v = validateTutorTurn(raw, LESSON)
    expect(v.ok).toBe(true)
    expect(v.turn?.advance).toBe(true)
    expect(v.turn?.action).toBe('nextSlide')
    expect(v.turn?.verdict).toBe('partial')
  })
})
