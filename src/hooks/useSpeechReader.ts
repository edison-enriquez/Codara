import { useState, useRef, useCallback, useEffect } from 'react'
import { resolveVoice } from '../context/VoiceTutorContext'

export interface ReaderState {
  isReading: boolean
  isPaused: boolean
  chunkIndex: number
  /** Posición del siguiente límite de la chunk actual. */
  charIndex: number
  totalChunks: number
}

const IDLE: ReaderState = {
  isReading: false,
  isPaused: false,
  chunkIndex: 0,
  charIndex: 0,
  totalChunks: 0,
}

/**
 * Hook para lectura guiada: habla chunks de texto secuencialmente y reporta
 * el progreso por palabra (charIndex) usando el evento `onboundary` del TTS.
 */
export function useSpeechReader(voiceName: string) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [state, setState] = useState<ReaderState>(IDLE)
  const chunksRef = useRef<string[]>([])
  const idxRef = useRef(0)
  const manualStopRef = useRef(false)
  const pausingRef = useRef(false)

  const speakChunk = useCallback(
    (index: number) => {
      if (!supported) return
      const chunks = chunksRef.current
      if (index >= chunks.length || manualStopRef.current) {
        setState(IDLE)
        return
      }
      idxRef.current = index

      const u = new SpeechSynthesisUtterance(chunks[index])
      const v = resolveVoice(voiceName)
      if (v) u.voice = v
      u.lang = v?.lang ?? 'es-ES'
      u.rate = 0.98
      u.pitch = 1

      u.onboundary = (e) => {
        if (pausingRef.current) return
        if (e.charIndex != null) {
          setState((s) => ({ ...s, charIndex: e.charIndex! }))
        }
      }
      u.onend = () => {
        if (manualStopRef.current) return
        if (pausingRef.current) return
        speakChunk(index + 1)
      }
      u.onerror = () => {
        if (manualStopRef.current) return
        speakChunk(index + 1)
      }

      window.speechSynthesis.speak(u)
      setState({
        isReading: true,
        isPaused: false,
        chunkIndex: index,
        charIndex: 0,
        totalChunks: chunks.length,
      })
    },
    [supported, voiceName]
  )

  const read = useCallback(
    (chunks: string[]) => {
      if (!supported || !chunks.length) return
      manualStopRef.current = false
      pausingRef.current = false
      window.speechSynthesis.cancel()
      chunksRef.current = chunks
      speakChunk(0)
    },
    [supported, speakChunk]
  )

  const pause = useCallback(() => {
    if (!supported) return
    pausingRef.current = true
    window.speechSynthesis.pause()
    setState((s) => ({ ...s, isPaused: true }))
  }, [supported])

  const resume = useCallback(() => {
    if (!supported) return
    pausingRef.current = false
    window.speechSynthesis.resume()
    setState((s) => ({ ...s, isPaused: false }))
  }, [supported])

  const stop = useCallback(() => {
    if (!supported) return
    manualStopRef.current = true
    window.speechSynthesis.cancel()
    setState(IDLE)
  }, [supported])

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel()
  }, [supported])

  return { state, read, pause, resume, stop, supported }
}