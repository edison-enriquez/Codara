import { describe, it, expect, beforeEach } from 'vitest'
import { runTutorTurn, type CompleteFn } from '../tutorHarness'
import { getHarnessMetrics, resetHarnessMetrics } from '../telemetry'
import { TUTOR_RESPONSE_SCHEMA } from '../tutorSchema'
import { splitIntoSections } from '../context'
import type { AgentConfig } from '../../context/AgentContext'
import type { Message } from '../../utils/llmClient'

const LESSON = `## Variables

Una variable es un contenedor para guardar datos. Se declara con let o const.
`

const SECTIONED_LESSON = `## Variables

Una variable es un contenedor para guardar datos. Se declara con let.

## Constantes

Las constantes se declaran con const y no se pueden reasignar.
`

const CONFIG: AgentConfig = { provider: 'groq', apiKey: 'test', groqModel: 'test-model', webllmModel: '', opencodefreeApiKey: '', opencodefreeModel: 'mimo-v2.5-free' }
const MESSAGES: Message[] = [{ role: 'user', content: 'hola' }]

const VALID_JSON = JSON.stringify({
  speech: 'Una variable guarda datos.',
  marks: [{ text: 'contenedor para guardar datos', style: 'highlight' }],
  advance: false,
  action: null,
  verdict: 'correct',
})

/** Fake del LLM: devuelve las respuestas en orden y graba las llamadas. */
function fakeComplete(responses: string[]) {
  const calls: { messages: Message[]; responseFormat: unknown }[] = []
  let i = 0
  const fn: CompleteFn = async (_config, messages, _signal, _onProgress, responseFormat) => {
    calls.push({ messages: [...messages], responseFormat })
    return responses[Math.min(i++, responses.length - 1)]
  }
  return { fn, calls }
}

beforeEach(() => resetHarnessMetrics())

