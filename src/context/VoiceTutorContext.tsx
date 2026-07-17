import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'

export interface VoiceOption {
  name: string
  lang: string
  /** Heurística de calidad (mayor = más natural). */
  quality: number
}

/** Heurística para puntuar voces según naturalidad (varía mucho por navegador/SO). */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase()
  let score = 0
  // Voces neuronales/online suelen sonar mucho más naturales
  if (/neural|natural|online|premium|enhanced|wavenet/.test(name)) score += 100
  // Voces de Google y Microsoft (Edge/Chrome) suelen ser buenas
  if (/google/.test(name)) score += 80
  if (/microsoft/.test(name)) score += 70
  // Voces locales genéricas (sintetizadores antiguos del SO)
  if (/local/.test(name)) score -= 10
  // Prefiere voces de español
  const base = (v.lang || '').split('-')[0].toLowerCase()
  if (base === 'es') score += 30
  // Penaliza voces sin nombre claro
  if (!v.name) score -= 20
  return score
}

/** Lista las voces españolas disponibles, ordenadas por naturalidad. */
export function listSpanishVoices(): VoiceOption[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  const voices = window.speechSynthesis.getVoices()
  return voices
    .filter((v) => (v.lang || '').toLowerCase().startsWith('es'))
    .map((v) => ({ name: v.name, lang: v.lang, quality: scoreVoice(v) }))
    .sort((a, b) => b.quality - a.quality)
}

const VOICE_KEY = 'codara_voice_name'

export function loadSavedVoice(): string {
  try { return localStorage.getItem(VOICE_KEY) ?? '' } catch { return '' }
}
export function saveVoice(name: string): void {
  try { localStorage.setItem(VOICE_KEY, name) } catch {}
}

/** Resuelve una SpeechSynthesisVoice por nombre, con fallback a la mejor española. */
export function resolveVoice(preferredName?: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const es = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('es'))
  const pool = es.length ? es : voices
  if (preferredName) {
    const exact = voices.find((v) => v.name === preferredName)
    if (exact) return exact
  }
  // Mejor voz por score
  return pool.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? pool[0]
}

// ─── Contexto del tutor ─────────────────────────────────────────────────────

export interface TutorMark {
  text: string
  style: 'highlight' | 'underline'
}

interface VoiceTutorContextValue {
  lessonContent: string
  setLessonContent: (content: string) => void
  open: boolean
  setOpen: (o: boolean) => void
  voiceName: string
  setVoiceName: (name: string) => void
  supported: boolean
  /** Marcas del tutor en el contenido (resaltador + subrayado). */
  marks: TutorMark[]
  setMarks: (m: TutorMark[]) => void
}

const VoiceTutorContext = createContext<VoiceTutorContextValue | null>(null)

export function VoiceTutorProvider({ children }: { children: ReactNode }) {
  const [lessonContent, setLessonContentState] = useState('')
  const [open, setOpen] = useState(false)
  const [voiceName, setVoiceNameState] = useState(loadSavedVoice)
  const [marks, setMarks] = useState<TutorMark[]>([])
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  // Las voces cargan async en algunos navegadores; forzar refresh al cambiar.
  const voicesReady = useRef(false)
  useEffect(() => {
    if (!supported) return
    const refresh = () => { voicesReady.current = true }
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    // Disparar carga
    window.speechSynthesis.getVoices()
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [supported])

  const setLessonContent = useCallback((content: string) => {
    setLessonContentState(content)
  }, [])

  const setVoiceName = useCallback((name: string) => {
    setVoiceNameState(name)
    saveVoice(name)
  }, [])

  // Al montar, si no hay voz guardada, elegir la mejor automáticamente.
  useEffect(() => {
    if (!supported || voiceName) return
    const pick = () => {
      const best = resolveVoice()
      if (best) setVoiceName(best.name)
    }
    pick()
    if (!voicesReady.current) {
      const t = setTimeout(pick, 400)
      return () => clearTimeout(t)
    }
  }, [supported, voiceName])

  return (
    <VoiceTutorContext.Provider value={{
      lessonContent, setLessonContent, open, setOpen, voiceName, setVoiceName, supported,
      marks, setMarks,
    }}>
      {children}
    </VoiceTutorContext.Provider>
  )
}

export function useVoiceTutor() {
  const ctx = useContext(VoiceTutorContext)
  if (!ctx) throw new Error('useVoiceTutor must be inside VoiceTutorProvider')
  return ctx
}