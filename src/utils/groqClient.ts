import type { AgentConfig } from '../context/AgentContext'

const GROQ_BASE = 'https://api.groq.com/openai/v1'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function streamGroq(
  config: AgentConfig,
  messages: Message[],
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.3,
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message ?? `Groq respondió con HTTP ${res.status}`)
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
