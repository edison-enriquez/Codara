import type { StructuredOutputSpec } from './llmClient'

const OPENCODEFREE_BASE = 'https://opencode.ai/zen/v1'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenCodeFreeOptions {
  apiKey: string
  model: string
}

async function requestCompletion(
  opts: OpenCodeFreeOptions,
  messages: Message[],
  signal: AbortSignal | undefined,
  responseFormat: StructuredOutputSpec | undefined,
): Promise<Response> {
  return fetch(`${OPENCODEFREE_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.3,
      ...(responseFormat ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal,
  })
}

export async function streamOpenCodeFree(
  opts: OpenCodeFreeOptions,
  messages: Message[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  responseFormat?: StructuredOutputSpec
): Promise<void> {
  let res = await requestCompletion(opts, messages, signal, responseFormat)

  if (!res.ok && responseFormat) {
    res = await requestCompletion(opts, messages, signal, undefined)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message ?? `OpenCode Free respondió con HTTP ${res.status}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue
      try {
        const data = JSON.parse(trimmed.slice(6))
        const text = data.choices?.[0]?.delta?.content
        if (text) onChunk(text)
      } catch {}
    }
  }
}
