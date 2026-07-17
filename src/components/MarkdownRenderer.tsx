import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { useRef, useEffect, useMemo } from 'react'
import InteractiveCode from './InteractiveCode'
import { highlightCode } from '../utils/highlight'
import type { Segment } from '../types'
import { segmentMarkdown } from '../utils/courseLoader'
import type { TutorMark } from '../context/VoiceTutorContext'

interface Props {
  content: string
  /** Marcas del tutor (resaltador + subrayado) a aplicar en los segmentos de prosa. */
  marks?: TutorMark[]
}

/** Normaliza texto para comparación difusa (sin tildes, minúsculas, sin signos). */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** ¿El segmento de prosa contiene la marca (comparación difusa)? */
function proseMatchesMark(segContent: string, markText: string): boolean {
  if (!markText || markText.length < 4) return false
  const a = normalize(segContent)
  const b = normalize(markText)
  if (!a || !b) return false
  if (a.includes(b)) return true
  const aw = new Set(a.split(' ').filter((w) => w.length > 3))
  const bw = b.split(' ').filter((w) => w.length > 3)
  if (!bw.length) return false
  let hits = 0
  for (const w of bw) if (aw.has(w)) hits++
  return hits / bw.length >= 0.5 && hits >= 2
}

/** ¿Algún segmento de prosa contiene esta marca? → para decidir cúal párrafo activar. */
function segmentMatchesAnyMark(segContent: string, marks: TutorMark[]): boolean {
  return marks.some((mk) => proseMatchesMark(segContent, mk.text))
}

/** Construye una regex flexible (ignorando tildes/signos) para una marca. */
function normalizeRegex(ref: string): RegExp | null {
  if (!ref || ref.length < 3) return null
  const cleaned = ref.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const parts = cleaned.split(/\s+/).filter((w) => w.length > 1)
  if (!parts.length) return null
  let pattern = ''
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    pattern += (i ? '[^a-záéíóúñ0-9]+?' : '') + p
  }
  return new RegExp(pattern, 'i')
}

interface Range { start: number; end: number; style: 'highlight' | 'underline'; key: string }

/** Busca todos los rangos donde las marcas aparecen en un segmento de prosa. */
function findMarkRanges(segContent: string, marks: TutorMark[]): Range[] {
  const ranges: Range[] = []
  for (let mi = 0; mi < marks.length; mi++) {
    const mk = marks[mi]
    const re = normalizeRegex(mk.text)
    if (!re) continue
    // Buscar todas las ocurrencias (hasta 3) — pero solo la primera basta
    const m = re.exec(segContent)
    if (m && m.index >= 0) {
      ranges.push({ start: m.index, end: m.index + m[0].length, style: mk.style, key: `mk-${mi}` })
    } else {
      // fallback: buscar la primera palabra clave (>=4 chars)
      const words = normalize(mk.text).split(' ').filter((w) => w.length >= 4)
      for (const w of words) {
        const idx = segContent.toLowerCase().indexOf(w)
        if (idx >= 0) {
          ranges.push({ start: idx, end: idx + w.length, style: mk.style, key: `mk-${mi}` })
          break
        }
      }
    }
  }
  // Ordenar por start; en solapamientos, gana el primero
  ranges.sort((a, b) => a.start - b.start)
  const filtered: Range[] = []
  let maxEnd = -1
  for (const r of ranges) {
    if (r.start >= maxEnd) {
      filtered.push(r)
      maxEnd = r.end
    }
  }
  return filtered
}

/** Inserta marcas HTML <mark>/<u> en el markdown para que rehypeRaw las renderice. */
function insertMarks(markdown: string, ranges: Range[]): string {
  if (!ranges.length) return markdown
  const sorted = [...ranges].sort((a, b) => b.start - a.start)
  let result = markdown
  for (const r of sorted) {
    const before = result.slice(0, r.start)
    const hit = result.slice(r.start, r.end)
    const after = result.slice(r.end)
    result = r.style === 'underline'
      ? `${before}<u>${hit}</u>${after}`
      : `${before}<mark>${hit}</mark>${after}`
  }
  return result
}

