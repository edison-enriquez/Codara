import type { AgentConfig } from '../context/AgentContext'
import { streamGroq, type Message } from './groqClient'
import { streamWebLLM, type LoadProgress } from './webllmClient'

export type { Message, LoadProgress }

/**
 * Punto único de entrada para el agente: elige proveedor según la config.
 * Misma interfaz para Groq (nube) y WebLLM (local), con streaming por chunks.
 * `onProgress` solo aplica a WebLLM (descarga/init del modelo la 1ª vez).
 */
export async function streamLLM(
  config: AgentConfig,
  messages: Message[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  onProgress?: (p: LoadProgress) => void,
): Promise<void> {
  if (config.provider === 'webllm') {
    return streamWebLLM(config.webllmModel, messages, onChunk, signal, onProgress)
  }
  return streamGroq({ apiKey: config.apiKey, model: config.groqModel }, messages, onChunk, signal)
}
