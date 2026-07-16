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
  start: () => void
  stop: () => void
  reset: () => void
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
  const recRef = useRef<any>(null)

  const start = useCallback(() => {
    if (!Ctor) return
    setError(null)
    setTranscript('')
    setInterim('')
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onstart = () => setIsListening(true)
    rec.onend = () => {
      setIsListening(false)
      setInterim('')
    }
    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') {
        // silencio: dejar que onend cierre
        return
      }
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
        rec.stop()
      } catch {}
    }
    setIsListening(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
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

  return { isListening, transcript, interim, start, stop, reset, supported: supportedBool, error }
}