export default function MarkdownRenderer({ content, marks }: Props) {
  const segments = segmentMarkdown(content)
  const activeMarks = marks ?? []
  const activeIdx = activeMarks.length
    ? segments.findIndex((s) => s.type === 'prose' && segmentMatchesAnyMark(s.content, activeMarks))
    : -1

  // Rangos exactos de las marcas dentro del segmento activo
  const activeRanges = useMemo(() => {
    if (activeIdx < 0 || !activeMarks.length) return []
    const seg = segments[activeIdx]
    if (seg.type !== 'prose') return []
    return findMarkRanges(seg.content, activeMarks)
  }, [activeIdx, activeMarks, segments])

  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (activeIdx < 0) return
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-chunk="${activeIdx}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeIdx])

  return (
    <div className="lesson-prose" ref={scrollRef}>
      {segments.map((seg, idx) => {
        const isActive = idx === activeIdx
        switch (seg.type) {
          case 'prose': {
            const proseWithMarks = isActive && activeRanges.length
              ? insertMarks(seg.content, activeRanges)
              : seg.content
            return (
              <div
                key={idx}
                data-chunk={idx}
                className={`rounded-lg transition-all duration-500 ${
                  isActive ? 'bg-yellow/5 px-3 py-2 -mx-3' : ''
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={isActive ? hlComponents : mdComponents}>
                  {proseWithMarks}
                </ReactMarkdown>
              </div>
            )
          }
          case 'exec':
            return <InteractiveCode key={idx} lang={seg.lang} code={seg.content} executable />
          case 'code':
            return <InteractiveCode key={idx} lang={seg.lang} code={seg.content} />
          case 'hints':
            return <InlineHints key={idx} items={seg.items} />
          default:
            return null
        }
      })}
    </div>
  )
}

// ─── Inline hints (inside lesson content) ────────────────────────────────────

function InlineHints({ items }: { items: string[] }) {
  return (
    <div className="my-4 rounded-lg border border-yellow/20 bg-yellow/5 p-4">
      <p className="mb-2 text-sm font-semibold text-yellow">💡 Pistas</p>
      <ul className="space-y-1">
        {items.map((hint, i) => (
          <li key={i} className="text-sm text-text/80">
            {hint}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Prose markdown component overrides ─────────────────────────────────────

// Quita la numeración inicial de cabeceras (# 1.0 X, ## 1.0.1 Y, # Lab 1.1.2 — Z).
const HEADING_ENUM_RE = /^\s*(?:Lab\s+)?\d+\.\d+(?:\.\d+)*\s*(?:[\u2014\u2013-]\s+)?/i
function stripEnum(s: string): string {
  return s.replace(HEADING_ENUM_RE, '')
}
function cleanHeading(children: React.ReactNode): React.ReactNode {
  const cleanStr = (str: string) => {
    const r = stripEnum(str)
    return r !== str ? r : str
  }
  if (typeof children === 'string') return cleanStr(children)
  if (Array.isArray(children)) {
    let stripped = false
    return children.map((c) => {
      if (!stripped && typeof c === 'string') {
        stripped = true
        return cleanStr(c)
      }
      return c
    })
  }
  return children
}

const mdComponents = {
  h1: ({ children }: React.PropsWithChildren) => (
    <h1 className="mb-4 mt-8 text-2xl font-bold text-text first:mt-0">{cleanHeading(children)}</h1>
  ),
  h2: ({ children }: React.PropsWithChildren) => (
    <h2 className="mb-3 mt-7 text-xl font-semibold text-text border-b border-border pb-2">{cleanHeading(children)}</h2>
  ),
  h3: ({ children }: React.PropsWithChildren) => (
    <h3 className="mb-2 mt-5 text-lg font-medium text-text">{cleanHeading(children)}</h3>
  ),
  p: ({ children }: React.PropsWithChildren) => (
    <p className="mb-4 leading-7 text-text/85">{children}</p>
  ),
  ul: ({ children }: React.PropsWithChildren) => (
    <ul className="mb-4 ml-5 list-disc space-y-1 text-text/85">{children}</ul>
  ),
  ol: ({ children }: React.PropsWithChildren) => (
    <ol className="mb-4 ml-5 list-decimal space-y-1 text-text/85">{children}</ol>
  ),
  li: ({ children }: React.PropsWithChildren) => (
    <li className="leading-7">{children}</li>
  ),
  blockquote: ({ children }: React.PropsWithChildren) => (
    <blockquote className="my-4 border-l-4 border-blue/60 bg-blue/5 pl-4 pr-2 py-2 text-text/75 italic rounded-r-md">
      {children}
    </blockquote>
  ),
  strong: ({ children }: React.PropsWithChildren) => (
    <strong className="font-semibold text-text">{children}</strong>
  ),
  em: ({ children }: React.PropsWithChildren) => (
    <em className="italic text-text/80">{children}</em>
  ),
  a: ({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue underline underline-offset-2 hover:text-blue/80">
      {children}
    </a>
  ),
  code: ({ children, className }: React.HTMLAttributes<HTMLElement>) => {
    // Inline code (no className) vs block code (has className)
    const isBlock = !!className
    if (!isBlock) {
      return (
        <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[0.875em] text-orange">
          {children}
        </code>
      )
    }
    // Block code inside prose (not segmented)
    const lang = (className ?? '').replace('language-', '')
    const raw = String(children).trimEnd()
    return (
      <pre className="hljs my-4 overflow-x-auto rounded-xl border border-border p-4 text-sm font-mono leading-relaxed bg-base">
        <code dangerouslySetInnerHTML={{ __html: highlightCode(raw, lang) }} />
      </pre>
    )
  },
  pre: ({ children }: React.PropsWithChildren) => <>{children}</>,
  hr: () => <hr className="my-6 border-border" />,
  table: ({ children }: React.PropsWithChildren) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: React.PropsWithChildren) => (
    <thead className="border-b border-border bg-surface">{children}</thead>
  ),
  th: ({ children }: React.PropsWithChildren) => (
    <th className="px-4 py-2 text-left font-medium text-text">{children}</th>
  ),
  td: ({ children }: React.PropsWithChildren) => (
    <td className="border-b border-border/50 px-4 py-2 text-text/80">{children}</td>
  ),
}

// ─── Resaltado de texto (<mark>/<u> insertados por insertMarks) ──────────────

const hlComponents = {
  ...mdComponents,
  mark: ({ children }: React.PropsWithChildren) => (
    <mark
      className="rounded-sm px-0.5 transition-all duration-700"
      style={{
        background: 'rgba(255, 224, 102, 0.5)',
        color: 'inherit',
        boxShadow: '0 0 0 1px rgba(255, 224, 102, 0.55)',
      }}
    >
      {children}
    </mark>
  ),
  u: ({ children }: React.PropsWithChildren) => (
    <span
      className="transition-all duration-700"
      style={{
        borderBottom: '2px solid rgba(204, 153, 255, 0.9)',
        textDecoration: 'none',
        paddingBottom: '1px',
      }}
    >
      {children}
    </span>
  ),
}
