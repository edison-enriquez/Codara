import { useState, useRef, useCallback, useEffect, lazy, Suspense, type ReactNode } from 'react'
import {
  Mic, Loader2, X, Headphones, Send,
} from 'lucide-react'
import { useAgent } from '../context/AgentContext'
import { useVoiceTutor, resolveVoice } from '../context/VoiceTutorContext'
import { completeLLM, type Message, type LoadProgress } from '../utils/llmClient'
import { extractReadableChunks } from '../utils/speechText'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import VoicePicker from './VoicePicker'

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

const SYSTEM = `Eres un tutor de programación que da clases por voz en español.
Conduces una conversación oral con el estudiante basándote en el contenido de la lección.

Reglas:
- Cuando formules una pregunta, hazla abierta y de respuesta corta.
- Cuando el estudiante responda, evalúa su comprensión y responde de forma natural.
- Si la respuesta es correcta, felicita brevemente y haz una pregunta de seguimiento.
- Si la respuesta es incorrecta o incompleta, corrige con tono amable y reformula.
- Sé CONVERSACIONAL y dinámico: usa frases como "mira, aquí en la lección dice...", "como puedes ver...", "fíjate en este punto...". Referencia visualmente el contenido.
- Sé breve, claro y alentador. Usa lenguaje sencillo. Responde SIEMPRE en español.

Puedes RESALTAR partes específicas del contenido de la lección para guiar al estudiante:
- Usa "highlight" (resaltador amarillo) para frases o definiciones importantes que quieras mostrar.
- Usa "underline" (subrayado) para palabras clave, términos técnicos o conceptos que quieras enfatizar.
- Puedes marcar varias partes a la vez (varias entradas en el array "marks").
- Las marcas deben ser citas EXACTAS (copiadas tal cual) del contenido de la lección.

FORMATO DE RESPUESTA (obligatorio, SIEMPRE):
Responde con un objeto JSON válido, sin markdown, sin texto fuera del JSON:
{
  "speech": "lo que dirás en voz alta (texto natural, conversacional)",
  "marks": [
    { "text": "cita exacta del contenido a resaltar con marcador", "style": "highlight" },
    { "text": "palabra clave a subrayar", "style": "underline" }
  ]
}
- "marks" puede ser un array vacío [] si no hay nada que marcar.
- "style" solo puede ser "highlight" o "underline".
- NUNCA uses etiquetas como ==UL==...==/UL== ni ==HL==...==/HL== en el campo "speech". El resaltado se hace ÚNICAMENTE mediante el array "marks". Si pones esas etiquetas en "speech", el estudiante las verá escritas literalmente en el chat y no se resaltará nada.
- Para verificar que tus marcas son correctas: el texto en "marks" debe aparecer EXACTAMENTE IGUAL en el contenido de la lección (mismas palabras, mismo orden). Si no estás seguro, usa "marks": [].`

interface Mark {
  text: string
  style: 'highlight' | 'underline'
}

function parseSpeech(raw: string): { speech: string; marks: Mark[] } {
  const m = raw.match(/\{[\s\S]*\}/)
  if (m) {
    try {
      const o = JSON.parse(m[0])
      if (typeof o.speech === 'string') {
        let marks: Mark[] = []
        if (Array.isArray(o.marks)) {
          marks = o.marks
            .filter((mk: any) => typeof mk?.text === 'string' && (mk?.style === 'highlight' || mk?.style === 'underline'))
            .map((mk: any) => ({ text: mk.text.trim(), style: mk.style as 'highlight' | 'underline' }))
        } else if (typeof o.reference === 'string') {
          // retrocompatibilidad: reference única → highlight
          marks = [{ text: o.reference.trim(), style: 'highlight' as const }]
        }
        return { speech: o.speech.trim(), marks }
      }
    } catch {}
  }
  return { speech: raw.trim(), marks: [] }
}

/** Extrae marcas que el agente puso directamente en el speech con sintaxis
 *  ==HL==...==/HL== o ==UL==...==/UL==, las elimina del texto y las convierte
 *  a objetos Mark. Esto permite tolerar que el agente se equivoque de formato. */
function extractMarksFromSpeech(speech: string, existingMarks: Mark[]): { cleanSpeech: string; allMarks: Mark[] } {
  const tagRe = /==(HL|UL)==(.*?)==\/\1==/g
  let clean = speech
  const extracted: Mark[] = []
  let match: RegExpExecArray | null
  while ((match = tagRe.exec(speech)) !== null) {
    const style = match[1] === 'HL' ? 'highlight' as const : 'underline' as const
    const text = match[2].trim()
    if (text.length >= 2) {
      extracted.push({ text, style })
    }
  }
  if (extracted.length === 0) return { cleanSpeech: speech, allMarks: existingMarks }
  clean = speech.replace(tagRe, '$2').trim()
  // Fusionar, evitando duplicados
  const texts = new Set(existingMarks.map(m => m.text + m.style))
  for (const m of extracted) {
    if (!texts.has(m.text + m.style)) existingMarks.push(m)
  }
  return { cleanSpeech: clean, allMarks: existingMarks }
}

/** Renderiza texto convirtiendo ==HL==...==/HL== y ==UL==...==/UL==
 *  en elementos <mark> y <span> con estilo. Usado en burbujas de chat
 *  para que el subrayado/resaltado se vea aunque el agente use ese formato. */
