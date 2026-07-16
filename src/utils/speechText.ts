import { segmentMarkdown } from './courseLoader'

/** Convierte el markdown de una lección en fragmentos de texto legible en voz alta.
 *  - Omite bloques de código (exec/code/tests/etc).
 *  - Limpia sintaxis markdown (encabezados, listas, énfasis, enlaces).
 *  - Devuelve varios chunks para mejor manejo del speechSynthesis y progreso.
 */
export function extractReadableChunks(markdown: string): string[] {
  const segments = segmentMarkdown(markdown)
  const chunks: string[] = []

  for (const seg of segments) {
    if (seg.type === 'hints') {
      if (seg.items.length) chunks.push('Pistas. ' + seg.items.join('. '))
      continue
    }
    if (seg.type !== 'prose') continue
    const text = markdownToPlainText(seg.content)
    if (text.trim()) chunks.push(text)
  }

  return chunks
}

function markdownToPlainText(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      let l = line
      // Encabezados: "## Título" -> "Título"
      l = l.replace(/^#{1,6}\s+/, '')
      // Listas: "- item" / "1. item" -> "• item"
      l = l.replace(/^\s*[-*+]\s+/, '• ')
      l = l.replace(/^\s*\d+\.\s+/, '• ')
      // Blockquote
      l = l.replace(/^\s*>\s?/, '')
      // Enlaces [texto](url) -> texto
      l = l.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Imágenes ![alt](url) -> "" (omitir)
      l = l.replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      // Negrita/cursiva código inline
      l = l.replace(/\*\*([^*]+)\*\*/g, '$1')
      l = l.replace(/__([^_]+)__/g, '$1')
      l = l.replace(/\*([^*]+)\*/g, '$1')
      l = l.replace(/_([^_]+)_/g, '$1')
      l = l.replace(/`([^`]+)`/g, '$1')
      // Línea divisoria
      if (/^[-*_]{3,}$/.test(l.trim())) return ''
      return l
    })
    .filter((l) => l.trim())
    .join('. ')
    .replace(/\s+/g, ' ')
    .trim()
}