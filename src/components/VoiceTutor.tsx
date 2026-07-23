import { useState, useRef, useCallback, useEffect, lazy, Suspense, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Mic, Loader2, X, Headphones, Send,
} from 'lucide-react'
import { useAgent } from '../context/AgentContext'
import { useVoiceTutor, resolveVoice } from '../context/VoiceTutorContext'
import { type Message, type LoadProgress } from '../utils/llmClient'
import {
  runTutorTurn, decideAdvance, recordMetric, filterValidMarks, norm,
  splitIntoSections, buildLessonContext, buildSystemPrompt, SPANISH_STOP_WORDS,
  type LessonSection, type TutorMark as Mark,
} from '../harness'
import { extractReadableChunks } from '../utils/speechText'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { executeSlideAction, parseSlideAction } from '../utils/slideController'
import { useSlideController } from '../context/SlideControllerContext'
import VoicePicker from './VoicePicker'
import { markComplete } from '../utils/courseLoader'
import { useCourseData } from '../hooks/useCourses'

const VoiceOrbThree = lazy(() => import('./VoiceOrbThree'))

type Mode =
  | 'idle'
  | 'thinking'          // LLM pensando (generar pregunta o responder)
  | 'speaking'          // TTS hablando (pregunta o respuesta del tutor)
  | 'listening'         // escuchando la respuesta del estudiante
  | 'finished'          // ronda terminada, listo para otra

const SILENCE_MS = 1500

interface ChatTurn {
  role: 'tutor' | 'student'
  text: string
}

/** Extrae marcas que el agente puso directamente en el speech (tanto formato
 *  ==HL==...==/HL== como <mark>...</mark> / <u>...</u>), las elimina del texto
 *  y las convierte a objetos Mark. */
function extractMarksFromSpeech(speech: string, existingMarks: Mark[]): { cleanSpeech: string; allMarks: Mark[] } {
  let clean = speech
  const extracted: Mark[] = []
  // formato ==HL== / ==UL==
  const legacyRe = /==(HL|UL)==(.*?)==\/\1==/g
  let match: RegExpExecArray | null
  while ((match = legacyRe.exec(speech)) !== null) {
    const style = match[1] === 'HL' ? 'highlight' as const : 'underline' as const
    const text = match[2].trim()
    if (text.length >= 2) extracted.push({ text, style })
  }
  clean = clean.replace(legacyRe, '$2').trim()
  // formato HTML <mark> / <u>
  const htmlRe = /<(mark|u)>(.*?)<\/\1>/g
  while ((match = htmlRe.exec(speech)) !== null) {
    const style = match[1] === 'mark' ? 'highlight' as const : 'underline' as const
    const text = match[2].trim()
    if (text.length >= 2) extracted.push({ text, style })
  }
  clean = clean.replace(htmlRe, '$2').trim()
  if (extracted.length === 0) return { cleanSpeech: speech, allMarks: existingMarks }
  const texts = new Set(existingMarks.map(m => m.text + m.style))
  for (const m of extracted) {
    if (!texts.has(m.text + m.style)) existingMarks.push(m)
  }
  return { cleanSpeech: clean, allMarks: existingMarks }
}

/** Renderiza texto convirtiendo ==HL==...==/HL==, <mark>...</mark> y
 *  <u>...</u> en elementos con estilo visual. Usado en burbujas de chat
 *  para que subrayado/resaltado se vea aunque el agente use ese formato. */
