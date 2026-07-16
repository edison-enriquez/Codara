import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Mic, MicOff, Volume2, VolumeX, Loader2, MessageSquare, X, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react'
import { useAgent } from '../context/AgentContext'
import { completeLLM, type Message, type LoadProgress } from '../utils/llmClient'
import { extractReadableChunks } from '../utils/speechText'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

interface Props {
  content: string // lesson displayContent (markdown)
}

type Mode = 'idle' | 'thinking-q' | 'speaking-q' | 'listening' | 'thinking-eval' | 'speaking-eval' | 'finished'

interface EvalResult {
  correct: boolean
  feedback: string
}

const SYSTEM = 'Eres un tutor de programación que da clases por voz en español. Formulas preguntas de comprensión basadas en el contenido de la lección y evalúas las respuestas verbales del estudiante. Sé claro, breve y alentador. Usa lenguaje sencillo.'

function speak(text: string, lang: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 1
  u.pitch = 1
  const voices = window.speechSynthesis.getVoices()
  const base = lang.split('-')[0].toLowerCase()
  const v = voices.find((vo) => vo.lang.split('-')[0].toLowerCase() === base) ?? voices[0]
  if (v) u.voice = v
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

export default function VoiceTutor({ content }: Props) {
  const { config, isConfigured, openSettings } = useAgent()
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

  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const sttSupported = sr.supported

  useEffect(() => {
    lessonCtxRef.current = extractReadableChunks(content).join('\n\n').slice(0, 6000)
  }, [content])

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

  // ── Generar pregunta ──────────────────────────────────────────────────────
  const askQuestion = useCallback(async () => {
    if (!isConfigured) return
    stoppingRef.current = false
    setEvalResult(null)
    setLastAnswer('')
    setError(null)
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
    setModelLoad(null)
    try {
      const q = (await completeLLM(config, messages, abortRef.current.signal, (p) => setModelLoad(p.progress >= 1 ? null : p))).trim().replace(/^["“'"']+|["”'"']+$/g, '')
      if (stoppingRef.current) return
      setQuestion(q)
      setRound((r) => r + 1)
      setMode('speaking-q')
      speak(q, 'es-ES', () => {
        if (!stoppingRef.current) {
          setMode('listening')
          // arrancar STT justo cuando termina la TTS
          setTimeout(() => sr.start(), 60)
        }
      })
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message ?? 'Error al generar la pregunta')
        setMode('idle')
      }
    }
  }, [config, isConfigured, sr])

  // ── Cuando termina de escuchar → evaluar respuesta ────────────────────────
  useEffect(() => {
    if (mode !== 'listening') return
    if (sr.isListening) return
    const ans = sr.transcript.trim()
    if (!ans) {
      // silencio / sin captura: re-preguntar una vez o volver a escuchar
      return
    }
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
        const raw = await completeLLM(config, messages, abortRef.current.signal, (p) => setModelLoad(p.progress >= 1 ? null : p))
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
        speak(ev.feedback, 'es-ES', () => {
          if (!stoppingRef.current) setMode('finished')
        })
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setError(e.message ?? 'Error al evaluar la respuesta')
          setMode('idle')
        }
      }
    })()
  }, [mode, sr.isListening, sr.transcript, question, config])

  // ── Render ────────────────────────────────────────────────────────────────
  if (!ttsSupported) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted" title="Tu navegador no soporta síntesis de voz">
        <VolumeX size={12} />
        <span>Voz no disponible</span>
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <button
        onClick={openSettings}
        className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs text-muted hover:border-green/40 hover:text-text transition-colors"
        title="Configura el agente IA para activar el tutor de voz"
      >
        <MessageSquare size={11} />
        <span>Tutor de voz (requiere Agente IA)</span>
      </button>
    )
  }

  const busy = mode === 'thinking-q' || mode === 'thinking-eval'
  const speaking = mode === 'speaking-q' || mode === 'speaking-eval'
  const listening = mode === 'listening' && sr.isListening

  const handleMainClick = () => {
    if (mode === 'idle' || mode === 'finished') {
      askQuestion()
    } else if (listening) {
      sr.stop()
    } else if (mode === 'listening' && !sr.isListening) {
      // reconocimiento ya cerró sin captura: reiniciar
      sr.reset()
      sr.start()
    } else {
      stopAll()
    }
  }

  const mainLabel = mode === 'idle'
    ? 'Tutor de voz'
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
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={handleMainClick}
        className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
          mode === 'idle' || mode === 'finished'
            ? 'border-border text-muted hover:border-green/40 hover:text-text'
            : listening
              ? 'border-red/50 bg-red/10 text-red hover:bg-red/20'
              : 'border-green/40 bg-green/10 text-green hover:bg-green/20'
        }`}
        title="Inicia una tutoría por voz: el agente hace una pregunta, la lee, escucha tu respuesta y la evalúa"
      >
        {busy ? (
          <Loader2 size={11} className="animate-spin" />
        ) : listening ? (
          <MicOff size={11} />
        ) : (
          <Mic size={11} />
        )}
        <Volume2 size={11} />
        <span>{mainLabel}</span>
      </button>

      {mode !== 'idle' && mode !== 'finished' && (
        <button
          onClick={stopAll}
          className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-muted hover:border-red/40 hover:text-red transition-colors"
          title="Cancelar tutoría"
        >
          <X size={10} />
        </button>
      )}

      {sttSupported === false && mode !== 'idle' && (
        <span className="text-[10px] text-muted">El reconocimiento de voz no está disponible en este navegador; responde improvisando.</span>
      )}

      {error && <span className="text-[10px] text-red">⚠ {error}</span>}

      {modelLoad && (mode === 'thinking-q' || mode === 'thinking-eval') && (
        <span className="flex items-center gap-1.5 text-[10px] text-cyan">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
          {Math.round((modelLoad.progress ?? 0) * 100)}% · {modelLoad.text ?? 'Cargando modelo local…'}
        </span>
      )}

      {question && (speaking || mode === 'listening' || busy || mode === 'finished') && (
        <div className="hidden max-w-md items-start gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs leading-5 text-text/80 md:flex">
          {mode === 'thinking-q' && <span className="text-muted">Generando pregunta…</span>}
          {mode !== 'thinking-q' && (
            <>
              <span className="font-semibold text-purple shrink-0">P:</span>
              <span>{question}</span>
            </>
          )}
        </div>
      )}

      {mode === 'listening' && (
        <span className="text-[11px] text-muted">
          {sr.isListening ? (
            <>
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red align-middle" />
              Escuchando… {sr.interim && <span className="italic text-muted/70">{sr.interim}</span>}
            </>
          ) : 'Pulsa “Terminé de hablar” cuando respondas.'}
        </span>
      )}

      {lastAnswer && (mode === 'thinking-eval' || mode === 'speaking-eval' || mode === 'finished') && (
        <div className="hidden max-w-md items-start gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs leading-5 text-text/80 md:flex">
          <span className="font-semibold text-blue shrink-0">R:</span>
          <span>{lastAnswer}</span>
        </div>
      )}

      {evalResult && mode === 'finished' && (
        <div className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${evalResult.correct ? 'text-green' : 'text-orange'}`}>
          {evalResult.correct ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
          <span>{evalResult.correct ? '¡Correcto!' : 'Repasa esto'}</span>
        </div>
      )}

      {round > 0 && (
        <span className="hidden text-[10px] tabular-nums text-muted/70 sm:inline">
          <RefreshCw size={9} className="inline" /> {round}
        </span>
      )}
    </div>
  )
}