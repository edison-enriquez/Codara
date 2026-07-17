import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useRef, useEffect, useMemo, Fragment, type ReactNode } from 'react'
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
  const aw = new Set(a.split(' ').filter((w) => w.length > 3))
  const bw = b.split(' ').filter((w) => w.length > 3)
  let hits = 0
  for (const w of bw) if (aw.has(w)) hits++
  return hits >= 5 && hits / bw.length >= 0.5
}

/** Busca el rango de caracteres del segmento que más coincide con la cita. */
function findHighlightRange(segContent: string, ref: string): { start: number; end: number } | null {
  if (!ref || ref.length < 6) return null
  const refN = normalize(ref)
  const segN = normalize(segContent)
  if (!refN || !segN) return null

  // Caso ideal: la cita normalizada es subcadena del segmento normalizado.
  // Pero los rangos pueden no alinearse (porque normalizar cambia signos por
  // espacios), así que buscamos en el texto original.
  const re = normalizeRegex(ref)
  if (re) {
    const m = re.exec(segContent)
    if (m && m.index >= 0) return { start: m.index, end: m.index + m[0].length }
  }

  // Busca subsecuencia: la primera palabra (>=4 chars) de la cita en el seg
  const words = refN.split(' ').filter((w) => w.length >= 4)
  if (!words.length) return null
  const segNLowers = segContent.toLowerCase()
  // intenta encontrar la primera palabra clave
  for (const w of words) {
    const idx = segNLowers.indexOf(w)
    if (idx >= 0) {
      // Última palabra clave cercana para cerrar el rango
      const lastW = words[words.length - 1]
      const lastIdx = segNLowers.indexOf(lastW, idx)
      if (lastIdx >= idx) return { start: idx, end: lastIdx + lastW.length }
      return { start: idx, end: idx + w.length }
    }
  }
  return null
}

/** Construye una regex flexible (ignorando tildes/signos) para la cita. */
function normalizeRegex(ref: string): RegExp | null {
  if (!ref || ref.length < 6) return null
  // Escapa caracteres especiales y permite saltos/decoración entre palabras
  const cleaned = ref.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const parts = cleaned.split(/\s+/).filter((w) => w.length > 2)
  if (parts.length < 2) return null
  let pattern = ''
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    pattern += (i ? '[^a-z]+?' : '') + p
  }
  // Permitir coincidencia parcial: aseguramos match no greedy del final
  return new RegExp(pattern, 'i')
}

/**
 * Divide el contenido del segmento en tres partes y envuelve el rango medio
 * en <mark> estilizado, para efecto resaltador al estilo de marcador.
 * El segmento es texto plano (prose): lo rendereamos con ReactMarkdown pero
 * antes envolvemos la cita en una marca sintética que transformamos a <mark>.
 */
function insertHighlightMark(markdown: string, range: { start: number; end: number } | null): string {
  if (!range) return markdown
  const before = markdown.slice(0, range.start)
  const hit = markdown.slice(range.start, range.end)
  const after = markdown.slice(range.end)
  // Usamos una sintaxis especial (*‹›*) para marcar el hit y lo reemplazaremos
  // en los componentes de markdown por un <mark>
  return `${before}==HL==${hit}==/HL==${after}`
}

export default function MarkdownRenderer({ content, highlight }: Props) {
  const segments = segmentMarkdown(content)
  const activeIdx = highlight
    ? segments.findIndex((s) => s.type === 'prose' && proseMatches(s.content, highlight))
    : -1

  // Rango exacto a resaltar dentro del segmento activo
  const activeRange = useMemo(() => {
    if (activeIdx < 0 || !highlight) return null
    const seg = segments[activeIdx]
    if (seg.type !== 'prose') return null
    return findHighlightRange(seg.content, highlight)
  }, [activeIdx, highlight, segments])

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
            // Inyecta marca de resaltado en el segmento activo
            const proseWithMark = isActive && activeRange
              ? insertHighlightMark(seg.content, activeRange)
              : seg.content
            return (
              <div
                key={idx}
                data-chunk={idx}
                className={`rounded-lg transition-all duration-500 ${
                  isActive ? 'bg-yellow/5 px-3 py-2 -mx-3' : ''
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={isActive ? hlComponents : mdComponents}>
                  {proseWithMark}
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

// ─── Resaltado de texto (==HL==...==/HL== → <mark> estilo resaltador) ────────

/** Recursivamente reemplaza los nodos de texto que contienen la marca HL. */
function replaceHLInNode(node: ReactNode): ReactNode {
  if (typeof node === 'string') {
    const marker = '==HL=='
    const endMarker = '==/HL=='
    const parts: ReactNode[] = []
    let cursor = 0
    let i = -1
    while ((i = node.indexOf(marker, cursor)) >= 0) {
      const e = node.indexOf(endMarker, i + marker.length)
      if (e < 0) break
      if (i > cursor) parts.push(node.slice(cursor, i))
      const hit = node.slice(i + marker.length, e)
      parts.push(
        <mark
          key={parts.length}
          className="rounded-sm px-0.5 transition-all duration-700"
          style={{
            background: 'rgba(255, 224, 102, 0.5)',
            color: 'inherit',
            boxShadow: '0 0 0 1px rgba(255, 224, 102, 0.55)',
          }}
        >
          {hit}
        </mark>
      )
      cursor = e + endMarker.length
    }
    if (parts.length === 0) return node
    if (cursor < node.length) parts.push(node.slice(cursor))
    return <>{parts}</>
  }
  if (Array.isArray(node)) return node.map((c, idx) => <Fragment key={idx}>{replaceHLInNode(c)}</Fragment>)
  return node
}

/** Wrapper para <p> que inyecta el highlighter dentro de los textos hijos. */
function HighlightedP({ children }: { children?: ReactNode }) {
  return <p className="mb-4 leading-7 text-text/85">{replaceHLInNode(children)}</p>
}

/** Wrapper para <li> que soporta el highlighter. */
function HighlightedLi({ children }: { children?: ReactNode }) {
  return <li className="leading-7">{replaceHLInNode(children)}</li>
}

const hlComponents = {
  ...mdComponents,
  p: HighlightedP,
  li: HighlightedLi,
}
