/**
 * Contador de "passed" (cuántas veces se ha resuelto cada reto).
 *
 * Codara es estático (GitHub Pages), así que el contador vive en el backend
 * opcional (server/sandbox.mjs) apuntado por VITE_SERVER_URL. Si no está
 * configurado o no responde, todo degrada de forma silenciosa: las funciones
 * devuelven vacío y la columna "passed" simplemente no se muestra.
 *
 * Nota: hoy el incremento es anónimo (sin cuentas de usuario). Cuando se
 * implementen usuarios, conviene contar resoluciones únicas por usuario.
 */

const BASE = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, '')
const SENT_KEY = 'codara_passed_sent'

export function countsConfigured(): boolean {
  return !!BASE
}

/** Devuelve { [lessonId]: count } para un curso. Vacío si no hay backend. */
export async function fetchCounts(courseId: string): Promise<Record<string, number>> {
  if (!BASE) return {}
  try {
    const res = await fetch(`${BASE}/api/counts?course=${encodeURIComponent(courseId)}`)
    if (!res.ok) return {}
    const data = await res.json()
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

/** Reporta una resolución (incrementa el contador). Solo una vez por reto por navegador. */
export async function reportPassed(courseId: string, lessonId: string): Promise<void> {
  if (!BASE) return
  let sent: Record<string, boolean> = {}
  try { sent = JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}') } catch {}
  const key = `${courseId}/${lessonId}`
  if (sent[key]) return
  try {
    const res = await fetch(`${BASE}/api/counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course: courseId, lesson: lessonId }),
    })
    if (res.ok) {
      sent[key] = true
      localStorage.setItem(SENT_KEY, JSON.stringify(sent))
    }
  } catch {
    /* sin red: se reintentará la próxima vez */
  }
}
