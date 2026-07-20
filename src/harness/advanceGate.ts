/**
 * Gate de avance de lección.
 *
 * El modelo PROPONE (`advance: true`); el harness DISPONE. Avanzar de lección
 * es una decisión con efectos reales (marca progreso, navega), así que la toma
 * una regla determinista con evidencia, no el criterio del modelo:
 *
 *   permitido ⇔ el estudiante pidió continuar explícitamente
 *             ∨ el modelo evaluó su última respuesta como correcta
 */
import type { Verdict } from './tutorSchema'

export interface GateEvidence {
  /** El modelo pidió avanzar (advance: true). */
  requested: boolean
  /** Texto de la última intervención del estudiante. */
  studentText: string
  /** Nº de turnos del estudiante en la sesión actual. */
  studentTurns: number
  /** Veredicto del modelo sobre la última respuesta del estudiante. */
  lastVerdict: Verdict | null
}

export interface GateDecision {
  allowed: boolean
  /** 'not-requested' | 'explicit-continue' | 'comprehension-evidence' | 'insufficient-evidence' */
  reason: string
}

const CONTINUE_RE =
  /\b(continuar|continúa|continua|continuemos|siguiente|avanzar|avanza|avancemos|adelante|pasar|pasemos|seguir|seguimos|proseguir)\b/i

/** ¿El estudiante pidió explícitamente pasar a lo siguiente? */
export function studentAsksToContinue(text: string): boolean {
  return CONTINUE_RE.test(text)
}

export function decideAdvance(ev: GateEvidence): GateDecision {
  if (!ev.requested) return { allowed: false, reason: 'not-requested' }
  if (studentAsksToContinue(ev.studentText)) return { allowed: true, reason: 'explicit-continue' }
  if (ev.lastVerdict === 'correct' && ev.studentTurns >= 1) {
    return { allowed: true, reason: 'comprehension-evidence' }
  }
  return { allowed: false, reason: 'insufficient-evidence' }
}
