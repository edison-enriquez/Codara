import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Mic, MicOff, Volume2, Loader2, X, Headphones,
} from 'lucide-react'
import { useAgent } from '../context/AgentContext'
import { useVoiceTutor, resolveVoice } from '../context/VoiceTutorContext'
import { completeLLM, type Message, type LoadProgress } from '../utils/llmClient'
import { extractReadableChunks } from '../utils/speechText'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import VoicePicker from './VoicePicker'

type Mode =
  | 'idle'
  | 'thinking'          // LLM pensando (generar pregunta o responder)
  | 'speaking'          // TTS hablando (pregunta o respuesta del tutor)
  | 'listening'         // escuchando la respuesta del estudiante
  | 'finished'          // ronda terminada, listo para otra

interface ChatTurn {
  role: 'tutor' | 'student'
  text: string
}

const SYSTEM = `Eres un tutor de programación que da clases por voz en español.
Conduces una conversación oral con el estudiante basándote en el contenido de la lección.

Reglas:
- Cuando formules una pregunta, hazla abierta y de respuesta corta.
- Cuando el estudiante responda, evalúa su comprensión y responde de forma natural.
- Si la respuesta es correcta, felicita brevemente y haz una pregunta de seguimiento sobre otro punto de la lección o más profundo.
- Si la respuesta es incorrecta o incompleta, corrige con tono amable en una o dos frases y reformula la pregunta o haz una más sencilla.
- Sé breve, claro y alentador. Usa lenguaje sencillo.
- Responde SIEMPRE en español, en texto plano (sin JSON, sin markdown, sin numeración).`

function speak(text: string, voiceName: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const v = resolveVoice(voiceName)
  if (v) u.voice = v
  u.lang = v?.lang ?? 'es-ES'
  u.rate = 0.98
  u.pitch = 1
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  window.speechSynthesis.speak(u)
}