function renderChatText(text: string): ReactNode {
  // unificar ambos formatos a marcadores simples
  let unified = text
    .replace(/==HL==(.*?)==\/HL==/g, '\x00HL\x00$1\x00/HL\x00')
    .replace(/==UL==(.*?)==\/UL==/g, '\x00UL\x00$1\x00/UL\x00')
    .replace(/<mark>(.*?)<\/mark>/g, '\x00HL\x00$1\x00/HL\x00')
    .replace(/<u>(.*?)<\/u>/g, '\x00UL\x00$1\x00/UL\x00')
  const parts: ReactNode[] = []
  const splitRe = /\x00(HL|UL)\x00(.*?)\x00\/(HL|UL)\x00/g
  let cursor = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = splitRe.exec(unified)) !== null) {
    if (m.index > cursor) parts.push(unified.slice(cursor, m.index))
    const isHL = m[1] === 'HL'
    const content = m[2]
    if (isHL) {
      parts.push(<mark key={key++} className="rounded-sm px-0.5" style={{ background: 'rgba(255, 224, 102, 0.5)', color: 'inherit' }}>{content}</mark>)
    } else {
      parts.push(<span key={key++} style={{ borderBottom: '2px solid rgba(204, 153, 255, 0.9)', textDecoration: 'none', paddingBottom: '1px' }}>{content}</span>)
    }
    cursor = m.index + m[0].length
  }
  if (cursor < unified.length) parts.push(unified.slice(cursor))
  return parts.length > 0 ? <>{parts}</> : text
}

/** Recupera palabras del texto que el agente mencionó aunque no haya enviado marks. */
function deriveMarksFromSpeech(speech: string, lessonContent: string, current: Mark[]): Mark[] {
  const result = current.slice(0, 3)
  if (result.length >= 3) return result

  const sourceWords = extractReadableChunks(lessonContent)
    .join(' ')
    .match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{5,}/g) ?? []
  const sourceByNormalized = new Map<string, string>()
  for (const word of sourceWords) {
    const normalized = norm(word)
    if (!sourceByNormalized.has(normalized)) sourceByNormalized.set(normalized, word)
  }

  const spokenWords = norm(speech).split(' ').filter(
    (word) => word.length >= 5 && !SPANISH_STOP_WORDS.has(word)
  )
  const existing = new Set(result.map((mark) => norm(mark.text)))
  for (const word of spokenWords) {
    const sourceWord = sourceByNormalized.get(word)
    if (!sourceWord || existing.has(norm(sourceWord))) continue
    result.push({ text: sourceWord, style: 'underline' })
    existing.add(norm(sourceWord))
    if (result.length >= 3) break
  }
  return result
}

function speak(text: string, voiceName: string, onEnd?: () => void, onError?: () => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.()
    return () => {}
  }
  const cleanText = text.trim()
  if (!cleanText) {
    console.warn('[TTS] Texto vacío, no se reproduce nada')
    onError?.()
    return () => {}
  }

  let cancelled = false
  let playTimer: number | undefined
  const cancel = () => {
    cancelled = true
    if (playTimer !== undefined) window.clearTimeout(playTimer)
    window.speechSynthesis.cancel()
  }

  window.speechSynthesis.cancel()

  const play = (voice: SpeechSynthesisVoice | null, attempt: number) => {
    if (cancelled) return
    console.log(`[TTS] Reproduciendo (${attempt}):`, cleanText.slice(0, 80), voice?.name ?? 'voz por defecto')
    const u = new SpeechSynthesisUtterance(cleanText)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    } else {
      u.lang = 'es-ES'
    }
    u.rate = 0.98
    u.pitch = 1
    u.volume = 1
    u.onend = () => {
      if (cancelled) return
      console.log('[TTS] Finalizó correctamente')
      onEnd?.()
    }
    u.onerror = (e) => {
      if (cancelled || e.error === 'canceled' || e.error === 'interrupted') return
      console.warn('[TTS] Error:', e.error)
      if (voice && attempt === 1) {
        playTimer = window.setTimeout(() => play(resolveVoice(), 2), 0)
        return
      }
      onError?.()
    }
    // En Chrome/Android el sintetizador a veces está pausado; forzar resume().
    try { window.speechSynthesis.resume() } catch {}
    window.speechSynthesis.speak(u)
  }

  // Ceder un ciclo tras cancel() para que Chrome acepte la nueva utterance sin introducir latencia visible.
  playTimer = window.setTimeout(() => play(resolveVoice(voiceName), 1), 0)
  return cancel
}