describe('runTutorTurn', () => {
  it('turno válido a la primera: 1 intento, sin reintentos', async () => {
    const { fn, calls } = fakeComplete([VALID_JSON])
    const r = await runTutorTurn({ config: CONFIG, messages: MESSAGES, lessonContent: LESSON, complete: fn })

    expect(r.attempts).toBe(1)
    expect(r.usedFallback).toBe(false)
    expect(r.turn.speech).toContain('variable')
    expect(r.turn.verdict).toBe('correct')

    const m = getHarnessMetrics()
    expect(m.turns).toBe(1)
    expect(m.retries).toBe(0)
    expect(m.parseFailures).toBe(0)
  })

  it('pide salida estructurada nativa con el schema del contrato', async () => {
    const { fn, calls } = fakeComplete([VALID_JSON])
    await runTutorTurn({ config: CONFIG, messages: MESSAGES, lessonContent: LESSON, complete: fn })
    expect(calls[0].responseFormat).toEqual(TUTOR_RESPONSE_SCHEMA)
  })

  it('reintenta con feedback cuando la salida no cumple el contrato', async () => {
    const { fn, calls } = fakeComplete(['esto no es JSON, solo prosa', VALID_JSON])
    const r = await runTutorTurn({ config: CONFIG, messages: MESSAGES, lessonContent: LESSON, complete: fn })

    expect(r.attempts).toBe(2)
    expect(r.usedFallback).toBe(false)

    // El 2º intento incluye la respuesta rechazada y el feedback del harness
    expect(calls).toHaveLength(2)
    const feedback = calls[1].messages.at(-1)
    expect(feedback?.role).toBe('user')
    expect(feedback?.content).toContain('RECHAZADA')
    expect(calls[1].messages.at(-2)?.content).toBe('esto no es JSON, solo prosa')

    const m = getHarnessMetrics()
    expect(m.retries).toBe(1)
    expect(m.parseFailures).toBe(1)
    expect(m.retrySuccesses).toBe(1)
  })

  it('agota los intentos y usa fallback controlado', async () => {
    const { fn } = fakeComplete(['prosa sin json 1', 'prosa sin json 2'])
    const r = await runTutorTurn({ config: CONFIG, messages: MESSAGES, lessonContent: LESSON, complete: fn })

    expect(r.attempts).toBe(2)
    expect(r.usedFallback).toBe(true)
    expect(r.turn.speech).toBe('prosa sin json 2')
    expect(r.turn.advance).toBe(false)

    const m = getHarnessMetrics()
    expect(m.fallbackUsed).toBe(1)
    expect(m.parseFailures).toBe(2)
  })

  it('respeta maxAttempts: 1 (sin reintento)', async () => {
    const { fn, calls } = fakeComplete(['prosa sin json'])
    const r = await runTutorTurn({ config: CONFIG, messages: MESSAGES, lessonContent: LESSON, maxAttempts: 1, complete: fn })
    expect(calls).toHaveLength(1)
    expect(r.usedFallback).toBe(true)
  })

  it('cuenta las marcas inventadas que el validador rechaza', async () => {
    const raw = JSON.stringify({
      speech: 'Veamos el hoisting y los closures.',
      marks: [
        { text: 'contenedor para guardar datos', style: 'highlight' },
        { text: 'el hoisting eleva las declaraciones', style: 'underline' },
      ],
      advance: false,
      action: null,
      verdict: null,
    })
    const { fn } = fakeComplete([raw])
    const r = await runTutorTurn({ config: CONFIG, messages: MESSAGES, lessonContent: LESSON, complete: fn })

    expect(r.turn.marks).toEqual([{ text: 'contenedor para guardar datos', style: 'highlight' }])
    expect(getHarnessMetrics().marksRejected).toBe(1)
  })

  it('repara JSON truncado sin reintentar', async () => {
    const { fn, calls } = fakeComplete(['{"speech": "Las variables se declaran con le'])
    const r = await runTutorTurn({ config: CONFIG, messages: MESSAGES, lessonContent: LESSON, complete: fn })

    expect(calls).toHaveLength(1)
    expect(r.repaired).toBe(true)
    expect(r.turn.speech).toContain('variables')
    expect(getHarnessMetrics().repairedOutputs).toBe(1)
  })

  it('lanza AbortError si la señal se abortó durante la llamada', async () => {
    const { fn } = fakeComplete([VALID_JSON])
    const signal = AbortSignal.abort()
    await expect(
      runTutorTurn({ config: CONFIG, messages: MESSAGES, lessonContent: LESSON, signal, complete: fn })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  // ── Bucle agente: herramientas ──────────────────────────────────────────

  it('ejecuta get_lesson_section y entrega el resultado al modelo', async () => {
    const sections = splitIntoSections(SECTIONED_LESSON)
    const toolCall = JSON.stringify({ tool_call: { name: 'get_lesson_section', args: { section: 1 } } })
    const { fn, calls } = fakeComplete([toolCall, VALID_JSON])

    const r = await runTutorTurn({
      config: CONFIG, messages: MESSAGES, lessonContent: SECTIONED_LESSON, sections, complete: fn,
    })

    expect(r.toolCalls).toBe(1)
    expect(r.attempts).toBe(2)
    expect(r.usedFallback).toBe(false)
    // El resultado de la herramienta llegó al modelo en la 2ª llamada
    const toolResult = calls[1].messages.at(-1)
    expect(toolResult?.role).toBe('user')
    expect(toolResult?.content).toContain('get_lesson_section')
    expect(toolResult?.content).toContain('Constantes')

    const m = getHarnessMetrics()
    expect(m.toolCalls).toBe(1)
    expect(m.toolErrors).toBe(0)
  })

  it('cuenta errores de herramienta (sección inexistente) y sigue el bucle', async () => {
    const sections = splitIntoSections(SECTIONED_LESSON)
    const badCall = JSON.stringify({ tool_call: { name: 'get_lesson_section', args: { section: 99 } } })
    const { fn, calls } = fakeComplete([badCall, VALID_JSON])

    const r = await runTutorTurn({
      config: CONFIG, messages: MESSAGES, lessonContent: SECTIONED_LESSON, sections, complete: fn,
    })

    expect(r.toolCalls).toBe(1)
    expect(calls[1].messages.at(-1)?.content).toContain('Sección inválida')
    expect(getHarnessMetrics().toolErrors).toBe(1)
  })

  it('agota las rondas de herramienta y exige respuesta final', async () => {
    const sections = splitIntoSections(SECTIONED_LESSON)
    const toolCall = (n: number) => JSON.stringify({ tool_call: { name: 'get_lesson_section', args: { section: n } } })
    // 2 tool calls (máx.) + otra más → el harness exige JSON; luego responde bien
    const { fn, calls } = fakeComplete([toolCall(0), toolCall(1), toolCall(0), VALID_JSON])

    const r = await runTutorTurn({
      config: CONFIG, messages: MESSAGES, lessonContent: SECTIONED_LESSON, sections, complete: fn,
    })

    expect(r.toolCalls).toBe(2)
    expect(r.usedFallback).toBe(false)
    expect(calls[3].messages.at(-1)?.content).toContain('No puedes usar más herramientas')
    expect(getHarnessMetrics().toolCalls).toBe(2)
  })

  it('sin secciones, un tool_call se trata como petición de respuesta final', async () => {
    const toolCall = JSON.stringify({ tool_call: { name: 'get_lesson_section', args: { section: 0 } } })
    const { fn, calls } = fakeComplete([toolCall, VALID_JSON])

    const r = await runTutorTurn({
      config: CONFIG, messages: MESSAGES, lessonContent: LESSON, complete: fn, // sin sections
    })

    expect(r.toolCalls).toBe(0)
    expect(r.usedFallback).toBe(false)
    expect(calls[1].messages.at(-1)?.content).toContain('No puedes usar más herramientas')
  })
})
