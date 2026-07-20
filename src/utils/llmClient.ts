import type { AgentConfig } from '../context/AgentContext'
import { streamGroq, type Message } from './groqClient'
import { streamWebLLM, type LoadProgress } from './webllmClient'

export type { Message, LoadProgress }

/** Petición de salida estructurada: el proveedor garantiza JSON que cumple el schema. */
export interface StructuredOutputSpec {
  /** Nombre del esquema (documentación/depuración). */
  name: string
  /** JSON Schema que debe cumplir la respuesta. */
  schema: Record<string, unknown>
}

/**
 * Punto único de entrada para el agente: elige proveedor según la config.
 * Misma interfaz para Groq (nube) y WebLLM (local), con streaming por chunks.
 * `onProgress` solo aplica a WebLLM (descarga/init del modelo la 1ª vez).
 * `responseFormat` (opcional) pide salida estructurada nativa; si el proveedor
 * no la admite, el cliente cae a generación libre automáticamente.
 */
export async function streamLLM(
  config: AgentConfig,
  messages: Message[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  onProgress?: (p: LoadProgress) => void,
  responseFormat?: StructuredOutputSpec,
): Promise<void> {
  if (config.provider === 'webllm') {
    return streamWebLLM(config.webllmModel, messages, onChunk, signal, onProgress, responseFormat)
  }
  return streamGroq({ apiKey: config.apiKey, model: config.groqModel }, messages, onChunk, signal, responseFormat)
}

/**
 * Versión no-streaming de `streamLLM`: acumula todos los chunks y devuelve el
 * texto completo. Útil para llamadas puntuales del agente (p.ej. el tutor de
 * voz, que necesita la respuesta entera antes de sintetizarla).
 * `onProgress` solo aplica a WebLLM (descarga/init del modelo la 1ª vez).
 */
export async function completeLLM(
  config: AgentConfig,
  messages: Message[],
  signal?: AbortSignal,
  onProgress?: (p: LoadProgress) => void,
  responseFormat?: StructuredOutputSpec,
): Promise<string> {
  let out = ''
  await streamLLM(config, messages, (text) => { out += text }, signal, onProgress, responseFormat)
  return out
}
