/**
 * Golden set determinista del agente tutor.
 *
 * Cada caso de `evals/golden/tutor-turns.json` (sin `live: true`) se ejecuta
 * contra el harness REAL con un LLM inyectado que reproduce las respuestas
 * guionizadas del caso. Se verifican el turno resultante, las métricas del
 * harness y la decisión del gate de avance.
 *
 * Cambios de comportamiento del harness que rompan un caso dorado = regresión.
 */
import { readFileSync } from 'node:fs'
import { describe, it, expect, beforeEach } from 'vitest'
import { runTutorTurn, type CompleteFn } from '../tutorHarness'
import { decideAdvance } from '../advanceGate'
import { getHarnessMetrics, resetHarnessMetrics, type HarnessMetrics } from '../telemetry'
import { splitIntoSections } from '../context'
import type { AgentConfig } from '../../context/AgentContext'

interface GoldenExpect {
  attempts?: number
  toolCalls?: number
  speechContains?: string
  verdict?: 'correct' | 'partial' | 'incorrect' | null
  marksCount?: number
  advance?: boolean
  usedFallback?: boolean
  repaired?: boolean
  metrics?: Partial<HarnessMetrics>
  gate?: { allowed: boolean; reason?: string }
}

interface GoldenCase {
  id: string
  description?: string
  live?: boolean
  studentText?: string
  studentTurns?: number
  modelResponses?: string[]
  expect?: GoldenExpect
}

interface GoldenDataset {
  lesson: string
  cases: GoldenCase[]
}

const dataset = JSON.parse(
  readFileSync(new URL('../../../evals/golden/tutor-turns.json', import.meta.url), 'utf-8')
) as GoldenDataset

const CONFIG: AgentConfig = { provider: 'groq', apiKey: 'golden', groqModel: 'golden-model', webllmModel: '', opencodefreeApiKey: '', opencodefreeModel: 'mimo-v2.5-free' }

function scriptedComplete(responses: string[]): CompleteFn {
  let i = 0
  return async () => responses[Math.min(i++, responses.length - 1)]
}

const deterministicCases = dataset.cases.filter((c) => !c.live)

beforeEach(() => resetHarnessMetrics())

describe('golden set del tutor (determinista)', () => {
  it('el dataset cubre las áreas clave del harness', () => {
    const ids = deterministicCases.map((c) => c.id)
    expect(ids).toContain('valid-turn')
    expect(ids).toContain('invented-marks-rejected')
    expect(ids.some((id) => id.startsWith('gate-'))).toBe(true)
    expect(ids.some((id) => id.startsWith('tool-'))).toBe(true)
    expect(ids).toContain('fallback-after-exhaustion')
  })

  for (const goldenCase of deterministicCases) {
    it(goldenCase.id + (goldenCase.description ? ` — ${goldenCase.description}` : ''), async () => {
      expect(goldenCase.modelResponses, `caso ${goldenCase.id} sin modelResponses`).toBeTruthy()

      const sections = splitIntoSections(dataset.lesson)
      const result = await runTutorTurn({
        config: CONFIG,
        messages: [{ role: 'user', content: goldenCase.studentText ?? 'hola' }],
        lessonContent: dataset.lesson,
        sections,
        complete: scriptedComplete(goldenCase.modelResponses!),
      })

      const e = goldenCase.expect ?? {}
      if (e.attempts !== undefined) expect(result.attempts).toBe(e.attempts)
      if (e.toolCalls !== undefined) expect(result.toolCalls).toBe(e.toolCalls)
      if (e.usedFallback !== undefined) expect(result.usedFallback).toBe(e.usedFallback)
      if (e.repaired !== undefined) expect(result.repaired).toBe(e.repaired)
      if (e.speechContains !== undefined) expect(result.turn.speech).toContain(e.speechContains)
      if (e.verdict !== undefined) expect(result.turn.verdict).toBe(e.verdict)
      if (e.marksCount !== undefined) expect(result.turn.marks).toHaveLength(e.marksCount)
      if (e.advance !== undefined) expect(result.turn.advance).toBe(e.advance)

      if (e.metrics) {
        const m = getHarnessMetrics()
        for (const [key, value] of Object.entries(e.metrics)) {
          expect(m[key as keyof HarnessMetrics], `métrica ${key}`).toBe(value)
        }
      }

      if (e.gate) {
        const decision = decideAdvance({
          requested: result.turn.advance,
          studentText: goldenCase.studentText ?? '',
          studentTurns: goldenCase.studentTurns ?? 1,
          lastVerdict: result.turn.verdict,
        })
        expect(decision.allowed).toBe(e.gate.allowed)
        if (e.gate.reason) expect(decision.reason).toBe(e.gate.reason)
      }
    })
  }
})
