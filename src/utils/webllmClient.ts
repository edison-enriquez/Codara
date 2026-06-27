import type { Message } from './groqClient'
import type { MLCEngine } from '@mlc-ai/web-llm'

/**
 * Modelos locales ofrecidos. SOLO builds INT4 (`q4` = pesos a 4 bits).
 * El sufijo f16/f32 es la precisión de cómputo, no de los pesos: en GPUs sin
 * `shader-f16` el q4f16 se resuelve a q4f32 automáticamente (sigue siendo INT4).
 */
export const WEBLLM_MODELS: { id: string; label: string }[] = [
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',     label: 'Llama 3.2 3B · INT4 · Equilibrado (recomendado)' },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',     label: 'Llama 3.2 1B · INT4 · Rápido y ligero' },
  { id: 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 Coder 3B · INT4 · Enfocado en código' },
  { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',       label: 'Qwen2.5 3B · INT4 · General' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',     label: 'Phi-3.5 mini · INT4' },
  { id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',     label: 'Llama 3.1 8B · INT4 · Máxima calidad (equipo potente)' },
]

export interface LoadProgress {
  /** 0..1 */
  progress: number
  /** Mensaje legible de la fase actual. */
  text: string
}

/** ¿El navegador soporta WebGPU? Requisito para correr el modelo local. */
export function isWebGPUAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

/** ¿La GPU soporta `shader-f16`? Sin esto, los modelos q4f16 fallan al compilar. */
async function supportsShaderF16(): Promise<boolean> {
  try {
    const adapter = await (navigator as any).gpu?.requestAdapter()
    return !!adapter?.features?.has('shader-f16')
  } catch {
    return false
  }
}

/**
 * Resuelve el modelo efectivo según las capacidades de la GPU.
 * Si el modelo elegido es q4f16 pero la GPU no soporta f16, cae a la variante
 * q4f32 (más compatible, algo más pesada) para evitar el error de ShaderModule.
 */
async function resolveModel(model: string): Promise<string> {
  // Solo se admiten builds INT4 (pesos a 4 bits).
  if (!/q4f(16|32)/.test(model)) {
    throw new Error(`Modelo no permitido: "${model}". Solo se admiten modelos INT4 (q4).`)
  }
  if (model.includes('q4f16') && !(await supportsShaderF16())) {
    return model.replace('q4f16', 'q4f32')
  }
  return model
}

// Singleton: una sola instancia del engine; se recrea si cambia el modelo.
let enginePromise: Promise<MLCEngine> | null = null
let loadedModel = ''

async function getEngine(model: string, onProgress?: (p: LoadProgress) => void): Promise<MLCEngine> {
  const effective = await resolveModel(model)
  if (effective !== model) {
    onProgress?.({ progress: 0, text: `Tu GPU no soporta f16; usando variante compatible (${effective}).` })
  }
  if (enginePromise && loadedModel === effective) return enginePromise

  loadedModel = effective
  // Import dinámico: web-llm es pesado y solo se carga al usar el agente local.
  enginePromise = import('@mlc-ai/web-llm').then((webllm) =>
    webllm.CreateMLCEngine(effective, {
      initProgressCallback: (r) => onProgress?.({ progress: r.progress ?? 0, text: r.text ?? '' }),
    })
  ).catch((err) => {
    // Permitir reintentar tras un fallo (p.ej. red caída a mitad de descarga).
    enginePromise = null
    loadedModel = ''
    throw err
  })

  return enginePromise
}

/** ¿El modelo ya está cargado en memoria (descarga + init completos)? */
export function isModelLoaded(model: string): boolean {
  return loadedModel === model && enginePromise !== null
}

function resetEngine() {
  enginePromise = null
  loadedModel = ''
}

/** Traduce errores de WebGPU/web-llm a un mensaje accionable en español. */
function toFriendlyError(err: any): Error {
  const msg = String(err?.message ?? err)
  if (/DEVICE_REMOVED|requestDevice|command queue|D3D12|DXGI|device lost/i.test(msg)) {
    return new Error(
      'No se pudo inicializar la GPU (el dispositivo WebGPU se perdió: DEVICE_REMOVED). ' +
      'Suele ser un problema de drivers: actualiza los drivers de tu GPU y reinicia el navegador. ' +
      'Si persiste, prueba el modelo Llama 3.2 1B o cambia a Groq (nube) en ajustes.'
    )
  }
  if (/out of memory|OOM|allocation failed|exceeds the limit/i.test(msg)) {
    return new Error(
      'Tu GPU se quedó sin memoria para este modelo. Prueba uno más pequeño (Llama 3.2 1B) en ajustes, ' +
      'o cambia a Groq (nube).'
    )
  }
  if (/ShaderModule|compute stage|createComputePipeline|f16/i.test(msg)) {
    return new Error(
      'Tu GPU no pudo compilar el modelo (driver/hardware limitado). ' +
      'Actualiza los drivers de tu GPU, prueba Llama 3.2 1B, o cambia a Groq (nube).'
    )
  }
  return err instanceof Error ? err : new Error(msg)
}

/** Indica si el error corresponde a un fallo de inicialización de GPU transitorio. */
function isTransientDeviceError(err: any): boolean {
  return /DEVICE_REMOVED|requestDevice|command queue|D3D12|DXGI|device lost/i.test(String(err?.message ?? err))
}

/**
 * Genera una respuesta con el modelo local, con la misma firma que streamGroq.
 * En la primera llamada descarga e inicializa el modelo (onProgress informa el avance).
 */
export async function streamWebLLM(
  model: string,
  messages: Message[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  onProgress?: (p: LoadProgress) => void,
): Promise<void> {
  if (!isWebGPUAvailable()) {
    throw new Error('Tu navegador no soporta WebGPU. Usa Chrome/Edge recientes o cambia a Groq (nube) en ajustes.')
  }

  // 1) Inicializar el engine. DEVICE_REMOVED suele ser transitorio → reintento único.
  let engine: MLCEngine
  try {
    engine = await getEngine(model, onProgress)
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err
    resetEngine()
    if (isTransientDeviceError(err)) {
      try {
        engine = await getEngine(model, onProgress)
      } catch (err2: any) {
        resetEngine()
        throw toFriendlyError(err2)
      }
    } else {
      throw toFriendlyError(err)
    }
  }

  // 2) Generar (streaming).
  try {
    const chunks = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
    })

    for await (const chunk of chunks) {
      if (signal?.aborted) {
        try { await engine.interruptGenerate() } catch {}
        break
      }
      const text = chunk.choices[0]?.delta?.content
      if (text) onChunk(text)
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err
    resetEngine()
    throw toFriendlyError(err)
  }
}
