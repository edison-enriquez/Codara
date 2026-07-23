/**
 * Eval en vivo del agente tutor: modelo real + LLM-as-judge.
 *
 * Corre los casos `live: true` del golden set contra Groq REAL, pasando por
 * todo el harness (prompt oficial, chunking, bucle, validación, telemetría),
 * y luego un segundo LLM (el juez) puntúa la respuesta del tutor de 1 a 5 en
 * corrección, pedagogía y brevedad.
 *
 * Se SALTA automáticamente si no hay GROQ_API_KEY — nunca rompe `npm test`.
 *
 *   GROQ_API_KEY=gsk_... npm run eval:tutor
 */
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { runTutorTurn } from '../tutorHarness'
import { extractJsonObjects } from '../parse'
import { splitIntoSections, buildLessonContext } from '../context'
import { buildSystemPrompt } from '../tutorPrompt'
import { completeLLM, type Message } from '../../utils/llmClient'
import type { AgentConfig } from '../../context/AgentContext'

const API_KEY = process.env.GROQ_API_KEY
const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
const JUDGE_MIN_SCORE = 3

interface LiveCase {
  id: string
  live: true
  description?: string
  chat: { role: 'tutor' | 'student'; text: string }[]
  studentText: string
  judgeHint: string
}

const dataset = JSON.parse(
  readFileSync(new URL('../../../evals/golden/tutor-turns.json', import.meta.url), 'utf-8')
) as { lesson: string; cases: LiveCase[] }

const JUDGE_SYSTEM = `Eres un evaluador pedagógico estricto. Evalúas respuestas de un tutor de programación por voz (en español).
Puntúa de 1 a 5 según:
- Corrección: fiel al contenido de la lección, sin inventar conceptos.
- Pedagogía: tono alentador, conversacional, apropiado para voz.
- Brevedad: adecuada para conversación oral (no un ensayo).
Responde SOLO con un objeto JSON: {"score": <1-5>, "reason": "<frase corta>"}`

async function judgeTurn(
  judgeConfig: AgentConfig,
  lesson: string,
  studentText: string,
  speech: string,
  hint: string,
): Promise<{ score: number; reason: string }> {
  const raw = await completeLLM(judgeConfig, [
    { role: 'system', content: JUDGE_SYSTEM },
    {
      role: 'user',
      content:
        `Lección:\n"""${lesson.slice(0, 2000)}"""\n\n` +
        `Último mensaje del estudiante: "${studentText}"\n\n` +
        `Respuesta del tutor: "${speech}"\n\n` +
        `Una buena respuesta aquí sería: ${hint}`,
    },
  ])
  for (const candidate of extractJsonObjects(raw)) {
    try {
      const j = JSON.parse(candidate)
      if (typeof j.score === 'number') return { score: j.score, reason: String(j.reason ?? '') }
    } catch {}
  }
  return { score: 0, reason: `juez sin JSON válido: ${raw.slice(0, 120)}` }
}

describe.skipIf(!API_KEY)('eval en vivo: tutor real (Groq) + LLM-as-judge', () => {
  const config: AgentConfig = { provider: 'groq', apiKey: API_KEY!, groqModel: MODEL, webllmModel: '', opencodefreeApiKey: '', opencodefreeModel: 'mimo-v2.5-free' }
  const sections = splitIntoSections(dataset.lesson)

  for (const liveCase of dataset.cases.filter((c) => c.live)) {
    it(liveCase.id + (liveCase.description ? ` — ${liveCase.description}` : ''), async () => {
      // Misma composición de system prompt que la app (VoiceTutor).
      const recentTurns = liveCase.chat.slice(-4).map((t) => t.text)
      const { context, included } = buildLessonContext({ sections, recentTurns, budget: 6000 })
      const messages: Message[] = [
        { role: 'system', content: buildSystemPrompt({ sections, included, context }) },
        ...liveCase.chat.map((t): Message => ({
          role: t.role === 'tutor' ? 'assistant' : 'user',
          content: t.text,
        })),
        { role: 'user', content: liveCase.studentText },
      ]

      const result = await runTutorTurn({ config, messages, lessonContent: dataset.lesson, sections })

      // Garantías estructurales del harness (independientes del modelo).
      expect(result.turn.speech.length).toBeGreaterThan(0)
      expect(result.usedFallback).toBe(false)

      // LLM-as-judge: calidad pedagógica de la respuesta.
      const judge = await judgeTurn(config, dataset.lesson, liveCase.studentText, result.turn.speech, liveCase.judgeHint)
      console.log(
        `[judge] ${liveCase.id}: ${judge.score}/5 — ${judge.reason}\n` +
        `        speech: ${result.turn.speech.slice(0, 140)}`
      )
      expect(judge.score).toBeGreaterThanOrEqual(JUDGE_MIN_SCORE)
    }, 120_000)
  }
})
