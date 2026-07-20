/**
 * Telemetría del harness: contadores de salud del agente tutor.
 *
 * Sin métricas, cada cambio de prompt/modelo es una apuesta. Estos contadores
 * responden: ¿cuánto falla el parseo? ¿cuánto repara el reintento? ¿cuántas
 * marcas inventa el modelo? ¿cuántas veces el gate bloquea un avance?
 *
 * Se persisten en localStorage y se exponen en `window.__codaraHarness`
 * para inspección manual desde la consola del navegador.
 */

export interface HarnessMetrics {
  /** Turnos del tutor procesados por el harness. */
  turns: number
  /** Llamadas que pidieron salida estructurada nativa al proveedor. */
  structuredOutputRequests: number
  /** Respuestas que no cumplieron el contrato (disparan reintento). */
  parseFailures: number
  /** Reintentos con feedback realizados. */
  retries: number
  /** Reintentos que lograron una respuesta válida. */
  retrySuccesses: number
  /** Turnos salvados por reparación (JSON truncado) o fallback de texto crudo. */
  repairedOutputs: number
  fallbackUsed: number
  /** Marcas rechazadas por no ser citas exactas de la lección. */
  marksRejected: number
  /** Llamadas a herramientas ejecutadas por el harness / con error. */
  toolCalls: number
  toolErrors: number
  /** Avances de lección permitidos / bloqueados por el gate. */
  advanceAllowed: number
  advanceBlocked: number
}

const STORAGE_KEY = 'codara_harness_metrics'

function emptyMetrics(): HarnessMetrics {
  return {
    turns: 0,
    structuredOutputRequests: 0,
    parseFailures: 0,
    retries: 0,
    retrySuccesses: 0,
    repairedOutputs: 0,
    fallbackUsed: 0,
    marksRejected: 0,
    toolCalls: 0,
    toolErrors: 0,
    advanceAllowed: 0,
    advanceBlocked: 0,
  }
}

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

let metrics: HarnessMetrics = (() => {
  if (!storageAvailable()) return emptyMetrics()
  try {
    return { ...emptyMetrics(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    return emptyMetrics()
  }
})()

function persist(): void {
  if (!storageAvailable()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics))
  } catch {}
}

export function recordMetric(key: keyof HarnessMetrics, by = 1): void {
  metrics[key] += by
  persist()
}

export function getHarnessMetrics(): HarnessMetrics {
  return { ...metrics }
}

export function resetHarnessMetrics(): void {
  metrics = emptyMetrics()
  persist()
}

// Inspección manual: `__codaraHarness.getMetrics()` en la consola del navegador.
if (typeof window !== 'undefined') {
  ;(window as any).__codaraHarness = { getMetrics: getHarnessMetrics, reset: resetHarnessMetrics }
}
