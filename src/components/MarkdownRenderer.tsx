import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import InteractiveCode from './InteractiveCode'
import type { Segment } from '../types'
import { segmentMarkdown } from '../utils/courseLoader'

interface Props {
  content: string
}

export default function MarkdownRenderer({ content }: Props) {
  const segments = segmentMarkdown(content)

  return (
    <div className="lesson-prose">
      {segments.map((seg, idx) => {
        switch (seg.type) {
          case 'prose':
            return (
              <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]} components={mdComponents}>
                {seg.content}
              </ReactMarkdown>
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
    // Block code inside prose (not segmented) - shouldn't reach here often
    const lang = (className ?? '').replace('language-', '')
    return <InteractiveCode lang={lang} code={String(children).trimEnd()} />
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
