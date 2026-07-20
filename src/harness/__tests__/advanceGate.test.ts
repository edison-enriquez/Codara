import { describe, it, expect } from 'vitest'
import { decideAdvance, studentAsksToContinue } from '../advanceGate'

describe('studentAsksToContinue', () => {
  it('detecta peticiones explícitas de avanzar', () => {
    expect(studentAsksToContinue('podemos continuar')).toBe(true)
    expect(studentAsksToContinue('pasa a la siguiente lección')).toBe(true)
    expect(studentAsksToContinue('vale, avanza')).toBe(true)
    expect(studentAsksToContinue('adelante, por favor')).toBe(true)
  })

  it('no dispara falsos positivos en respuestas normales', () => {
    expect(studentAsksToContinue('una variable guarda datos')).toBe(false)
    expect(studentAsksToContinue('creo que se declara con let')).toBe(false)
  })
})

describe('decideAdvance', () => {
  it('si el modelo no pide avanzar, nunca se avanza', () => {
    const d = decideAdvance({ requested: false, studentText: 'continuar', studentTurns: 3, lastVerdict: 'correct' })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe('not-requested')
  })

  it('permite si el estudiante pide continuar explícitamente', () => {
    const d = decideAdvance({ requested: true, studentText: 'siguiente lección', studentTurns: 1, lastVerdict: null })
    expect(d.allowed).toBe(true)
    expect(d.reason).toBe('explicit-continue')
  })

  it('permite con evidencia de comprensión (verdict correct)', () => {
    const d = decideAdvance({ requested: true, studentText: 'se declara con const', studentTurns: 2, lastVerdict: 'correct' })
    expect(d.allowed).toBe(true)
    expect(d.reason).toBe('comprehension-evidence')
  })

  it('bloquea sin evidencia suficiente aunque el modelo lo pida', () => {
    for (const lastVerdict of [null, 'partial', 'incorrect'] as const) {
      const d = decideAdvance({ requested: true, studentText: 'no lo tengo claro', studentTurns: 1, lastVerdict })
      expect(d.allowed).toBe(false)
      expect(d.reason).toBe('insufficient-evidence')
    }
  })

  it('bloquea verdict correct si el estudiante aún no ha respondido nada', () => {
    const d = decideAdvance({ requested: true, studentText: '', studentTurns: 0, lastVerdict: 'correct' })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe('insufficient-evidence')
  })
})