/** Botón flotante + panel lateral deslizable. Se renderiza globalmente. */
export default function VoiceTutor() {
  const { config, isConfigured } = useAgent()
  const { lessonContent, open, setOpen, voiceName, supported: ttsSupported, setMarks } = useVoiceTutor()
  const { iframeRef } = useSlideController()
  const location = useLocation()
  const navigate = useNavigate()
  const routeMatch = location.pathname.match(/^\/course\/([^/]+)\/([^/]+)$/)
  const courseId = routeMatch?.[1]
  const lessonId = routeMatch?.[2]
  const { course } = useCourseData(courseId)
  const currentIdx = course?.lessons.findIndex((lesson) => lesson.id === lessonId) ?? -1
  const nextLesson = currentIdx >= 0 ? course?.lessons[currentIdx + 1] : undefined
  const sr = useSpeechRecognition('es-ES')

  const [mode, setMode] = useState<Mode>('idle')
  const [chat, setChat] = useState<ChatTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [modelLoad, setModelLoad] = useState<LoadProgress | null>(null)
  const [textDraft, setTextDraft] = useState('')
  const [orbSpeakerLevel, setOrbSpeakerLevel] = useState(0)
  const [orbListenLevel, setOrbListenLevel] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const cancelSpeechRef = useRef<(() => void) | null>(null)
  const stoppingRef = useRef(false)
  const lessonSectionsRef = useRef<LessonSection[]>([])
  const configRef = useRef(config)
  configRef.current = config
  const chatRef = useRef<ChatTurn[]>([])
  const voiceNameRef = useRef(voiceName)
  voiceNameRef.current = voiceName

  const sttSupported = sr.supported

  // Chunking: la lección se divide en secciones una sola vez; la selección
  // relevante se hace por turno en buildLLMMessages (ver harness/context.ts).
  useEffect(() => {
    lessonSectionsRef.current = splitIntoSections(lessonContent)
  }, [lessonContent])

  // ── Modulación sintética del orbe mientras el tutor habla (TTS) ─────────
  useEffect(() => {
    if (mode !== 'speaking') {
      setOrbSpeakerLevel(0)
      return
    }
    const id = setInterval(() => {
      const t = performance.now() / 1000
      const lvl = 0.35 + 0.45 * Math.abs(Math.sin(t * 7) * Math.sin(t * 2.3)) + 0.1 * Math.random()
      setOrbSpeakerLevel(Math.min(1, lvl))
    }, 50)
    return () => clearInterval(id)
  }, [mode])

  // ── Auto-envío por inactividad de transcripción ──────────────────────────
  // El estudiante "ha hablado" cuando el STT produjo al menos un resultado.
  // Cuando pasan SILENCE_MS sin nuevos resultados, llamamos sr.stop() → el
  // effect de sr.ended envía la respuesta al LLM automáticamente.
  useEffect(() => {
    if (mode !== 'listening') return
    if (sr.isListening && !sr.hasSpeech) return // aún no habló
    if (!sr.hasSpeech) return

    const id = setInterval(() => {
      if (mode !== 'listening') return
      const since = performance.now() - (sr.lastResultAt || 0)
      if (since > SILENCE_MS) {
        clearInterval(id)
        sr.stop()
      }
    }, 150)
    return () => clearInterval(id)
  }, [mode, sr.isListening, sr.hasSpeech, sr.lastResultAt, sr])

  // ── Pulso del orbe mientras escucha: basado en la actividad del STT ─────
  useEffect(() => {
    if (mode !== 'listening' || !sr.isListening) {
      setOrbListenLevel(0)
      return
    }
    let prev = ''
    const id = setInterval(() => {
      const cur = sr.transcript + sr.interim
      if (cur !== prev && cur.length > prev.length) {
        // El STT acaba de recibir texto → habla activa
        setOrbListenLevel((l) => Math.min(1, l + 0.25))
        prev = cur
      } else {
        // Decae lentamente
        setOrbListenLevel((l) => Math.max(0, l - 0.08))
        prev = cur
      }
    }, 60)
    return () => clearInterval(id)
  }, [mode, sr.isListening, sr.transcript, sr.interim])

  useEffect(() => () => {
    abortRef.current?.abort()
    cancelSpeechRef.current?.()
    if (ttsSupported) window.speechSynthesis.cancel()
  }, [ttsSupported])

  const stopAll = useCallback(() => {
    stoppingRef.current = true
    abortRef.current?.abort()
    cancelSpeechRef.current?.()
    cancelSpeechRef.current = null
    if (ttsSupported) window.speechSynthesis.cancel()
    sr.stop()
    setMode('idle')
    setModelLoad(null)
setMarks([])

  }, [sr, ttsSupported, setMarks])
  // Al cerrar el panel: detener todo en marcha.
  useEffect(() => {
    if (!open) stopAll()
  }, [open, stopAll])

  // Construye los mensajes del LLM a partir del historial del chat.
  // El contexto se re-selecciona por turno según relevancia conversacional.
  function buildLLMMessages(userText?: string): Message[] {
    const sections = lessonSectionsRef.current
    const { context, included } = buildLessonContext({
      sections,
      recentTurns: chatRef.current.slice(-4).map((t) => t.text),
      budget: 6000,
    })
    const msgs: Message[] = [{
      role: 'system',
      content: buildSystemPrompt({ sections, included, context }),
    }]
    for (const turn of chatRef.current) {
      msgs.push({
        role: turn.role === 'tutor' ? 'assistant' : 'user',
        content: turn.text,
      })
    }
    if (userText) msgs.push({ role: 'user', content: userText })
    return msgs
  }

  // ── Enviar la respuesta del estudiante (voz o texto) al LLM ─────────────
  const sendResponse = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    // Detener escucha si estaba activa
    sr.stop()
    cancelSpeechRef.current?.()
    cancelSpeechRef.current = null
    if (ttsSupported) window.speechSynthesis.cancel()

    const isFirst = chatRef.current.length === 0

    // Guardar la respuesta del estudiante en el historial
    chatRef.current = [...chatRef.current, { role: 'student', text: trimmed }]
    setChat([...chatRef.current])
    setMarks([])
    setTextDraft('')
    stoppingRef.current = false
    setMode('thinking')
    setError(null)

    const userMsg = isFirst
      ? 'Inicia la tutoría. Mi primera respuesta es: ' + trimmed
      : trimmed
    const messages = buildLLMMessages(userMsg)

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    try {
      // ── Harness: bucle agente (herramientas + reintento con feedback),
      //    salida estructurada + validación del contrato + telemetría.
      const { turn } = await runTutorTurn({
        config: configRef.current,
        messages,
        lessonContent,
        sections: lessonSectionsRef.current,
        signal: abortRef.current.signal,
        onProgress: (p) => setModelLoad(p.progress >= 1 ? null : p),
      })

      if (stoppingRef.current) return
      let { speech, marks, action } = turn

      // ── Gate de avance: el modelo pide (advance), el harness decide con
      //    evidencia (petición explícita del estudiante o verdict "correct").
      const gate = decideAdvance({
        requested: turn.advance,
        studentText: trimmed,
        studentTurns: chatRef.current.filter((t) => t.role === 'student').length,
        lastVerdict: turn.verdict,
      })
      if (turn.advance) {
        recordMetric(gate.allowed ? 'advanceAllowed' : 'advanceBlocked')
        if (!gate.allowed) console.info('[harness] Avance bloqueado por el gate:', gate.reason)
      }
      const advance = gate.allowed

      // Preservar texto original (con ==UL==/==HL== tags) para el display
      const rawDisplay = speech
      // Post-procesamiento: extraer tags del speech como marcas y limpiar para TTS
      const extracted = extractMarksFromSpeech(speech, marks)
        const ttsText = extracted.cleanSpeech.replace(/^["“'"']+|["”'"']+$/g, '').trim()
      marks = extracted.allMarks
      // Para el chat mostramos el texto con los tags (renderChatText los estiliza)
      let text = rawDisplay.match(/==(HL|UL)==/)
        ? rawDisplay.replace(/^["“'"']+|["”'"']+$/g, '')
        : ttsText

      // Filtrar solo las marcas válidas (verificadas contra la lección) y setearlas
      const validMarks = filterValidMarks(marks, lessonContent)
      setMarks(deriveMarksFromSpeech(speech, lessonContent, validMarks))

      if (action) {
        const slideAction = parseSlideAction(action)
        if (slideAction) {
          setTimeout(() => {
            executeSlideAction(iframeRef.current, slideAction)
          }, 500)
        }
      }

      chatRef.current = [...chatRef.current, { role: 'tutor', text }]
      setChat([...chatRef.current])
      setMode('speaking')
      console.log('[VoiceTutor] Texto a hablar:', ttsText.slice(0, 120))
      cancelSpeechRef.current = speak(ttsText, voiceNameRef.current, () => {
        cancelSpeechRef.current = null
        if (!stoppingRef.current) {
          if (advance && courseId && lessonId) {
            markComplete(courseId, lessonId)
            if (nextLesson) {
              setOpen(false)
              navigate(`/course/${courseId}/${nextLesson.id}`)
              return
            }
            setMode('finished')
            return
          }
          setMode('listening')
          setMarks([])
          sr.clearEnded()
          sr.reset()
          setTimeout(() => sr.start(), 80)
        }
        }, () => {
          cancelSpeechRef.current = null
          setError('No se pudo reproducir la voz. Pulsa la muestra de voz para comprobar el audio del navegador.')
          setMode('finished')
      })
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message ?? 'Error al procesar la respuesta')
        setMode('idle')
        setMarks([])
      }
    }
  }, [sr, ttsSupported, setMarks, courseId, lessonId, nextLesson, navigate, setOpen])

  // (sin VAD externo: la detección de fin de habla se basa en el STT)

  // ── Cuando el STT termina → enviar la respuesta del estudiante al LLM ────
  useEffect(() => {
    if (mode !== 'listening') return
    if (sr.isListening) return // aún escuchando
    if (!sr.ended) return // onend aún no ha disparado

    const ans = sr.transcript.trim()

    if (!ans) {
      // No capturó nada: permitir al usuario reintentar o escribir
      setError('No te escuché. Escribe tu respuesta o pulsa el botón para hablar de nuevo.')
      setMode('finished')
      return
    }

    sendResponse(ans)
  }, [mode, sr.isListening, sr.ended, sr.transcript, sendResponse])

  // ── Render ────────────────────────────────────────────────────────────────
  if (!ttsSupported || !lessonContent.trim()) return null

  const busy = mode === 'thinking'
  const speaking = mode === 'speaking'
  const listening = mode === 'listening' && sr.isListening
  // Modo "lava": el orbe ocupa todo el panel, sin texto visible.
  const lavaMode = mode === 'speaking' || (mode === 'listening')

  const handleMainClick = () => {
    if (!isConfigured) {
      setError('Configura un proveedor IA en los ajustes antes de continuar.')
      return
    }
    // El botón de voz solo controla el micrófono, no inicia la tutoría
    // (el inicio se hace escribiendo o con el botón correspondiente)
    if (listening) {
      sr.stop()
    } else if (mode === 'listening' || mode === 'idle' || mode === 'finished') {
      // (Re)iniciar escucha
      stoppingRef.current = false
      sr.clearEnded()
      sr.reset()
      setMode('listening')
      setTimeout(() => sr.start(), 80)
    }
  }

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

        {/* ── Modo LAVA: orbe ocupa todo el espacio, sin texto ni footer ── */}
        {lavaMode && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
            <Suspense fallback={<div style={{ width: 220, height: 220 }} />}>
              <VoiceOrbThree mode={mode as any} level={mode === 'speaking' ? orbSpeakerLevel : orbListenLevel} size={220} />
            </Suspense>
            <div className="text-center">
              <p className="text-sm font-medium text-text/90">
                {mode === 'speaking' ? 'El tutor está hablando…' : sr.hasSpeech ? 'Procesando…' : 'Escuchando…'}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {mode === 'speaking'
                  ? 'Pulsa “Interrumpir” para pausar'
                  : 'Habla de forma natural — al pausar, se envía solo'}
              </p>
            </div>
            <button
              onClick={stopAll}
              className="mt-2 flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs text-muted hover:border-red/40 hover:text-red transition-colors"
            >
              <X size={13} />
              Interrumpir / Volver al chat
            </button>
          </div>
        )}

        {/* ── Modo CHAT: conversación visible + inputs ── */}
        {!lavaMode && (
          <>
            {/* Scroll area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Selector de voz */}
              <VoicePicker />

              {!isConfigured && (
                <div className="mb-4 mt-4 rounded-lg border border-yellow/20 bg-yellow/5 p-3 text-xs text-text/80">
                  Para iniciar una tutoría por voz, primero configura el agente IA (Groq o modelo local).
                </div>
              )}

              {/* Intro */}
              {mode === 'idle' && chat.length === 0 && (
                <div className="rounded-lg border border-border bg-base p-4 text-center text-xs text-muted">
                  Pulsa <span className="font-semibold text-purple">Hablar</span> y conversa de forma natural: cuando dejes de hablar, el tutor enviará tu respuesta automáticamente y seguirá el diálogo. También puedes escribir abajo.
                </div>
              )}

              {/* Historial */}
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
                      <p className="text-sm leading-6 text-text/90">
                        {renderChatText(turn.text)}
                      </p>
                    </div>
                  ))}
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
              {sttSupported === false && (
                <p className="mt-3 text-[11px] text-muted">El reconocimiento de voz no está disponible en este navegador. Usa Chrome o Edge.</p>
              )}
            </div>

            {/* Footer: input de texto + botón de voz */}
            <div className="border-t border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (!isConfigured) {
                        setError('Configura un proveedor IA en los ajustes antes de continuar.')
                        return
                      }
                      if (!busy && textDraft.trim()) sendResponse(textDraft)
                    }
                  }}
                  placeholder={chat.length === 0 ? 'Escribe para iniciar…' : 'Escribe tu respuesta…'}
                  disabled={busy}
                  className="flex-1 rounded-lg border border-border bg-base px-3 py-2.5 text-sm text-text placeholder:text-muted/60 focus:border-purple/50 focus:outline-none disabled:opacity-50"
                  aria-label="Respuesta de texto"
                />
                <button
                  onClick={() => {
                    if (!isConfigured) {
                      setError('Configura un proveedor IA en los ajustes antes de continuar.')
                      return
                    }
                    if (!busy && textDraft.trim()) sendResponse(textDraft)
                  }}
                  disabled={busy || !textDraft.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple/40 bg-purple/10 text-purple hover:bg-purple/20 disabled:opacity-40 transition-colors"
                  title="Enviar respuesta"
                  aria-label="Enviar respuesta"
                >
                  <Send size={14} />
                </button>
              </div>

              {sttSupported && (
                <button
                  onClick={handleMainClick}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 border-border text-muted hover:border-purple/40 hover:text-purple"
                >
                  <Mic size={15} />
                  <span>Hablar</span>
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}