function renderChatText(text: string): ReactNode {
  const tagRe = /==(HL|UL)==(.*?)==\/\1==/g
  const parts: React.ReactNode[] = []
  let cursor = 0
  let key = 0
  let match: RegExpExecArray | null
  while ((match = tagRe.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index))
    const isHL = match[1] === 'HL'
    const content = match[2]
    if (isHL) {
      parts.push(<mark key={key++} className="rounded-sm px-0.5" style={{ background: 'rgba(255, 224, 102, 0.5)', color: 'inherit' }}>{content}</mark>)
    } else {
      parts.push(<span key={key++} style={{ borderBottom: '2px solid rgba(204, 153, 255, 0.9)', textDecoration: 'none', paddingBottom: '1px' }}>{content}</span>)
    }
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts.length > 0 ? <>{parts}</> : text
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** ¿La cita (mark) del LLM aparece realmente en el contenido de la lección? */
function markIsValid(markText: string, lessonContent: string): boolean {
  if (!markText || markText.length < 4) return true
  const refN = norm(markText)
  const chunks = extractReadableChunks(lessonContent)
  for (const ch of chunks) {
    const cN = norm(ch)
    if (cN.includes(refN)) return true
    const refWords = refN.split(' ').filter((w) => w.length > 3)
    if (!refWords.length) continue
    const chunkWords = new Set(cN.split(' ').filter((w) => w.length > 3))
    let hits = 0
    for (const w of refWords) if (chunkWords.has(w)) hits++
    if (hits / refWords.length >= 0.6 && hits >= 2) return true
  }
  return false
}

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
  const { lessonContent, open, setOpen, voiceName, supported: ttsSupported, setMarks } = useVoiceTutor()
  const sr = useSpeechRecognition('es-ES')

  const [mode, setMode] = useState<Mode>('idle')
  const [chat, setChat] = useState<ChatTurn[]>([])
  const [error, setError] = useState<string | null>(null)
  const [modelLoad, setModelLoad] = useState<LoadProgress | null>(null)
  const [textDraft, setTextDraft] = useState('')
  const [orbSpeakerLevel, setOrbSpeakerLevel] = useState(0)
  const [orbListenLevel, setOrbListenLevel] = useState(0)

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
    if (ttsSupported) window.speechSynthesis.cancel()
  }, [ttsSupported])

  const stopAll = useCallback(() => {
    stoppingRef.current = true
    abortRef.current?.abort()
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

  // ── Enviar la respuesta del estudiante (voz o texto) al LLM ─────────────
  const sendResponse = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    // Detener escucha si estaba activa
    sr.stop()
    if (ttsSupported) window.speechSynthesis.cancel()

    const isFirst = chatRef.current.length === 0

    // Guardar la respuesta del estudiante en el historial
    chatRef.current = [...chatRef.current, { role: 'student', text: trimmed }]
    setChat([...chatRef.current])
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
      const raw = (await completeLLM(
        configRef.current, messages, abortRef.current.signal,
        (p) => setModelLoad(p.progress >= 1 ? null : p)
      )).trim()

      if (stoppingRef.current) return
      let { speech, marks } = parseSpeech(raw)
      // Post-procesamiento: si el agente puso ==UL==/==HL== en el speech,
      // extraerlos como marcas y limpiar el texto
      const extracted = extractMarksFromSpeech(speech, marks)
      speech = extracted.cleanSpeech
      marks = extracted.allMarks
      let text = speech.replace(/^["“'"']+|["”'"']+$/g, '') || raw

      // ── Auto-verificación: ¿las marcas del LLM están realmente en la lección? ──
      const invalidMarks = marks.filter((mk) => mk.text.length > 4 && !markIsValid(mk.text, lessonContent))
      if (invalidMarks.length > 0) {
        const fixMsgs: Message[] = buildLLMMessages(
          `${raw}\n\nAlgunas marcas que diste no aparecen en el contenido de la lección:\n` +
          invalidMarks.map((mk) => `- "${mk.text}" (${mk.style})`).join('\n') +
          `\n\nLas "text" de cada marca deben ser fragmentos VERBATIM copiados del contenido. ` +
          `Vuelve a responder con el mismo JSON, corrigiendo las marcas para que coincidan exactamente con el texto de la lección. ` +
          `Si no hay un fragmento adecuado, elimina esa marca del array.`
        )
        try {
          const fixed = (await completeLLM(configRef.current, fixMsgs, abortRef.current.signal)).trim()
          if (stoppingRef.current) return
          if (fixed) {
            const reparsed = parseSpeech(fixed)
            if (reparsed.speech) { text = reparsed.speech }
            if (reparsed.marks.length > 0) marks = reparsed.marks
          }
        } catch {
          // si falla la corrección, seguir con las marcas originales
        }
      }

      // Filtrar solo las marcas válidas y setearlas para el renderer
      const validMarks = marks.filter((mk) => mk.text.length >= 3 && markIsValid(mk.text, lessonContent))
      setMarks(validMarks)

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
        setMarks([])
      }
    }
  }, [sr, ttsSupported, setMarks])

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
      openSettings()
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
                      if (!isConfigured) { openSettings(); return }
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
                    if (!isConfigured) { openSettings(); return }
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