/** Botón flotante + panel lateral deslizable. Se renderiza globalmente. */
export default function VoiceTutor() {
  const { config, isConfigured, openSettings } = useAgent()
  const { lessonContent, open, setOpen, voiceName, supported: ttsSupported } = useVoiceTutor()
  const sr = useSpeechRecognition('es-ES')

  const [mode, setMode] = useState<Mode>('idle')
  const [chat, setChat] = useState<ChatTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [modelLoad, setModelLoad] = useState<LoadProgress | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const stoppingRef = useRef(false)
  const lessonCtxRef = useRef<string>('')
  const configRef = useRef(config)
  configRef.current = config
  const chatRef = useRef<ChatTurn[]>([])
  const voiceNameRef = useRef(voiceName)
  voiceNameRef.current = voiceName

  const sttSupported = sr.supported

  useEffect(() => {
    lessonCtxRef.current = extractReadableChunks(lessonContent).join('\n\n').slice(0, 6000)
  }, [lessonContent])

  useEffect(() => () => {
    abortRef.current?.abort()
    if (ttsSupported) window.speechSynthesis.cancel()
  }, [ttsSupported])

  const stopAll = useCallback(() => {
    stoppingRef.current = true
    abortRef.current?.abort()
    if (ttsSupported) window.speechSynthesis.cancel()
    sr.stop()
    setMode('idle')
    setModelLoad(null)
  }, [sr, ttsSupported])

  // Al cerrar el panel: detener todo en marcha.
  useEffect(() => {
    if (!open) stopAll()
  }, [open, stopAll])

  // Construye los mensajes del LLM a partir del historial del chat.
  function buildLLMMessages(userText?: string): Message[] {
    const msgs: Message[] = [{ role: 'system', content: SYSTEM }]
    const ctx = `\n\n--- CONTENIDO DE LA LECCIÓN ---\n"""${lessonCtxRef.current}"""\n`
    msgs[0].content += ctx
    for (const turn of chatRef.current) {
      msgs.push({
        role: turn.role === 'tutor' ? 'assistant' : 'user',
        content: turn.text,
      })
    }
    if (userText) msgs.push({ role: 'user', content: userText })
    return msgs
  }

  // ── Iniciar conversación: generar primera pregunta ────────────────────────
  const startTutoring = useCallback(async () => {
    if (!isConfigured) return
    stoppingRef.current = false
    setChat([])
    chatRef.current = []
    setError(null)
    setModelLoad(null)
    setMode('thinking')

    const messages = buildLLMMessages(
      'Inicia la tutoría. Formula UNA pregunta abierta para evaluar mi comprensión de la lección. Responde SOLO con la pregunta, nada más.'
    )

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    try {
      const text = (await completeLLM(
        configRef.current, messages, abortRef.current.signal,
        (p) => setModelLoad(p.progress >= 1 ? null : p)
      )).trim().replace(/^["“'"']+|["”'"']+$/g, '')

      if (stoppingRef.current) return
      chatRef.current = [...chatRef.current, { role: 'tutor', text }]
      setChat([...chatRef.current])
      setMode('speaking')
      speak(text, voiceNameRef.current, () => {
        if (!stoppingRef.current) {
          setMode('listening')
          sr.clearEnded()
          sr.reset()
          setTimeout(() => sr.start(), 80)
        }
      })
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message ?? 'Error al iniciar la tutoría')
        setMode('idle')
      }
    }
  }, [isConfigured, sr, voiceName])

  // ── Cuando el STT termina → enviar la respuesta del estudiante al LLM ────
  useEffect(() => {
    if (mode !== 'listening') return
    if (sr.isListening) return // aún escuchando
    if (!sr.ended) return // onend aún no ha disparado

    const ans = sr.transcript.trim()

    if (!ans) {
      // No capturó nada: permitir al usuario reintentar en vez de colgarse
      setError('No te escuché. Pulsa el botón para responder de nuevo.')
      setMode('finished')
      return
    }

    // Guardar la respuesta del estudiante en el historial
    chatRef.current = [...chatRef.current, { role: 'student', text: ans }]
    setChat([...chatRef.current])
    setMode('thinking')
    setError(null)

    ;(async () => {
      const messages = buildLLMMessages(
        'Esta es mi respuesta (transcrita de voz, puede tener errores): ' + ans
      )
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      setModelLoad(null)
      try {
        const text = (await completeLLM(
          configRef.current, messages, abortRef.current.signal,
          (p) => setModelLoad(p.progress >= 1 ? null : p)
        )).trim().replace(/^["“'"']+|["”'"']+$/g, '')

        if (stoppingRef.current) return
        chatRef.current = [...chatRef.current, { role: 'tutor', text }]
        setChat([...chatRef.current])
        setMode('speaking')
        speak(text, voiceNameRef.current, () => {
          if (!stoppingRef.current) {
            setMode('listening')
            sr.clearEnded()
            sr.reset()
            setTimeout(() => sr.start(), 80)
          }
        })
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setError(e.message ?? 'Error al procesar la respuesta')
          setMode('idle')
        }
      }
    })()
  }, [mode, sr.isListening, sr.ended, sr.transcript])

  // ── Render ────────────────────────────────────────────────────────────────
  if (!ttsSupported || !lessonContent.trim()) return null

  const busy = mode === 'thinking'
  const speaking = mode === 'speaking'
  const listening = mode === 'listening' && sr.isListening

  const handleMainClick = () => {
    if (!isConfigured) {
      openSettings()
      return
    }
    if (mode === 'idle' || mode === 'finished') {
      if (error && !sr.transcript) { sr.clearEnded(); sr.reset() }
      startTutoring()
    } else if (listening) {
      sr.stop()
    } else if (mode === 'listening' && !sr.isListening) {
      // El STT terminó sin captura, reintentar
      sr.clearEnded()
      sr.reset()
      sr.start()
    } else {
      stopAll()
    }
  }

  const mainLabel = !isConfigured
    ? 'Configurar agente IA'
    : mode === 'idle'
      ? (chat.length > 0 ? 'Reanudar tutoría' : 'Empezar tutoría')
      : mode === 'finished'
        ? 'Responder de nuevo'
        : listening
          ? 'Terminé de hablar'
          : busy
            ? 'Pensando…'
            : speaking
              ? 'Hablando…'
              : 'Detener'

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-purple/40 bg-surface text-purple shadow-lg shadow-purple/10 hover:bg-purple/10 hover:border-purple transition-colors"
        title="Tutor de voz"
        aria-label="Abrir tutor de voz"
      >
        <Headphones size={20} />
      </button>

      {/* Overlay (solo móvil: en escritorio no bloquea el contenido) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel lateral */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Headphones size={15} className="text-purple" />
            <span className="text-sm font-semibold text-text">Tutor de voz</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-elevated hover:text-text transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Selector de voz */}
          <VoicePicker />

          {/* ── Tutoría: conversación multi-turno por voz ── */}
          <>
            {!isConfigured && (
              <div className="mb-4 mt-4 rounded-lg border border-yellow/20 bg-yellow/5 p-3 text-xs text-text/80">
                Para iniciar una tutoría por voz, primero configura el agente IA (Groq o modelo local).
              </div>
            )}

              {/* Intro cuando no hay conversación */}
              {mode === 'idle' && chat.length === 0 && (
                <div className="rounded-lg border border-border bg-base p-4 text-center text-xs text-muted">
                  Pulsa <span className="font-semibold text-purple">Empezar tutoría</span> y el agente iniciará una conversación: formulará una pregunta, escuchará tu respuesta y continuará el diálogo basándose en lo que digas.
                </div>
              )}

              {/* Historial de conversación */}
              {chat.length > 0 && (
                <div className="space-y-3">
                  {chat.map((turn, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 ${
                        turn.role === 'tutor'
                          ? 'border-purple/20 bg-purple/5'
                          : 'border-blue/20 bg-blue/5'
                      }`}
                    >
                      <p className={`mb-1 text-[10px] uppercase tracking-wider ${
                        turn.role === 'tutor' ? 'text-purple/70' : 'text-blue/70'
                      }`}>
                        {turn.role === 'tutor' ? 'Tutor' : 'Tú'}
                      </p>
                      <p className="text-sm leading-6 text-text/90">{turn.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Indicador de que el tutor está hablando */}
              {speaking && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-green/20 bg-green/5 px-3 py-2 text-xs text-green">
                  <Volume2 size={12} className="animate-pulse" />
                  {modelLoad ? 'Preparando respuesta…' : 'El tutor está hablando…'}
                </div>
              )}

              {/* Indicador de escucha */}
              {mode === 'listening' && (
                <div className="mt-3 rounded-lg border border-red/20 bg-red/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-red/70">Tu respuesta</p>
                  <p className="mt-1 text-sm leading-6 text-text/90">
                    {sr.transcript || sr.interim || (sr.isListening
                      ? <span className="text-muted italic">Escuchando… habla ahora</span>
                      : <span className="text-muted italic">Procesando…</span>)}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red">
                    {sr.isListening && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red" />}
                    {sr.isListening ? 'Te escucho — pulsa “Terminé de hablar” cuando acabes' : ''}
                  </div>
                </div>
              )}

              {/* Carga del modelo local */}
              {modelLoad && busy && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-cyan/20 bg-cyan/5 p-3 text-xs text-cyan">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
                  {Math.round((modelLoad.progress ?? 0) * 100)}% · {modelLoad.text ?? 'Cargando modelo local…'}
                </div>
              )}

              {/* Pensando */}
              {busy && !modelLoad && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                  <Loader2 size={12} className="animate-spin" />
                  El tutor está pensando…
                </div>
              )}

              {error && <p className="mt-3 text-[11px] text-red">⚠ {error}</p>}
              {sttSupported === false && mode !== 'idle' && (
                <p className="mt-3 text-[11px] text-muted">El reconocimiento de voz no está disponible en este navegador. Usa Chrome o Edge.</p>
              )}
          </>
        </div>

        {/* Footer con acción principal */}
        <div className="border-t border-border p-4">
          <button
            onClick={handleMainClick}
            disabled={busy}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
              listening
                ? 'border-red/50 bg-red/10 text-red hover:bg-red/20'
                : 'border-purple/40 bg-purple/10 text-purple hover:bg-purple/20'
            }`}
          >
            {busy ? <Loader2 size={15} className="animate-spin" />
              : listening ? <MicOff size={15} />
              : <Mic size={15} />}
            <Volume2 size={15} />
            <span>{mainLabel}</span>
          </button>
        </div>
      </aside>
    </>
  )
}