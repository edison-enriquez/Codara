import { useState, useEffect } from 'react'
import { useVoiceTutor, listSpanishVoices, resolveVoice, type VoiceOption } from '../context/VoiceTutorContext'
import { Volume2, Square } from 'lucide-react'

/** Selector de voz con preview (escucha). */
export default function VoicePicker() {
  const { voiceName, setVoiceName, supported } = useVoiceTutor()
  const [voices, setVoices] = useState<VoiceOption[]>([])

  useEffect(() => {
    if (!supported) return
    const load = () => setVoices(listSpanishVoices())
    load()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', load)
      return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
    }
  }, [supported])

  const preview = (name: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const v = resolveVoice(name)
    const u = new SpeechSynthesisUtterance('Hola, soy tu tutor de voz. ¿Listo para empezar?')
    if (v) u.voice = v
    u.lang = v?.lang ?? 'es-ES'
    u.rate = 0.98
    window.speechSynthesis.speak(u)
  }

  const stopPreview = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  if (!supported) return null
  if (!voices.length) {
    return <p className="text-[11px] text-muted">No se encontraron voces en español en este navegador.</p>
  }

  return (
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-wider text-muted">Voz del tutor</label>
      <div className="flex gap-2">
        <select
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          className="flex-1 rounded border border-border bg-base px-2 py-1.5 text-xs text-text focus:border-purple/50 focus:outline-none"
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} {v.quality >= 100 ? '★' : v.quality >= 70 ? '·' : ''}
            </option>
          ))}
        </select>
        <button
          onClick={() => preview(voiceName || voices[0].name)}
          className="flex items-center gap-1 rounded border border-border px-2 py-1.5 text-xs text-muted hover:border-purple/40 hover:text-text transition-colors"
          title="Escuchar muestra"
        >
          <Volume2 size={11} />
        </button>
        <button
          onClick={stopPreview}
          className="flex items-center gap-1 rounded border border-border px-2 py-1.5 text-xs text-muted hover:border-red/40 hover:text-red transition-colors"
          title="Detener muestra"
        >
          <Square size={10} />
        </button>
      </div>
      <p className="text-[10px] text-muted/70">
        Las voces con ★ suelen sonar más naturales (neuronales). En Chrome/Edge hay mejores voces si instalas paquetes de idioma del SO.
      </p>
    </div>
  )
}