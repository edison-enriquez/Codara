import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useRef, useEffect } from 'react'
import InteractiveCode from './InteractiveCode'
import { highlightCode } from '../utils/highlight'
import type { Segment } from '../types'
import { segmentMarkdown } from '../utils/courseLoader'

interface Props {
  content: string
  /** Cita del contenido a resaltar (subcadena a buscar en segmentos de prosa). */
  highlight?: string
}

/** Normaliza texto para comparación difusa (sin tildes, minúsculas, sin signos). */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** ¿El segmento de prosa contiene la cita (comparación difusa)? */
function proseMatches(segContent: string, ref: string): boolean {
  if (!ref || ref.length < 8) return false
  const a = normalize(segContent)
  const b = normalize(ref)
  if (!a || !b) return false
  if (a.includes(b)) return true
  if (b.includes(a.slice(0, 60))) return true
  // Coincidencia de palabras clave (>= 6 palabras comunes)
  const aw = new Set(a.split(' ').filter((w) => w.length > 3))
  const bw = b.split(' ').filter((w) => w.length > 3)
  let hits = 0
  for (const w of bw) if (aw.has(w)) hits++
  return hits >= 5 && hits / bw.length >= 0.5
}

export default function MarkdownRenderer({ content, highlight }: Props) {
  const segments = segmentMarkdown(content)
  const activeIdx = highlight
    ? segments.findIndex((s) => s.type === 'prose' && proseMatches(s.content, highlight))
    : -1
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
          case 'prose':
            return (
              <div
                key={idx}
                data-chunk={idx}
                className={`rounded-lg transition-all duration-500 ${
                  isActive ? 'bg-purple/10 ring-1 ring-purple/40 px-3 py-2 -mx-3' : ''
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {seg.content}
                </ReactMarkdown>
              </div>
            )
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

const mdComponents = {
  h1: ({ children }: React.PropsWithChildren) => (
    <h1 className="mb-4 mt-8 text-2xl font-bold text-text first:mt-0">{children}</h1>
  ),
  h2: ({ children }: React.PropsWithChildren) => (
    <h2 className="mb-3 mt-7 text-xl font-semibold text-text border-b border-border pb-2">{children}</h2>
  ),
  h3: ({ children }: React.PropsWithChildren) => (
    <h3 className="mb-2 mt-5 text-lg font-medium text-text">{children}</h3>
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
