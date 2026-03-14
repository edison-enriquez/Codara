import { useState, useEffect } from 'react'
import { Lightbulb, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  hints: string[]
  courseId: string
  lessonId: string
}

const storageKey = (c: string, l: string) => `codara_hints_${c}_${l}`

export default function HintPanel({ hints, courseId, lessonId }: Props) {
  const key = storageKey(courseId, lessonId)
  const [revealed, setRevealed] = useState<boolean[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? '[]')
      return Array.isArray(saved) ? saved : new Array(hints.length).fill(false)
    } catch {
      return new Array(hints.length).fill(false)
    }
  })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(revealed))
  }, [revealed, key])

  const revealNext = () => {
    const nextIdx = revealed.findIndex((r) => !r)
    if (nextIdx === -1) return
    setRevealed((prev) => prev.map((v, i) => (i === nextIdx ? true : v)))
    setOpen(true)
  }

  const revealedCount = revealed.filter(Boolean).length
  const allRevealed = revealedCount === hints.length

  if (!hints.length) return null

  return (
    <div className="rounded-lg border border-yellow/20 bg-yellow/5">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Lightbulb size={15} className="text-yellow" />
          <span className="text-sm font-medium text-yellow">
            Pistas ({revealedCount}/{hints.length})
          </span>
        </div>
        {open ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>

      {open && (
        <div className="border-t border-yellow/10 px-4 pb-4 pt-3">
          {/* Revealed hints */}
          {revealed.map((shown, idx) =>
            shown ? (
              <div key={idx} className="mb-2 flex gap-2 rounded-md bg-yellow/10 p-3">
                <span className="mt-0.5 text-xs font-bold text-yellow shrink-0">#{idx + 1}</span>
                <p className="text-sm text-text/85 leading-relaxed">{hints[idx]}</p>
              </div>
            ) : null
          )}

          {/* Reveal next or all revealed */}
          {!allRevealed ? (
            <button
              onClick={revealNext}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-yellow/30 py-2 text-sm text-yellow hover:bg-yellow/10 transition-colors"
            >
              <Eye size={14} />
              Ver pista #{revealedCount + 1}
            </button>
          ) : (
            <p className="mt-2 text-center text-xs text-muted italic">
              Todas las pistas reveladas
            </p>
          )}
        </div>
      )}
    </div>
  )
}
