import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Mic, MicOff, Volume2, Loader2, X, CheckCircle2, XCircle, RefreshCw, Headphones,
} from 'lucide-react'
import { useAgent } from '../context/AgentContext'
import { useVoiceTutor, resolveVoice } from '../context/VoiceTutorContext'
import { completeLLM, type Message, type LoadProgress } from '../utils/llmClient'
import { extractReadableChunks } from '../utils/speechText'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import VoicePicker from './VoicePicker'

type Mode = 'idle' | 'thinking-q' | 'speaking-q' | 'listening' | 'thinking-eval' | 'speaking-eval' | 'finished'

interface EvalResult {
  correct: boolean
  feedback: string
}

const SYSTEM = 'Eres un tutor de programación que da clases por voz en español. Formulas preguntas de comprensión basadas en el contenido de la lección y evalúas las respuestas verbales del estudiante. Sé claro, breve y alentador. Usa lenguaje sencillo.'

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

function parseEval(raw: string): EvalResult | null {
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const o = JSON.parse(m[0])
    if (typeof o.correct === 'boolean' && typeof o.feedback === 'string') {
      return { correct: o.correct, feedback: o.feedback }
    }
  } catch {}
  return null
}

/** Botón flotante + panel lateral deslizable. Se renderiza globalmente. */
export default function VoiceTutor() {
  const { config, isConfigured, openSettings } = useAgent()
  const { lessonContent, open, setOpen, voiceName, supported: ttsSupported } = useVoiceTutor()
  const sr = useSpeechRecognition('es-ES')

  const [mode, setMode] = useState<Mode>('idle')
  const [question, setQuestion] = useState('')
  const [lastAnswer, setLastAnswer] = useState('')
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [modelLoad, setModelLoad] = useState<LoadProgress | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const stoppingRef = useRef(false)
  const lessonCtxRef = useRef<string>('')
  const configRef = useRef(config)
  configRef.current = config

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
  }, [sr, ttsSupported])

  // Al cerrar el panel: detener todo en marcha.
  useEffect(() => {
    if (!open) stopAll()
  }, [open, stopAll])

  // ── Generar pregunta ──────────────────────────────────────────────────────
  const askQuestion = useCallback(async () => {
    if (!isConfigured) return
    stoppingRef.current = false
    setEvalResult(null)
    setLastAnswer('')
    setError(null)
    setModelLoad(null)
    sr.reset()
    setMode('thinking-q')

    const messages: Message[] = [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `Basándote en el siguiente contenido de la lección, formula UNA pregunta para evaluar si el estudiante lo comprendió. La pregunta debe ser abierta, de respuesta corta (no verdadero/falso, ni opción múltiple). Contesta SOLO con la pregunta en español, sin numeración, sin comillas ni texto adicional.\n\nContenido de la lección:\n"""${lessonCtxRef.current}"""`,
      },
    ]

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    try {
      const q = (await completeLLM(configRef.current, messages, abortRef.current.signal, (p) => setModelLoad(p.progress >= 1 ? null : p))).trim().replace(/^["“'"']+|["”'"']+$/g, '')
      if (stoppingRef.current) return
      setQuestion(q)
      setRound((r) => r + 1)
      setMode('speaking-q')
      speak(q, voiceName, () => {
        if (!stoppingRef.current) {
          setMode('listening')
          setTimeout(() => sr.start(), 60)
        }
      })
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message ?? 'Error al generar la pregunta')
        setMode('idle')
      }
    }
  }, [isConfigured, sr, voiceName])

  // ── Cuando termina de escuchar → evaluar respuesta ────────────────────────
  useEffect(() => {
    if (mode !== 'listening') return
    if (sr.isListening) return
    const ans = sr.transcript.trim()
    if (!ans) return
    setLastAnswer(ans)
    setMode('thinking-eval')

    ;(async () => {
      const messages: Message[] = [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Evalúa la respuesta del estudiante según el contenido de la lección.\n\nContenido de la lección:\n"""${lessonCtxRef.current}"""\n\nPregunta formulada: ${question}\n\nRespuesta del estudiante (transcrita de voz, puede tener errores de transcripción): ${ans}\n\nDevuelve SOLO un JSON válido, sin markdown:\n{\n  "correct": true|false,\n  "feedback": "frase breve en español: primero felicita si acertó o corrige con tono amable si no, después aclara el punto clave en una o dos frases."\n}`,
        },
      ]
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      setModelLoad(null)
      try {
        const raw = await completeLLM(configRef.current, messages, abortRef.current.signal, (p) => setModelLoad(p.progress >= 1 ? null : p))
        if (stoppingRef.current) return
        let ev = parseEval(raw)
        if (!ev) {
          ev = {
            correct: false,
            feedback: raw.trim().slice(0, 240) || 'No pude evaluar la respuesta.',
          }
        }
        setEvalResult(ev)
        setMode('speaking-eval')
        speak(ev.feedback, voiceName, () => {
          if (!stoppingRef.current) setMode('finished')
        })
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setError(e.message ?? 'Error al evaluar la respuesta')
          setMode('idle')
        }
      }
    })()
  }, [mode, sr.isListening, sr.transcript, question, voiceName])

  // ── Render ────────────────────────────────────────────────────────────────
  if (!ttsSupported || !lessonContent.trim()) return null

  const busy = mode === 'thinking-q' || mode === 'thinking-eval'
  const speaking = mode === 'speaking-q' || mode === 'speaking-eval'
  const listening = mode === 'listening' && sr.isListening

  const handleMainClick = () => {
    if (!isConfigured) {
      openSettings()
      return
    }
    if (mode === 'idle' || mode === 'finished') {
      askQuestion()
    } else if (listening) {
      sr.stop()
    } else if (mode === 'listening' && !sr.isListening) {
      sr.reset()
      sr.start()
    } else {
      stopAll()
    }
  }

  const mainLabel = !isConfigured
    ? 'Configurar agente IA'
    : mode === 'idle'
      ? 'Empezar tutoría'
      : mode === 'finished'
        ? 'Otra pregunta'
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

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:bg-transparent"
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
          {/* Configuración de voz */}
          {!isConfigured && (
            <div className="mb-4 rounded-lg border border-yellow/20 bg-yellow/5 p-3 text-xs text-text/80">
              Para iniciar una tutoría por voz, primero configura el agente IA (Groq o modelo local).
            </div>
          )}
          <VoicePicker />

          <div className="my-4 h-px bg-border" />

          {/* Estado principal */}
          {(mode === 'idle' || mode === 'finished') && (
            <div className="rounded-lg border border-border bg-base p-4 text-center text-xs text-muted">
              Pulsa <span className="font-semibold text-purple">Empezar tutoría</span> y el agente formulará una pregunta sobre esta lección, la leerá en voz alta y evaluará tu respuesta hablada.
            </div>
          )}

          {/* Pregunta */}
          {question && (busy || speaking || mode === 'listening' || mode === 'finished') && (
            <div className="rounded-lg border border-purple/20 bg-purple/5 p-3">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-purple/70">Pregunta</p>
              {mode === 'thinking-q'
                ? <span className="text-xs text-muted">Generando pregunta…</span>
                : <p className="text-sm leading-6 text-text/90">{question}</p>}
            </div>
          )}

          {/* Escuchando */}
          {mode === 'listening' && (
            <div className="mt-3 rounded-lg border border-red/20 bg-red/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-red/70">Tu respuesta</p>
              <p className="mt-1 text-sm leading-6 text-text/90">
                {sr.transcript || sr.interim || <span className="text-muted italic">Escuchando…</span>}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red">
                {sr.isListening && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red" />}
                {sr.isListening ? 'Te escucho' : 'Pulsa “Terminé de hablar”'}
              </div>
            </div>
          )}

          {/* Respuesta eval */}
          {(mode === 'thinking-eval' || mode === 'speaking-eval' || mode === 'finished') && lastAnswer && (
            <div className="mt-3 rounded-lg border border-blue/20 bg-blue/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-blue/70">Tu respuesta</p>
              <p className="mt-1 text-sm leading-6 text-text/90">{lastAnswer}</p>
            </div>
          )}

          {/* Evaluación */}
          {evalResult && mode === 'finished' && (
            <div className={`mt-3 rounded-lg border p-3 ${evalResult.correct ? 'border-green/30 bg-green/10' : 'border-orange/30 bg-orange/10'}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {evalResult.correct ? <CheckCircle2 size={16} className="text-green" /> : <XCircle size={16} className="text-orange" />}
                <span className={evalResult.correct ? 'text-green' : 'text-orange'}>
                  {evalResult.correct ? '¡Correcto!' : 'A revisar'}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-text/90">{evalResult.feedback}</p>
            </div>
          )}

          {/* Carga del modelo local */}
          {modelLoad && (mode === 'thinking-q' || mode === 'thinking-eval') && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-cyan/20 bg-cyan/5 p-3 text-xs text-cyan">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
              {Math.round((modelLoad.progress ?? 0) * 100)}% · {modelLoad.text ?? 'Cargando modelo local…'}
            </div>
          )}

          {error && <p className="mt-3 text-[11px] text-red">⚠ {error}</p>}
          {sttSupported === false && mode !== 'idle' && (
            <p className="mt-3 text-[11px] text-muted">El reconocimiento de voz no está disponible en este navegador.</p>
          )}

          {/* Contador de rondas */}
          {round > 0 && (
            <p className="mt-4 flex items-center gap-1 text-[10px] tabular-nums text-muted/70">
              <RefreshCw size={9} /> Ronda {round}
            </p>
          )}
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