import { useState, useRef, useCallback, useEffect } from 'react'

type SR = typeof window extends { SpeechRecognition: infer T } ? T : any

function getRecognitionCtor(): SR | null {
  if (typeof window === 'undefined') return null
  return (
    (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null
  )
}

export interface UseSpeechRecognitionResult {
  isListening: boolean
  transcript: string
  interim: string
  /** Timestamp (performance.now) del último onresult recibido. 0 si ninguno. */
  lastResultAt: number
  /** ¿El estudiante ha producido texto en esta sesión de escucha? */
  hasSpeech: boolean
  start: () => void
  stop: () => void
  reset: () => void
  /** ¿La escucha terminó naturalmente (onend ya disparado)? */
  ended: boolean
  /** Reinicia el flag `ended` sin tocar transcript. */
  clearEnded: () => void
  supported: boolean
  error: string | null
}

export function useSpeechRecognition(lang = 'es-ES'): UseSpeechRecognitionResult {
  const Ctor = getRecognitionCtor()
  const supportedBool = !!Ctor

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ended, setEnded] = useState(false)
  const [lastResultAt, setLastResultAt] = useState(0)
  const [hasSpeech, setHasSpeech] = useState(false)
  const recRef = useRef<any>(null)

  const start = useCallback(() => {
    if (!Ctor) return
    setError(null)
    setTranscript('')
    setInterim('')
    setEnded(false)
    setLastResultAt(0)
    setHasSpeech(false)
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true // ← mantener escucha hasta que el usuario pare
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onstart = () => setIsListening(true)
    rec.onend = () => {
      setIsListening(false)
      setInterim('')
      setEnded(true) // ← marcador para que el consumer sepa que terminó
    }
    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') return
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Permiso de micrófono denegado.')
      } else {
        setError(e.error ?? 'Error en reconocimiento de voz')
      }
      setIsListening(false)
    }
    rec.onresult = (e: any) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      if (finalText) setTranscript((prev) => (prev ? prev + ' ' : '') + finalText.trim())
      setInterim(interimText)
      // Marca de actividad para que el tutor detecte fin de habla
      setLastResultAt(performance.now())
      if (finalText || interimText) setHasSpeech(true)
    }
    recRef.current = rec
    try {
      rec.start()
    } catch {
      // ya activo
    }
  }, [Ctor, lang])

  const stop = useCallback(() => {
    const rec = recRef.current
    if (rec) {
      try {
        rec.stop() // ← deja que onend dispare setIsListening(false)
      } catch {}
    }
    // NO forzar isListening=false aquí: onend lo hará, evitando la carrera
  }, [])

  const clearEnded = useCallback(() => {
    setEnded(false)
    setTranscript('')
    setInterim('')
    setLastResultAt(0)
    setHasSpeech(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
    setEnded(false)
    setLastResultAt(0)
    setHasSpeech(false)
  }, [])

  useEffect(() => {
    return () => {
      const rec = recRef.current
      if (rec) {
        try {
          rec.abort()
        } catch {}
      }
    }
  }, [])

  return { isListening, transcript, interim, lastResultAt, hasSpeech, start, stop, reset, ended, clearEnded, supported: supportedBool, error }
}