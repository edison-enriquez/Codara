import { useMemo, useEffect, useRef } from 'react'
import { Play, Pause, Square } from 'lucide-react'
import { useSpeechReader } from '../hooks/useSpeechReader'
import { extractReadableChunks } from '../utils/speechText'

interface Props {
  content: string
  voiceName: string
}

export default function ReadingMode({ content, voiceName }: Props) {
  const chunks = useMemo(() => extractReadableChunks(content), [content])
  const reader = useSpeechReader(voiceName)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Cuando se abre el modo lectura por primera vez, mostrar el primer chunk idle.
  const started = reader.state.isReading || reader.state.totalChunks > 0

  // Auto-scroll al chunk actual dentro del panel.
  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-chunk="${reader.state.chunkIndex}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [reader.state.chunkIndex])

  const handleStart = () => {
    if (!reader.state.isReading && reader.state.totalChunks === 0) {
      reader.read(chunks)
    } else if (reader.state.isPaused) {
      reader.resume()
    } else {
      reader.pause()
    }
  }

  if (!reader.supported) {
    return <p className="rounded-lg border border-border bg-base p-4 text-center text-xs text-muted">Tu navegador no soporta síntesis de voz.</p>
  }

  const isReading = reader.state.isReading && !reader.state.isPaused
  const pct = reader.state.totalChunks
    ? Math.round(((reader.state.chunkIndex + (reader.state.charIndex && chunks[reader.state.chunkIndex]?.length ? reader.state.charIndex / chunks[reader.state.chunkIndex].length : 0)) / reader.state.totalChunks) * 100)
    : 0

  return (
    <div className="flex flex-col gap-3">
      {/* Intro */}
      {!started && (
        <div className="rounded-lg border border-border bg-base p-4 text-center text-xs text-muted">
          Pulsa <span className="font-semibold text-purple">Empezar lectura</span> y el texto aparecerá a medida que el tutor lo lee en voz alta.
        </div>
      )}

      {/* Área de lectura con reveal karaoke */}
      <div ref={scrollRef} className="max-h-[42vh] overflow-y-auto rounded-lg border border-border bg-base p-4">
        {!started ? (
          chunks.map((c, i) => (
            <p key={i} className="mb-3 text-sm leading-7 text-text/35">{c}</p>
          ))
        ) : (
          chunks.map((chunk, i) => {
            const isCurrent = i === reader.state.chunkIndex
            const isDone = i < reader.state.chunkIndex
            const spokenLen = isCurrent
              ? Math.min(reader.state.charIndex, chunk.length)
              : isDone ? chunk.length : 0
            const spoken = chunk.slice(0, spokenLen)
            const upcoming = chunk.slice(spokenLen)
            return (
              <p
                key={i}
                data-chunk={i}
                className={`mb-3 text-sm leading-7 transition-all ${
                  isCurrent ? 'text-text' : isDone ? 'text-text/55' : 'text-text/25'
                }`}
              >
                {isCurrent && !isReading && reader.state.isPaused && reader.state.charIndex === 0 && !isDone ? (
                  <span className="text-muted italic">{chunk}</span>
                ) : (<>
                  <span className="font-medium">{spoken}</span>
                  <span>{upcoming}</span>
                </>)}
              </p>
            )
          })
        )}
      </div>

      {/* Barra de progreso */}
      {started && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-elevated">
            <div className="h-full rounded-full bg-purple transition-all duration-200" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] tabular-nums text-muted">
            {Math.min(reader.state.chunkIndex + 1, reader.state.totalChunks)}/{reader.state.totalChunks}
          </span>
        </div>
      )}

      {/* Controles */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleStart}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-purple/40 bg-purple/10 px-4 py-2.5 text-sm font-medium text-purple hover:bg-purple/20 transition-colors"
        >
          {isReading ? <Pause size={15} /> : started ? <Play size={15} /> : <Play size={15} />}
          {isReading ? 'Pausar' : started ? 'Continuar' : 'Empezar lectura'}
        </button>
        {started && (
          <button
            onClick={reader.stop}
            className="flex items-center justify-center rounded-lg border border-border px-3 py-2.5 text-muted hover:border-red/40 hover:text-red transition-colors"
            title="Detener"
          >
            <Square size={14} />
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted/70">La velocidad depende de la voz elegida. Las voces con ★ del selector anterior suenan más naturales.</p>
    </div>
  )
}