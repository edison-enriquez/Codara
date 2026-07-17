import { useState, useRef, useCallback, useEffect } from 'react'

export interface UseVADResult {
  /** El micrófono está activo y midiendo. */
  active: boolean
  /** Se detectó voz en este momento. */
  speaking: boolean
  /** Nivel de volumen normalizado 0..1. */
  level: number
  /** Inicia la captura del micrófono (pide permiso). */
  start: () => Promise<void>
  /** Detiene la captura. */
  stop: () => void
  supported: boolean
}

const SILENCE_MS = 1200   // ms sin superar el umbral para considerar "dejó de hablar"
const ENERGY_THRESH = 0.08

/**
 * Detección de actividad de voz (VAD) simple basada en la amplitud RMS del
 * micrófono, usando la Web Audio API. No hace transcripción — solo reporta
 * si hay voz y el nivel de volumen para animar el orbe.
 */
export function useVAD(): UseVADResult {
  const supported = typeof window !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && !!window.AudioContext

  const [active, setActive] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [level, setLevel] = useState(0)

  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastSpeakRef = useRef<number>(0)
  const speakingRef = useRef(false)

  const tick = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const buf = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / buf.length)
    // Normalizar a 0..1 con curva para sensibilidad
    const lvl = Math.min(1, rms * 3)
    setLevel(lvl)

    const now = performance.now()
    if (lvl > ENERGY_THRESH) {
      lastSpeakRef.current = now
      if (!speakingRef.current) {
        speakingRef.current = true
        setSpeaking(true)
      }
    } else if (speakingRef.current && now - lastSpeakRef.current > SILENCE_MS) {
      speakingRef.current = false
      setSpeaking(false)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(async () => {
    if (!supported) return
    if (active) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      streamRef.current = stream
      const AC = window.AudioContext ?? (window as any).webkitAudioContext
      const ctx = new AC()
      ctxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.6
      src.connect(analyser)
      analyserRef.current = analyser
      setActive(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch (e) {
      console.error('VAD: no se pudo acceder al micrófono', e)
    }
  }, [supported, active, tick])

  const stop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (ctxRef.current) {
      try { ctxRef.current.close() } catch {}
      ctxRef.current = null
    }
    analyserRef.current = null
    setActive(false)
    setSpeaking(false)
    setLevel(0)
    speakingRef.current = false
  }, [])

  useEffect(() => () => { stop() }, [stop])

  return { active, speaking, level, start, stop, supported }
}