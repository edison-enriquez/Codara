/**
 * Syntax highlighter wrapper — usa highlight.js con solo los lenguajes
 * necesarios para no inflar el bundle. Devuelve HTML seguro (hljs escapa).
 */
import hljs from 'highlight.js/lib/core'
import type { LanguageFn } from 'highlight.js'
import langC from 'highlight.js/lib/languages/c'
import langCpp from 'highlight.js/lib/languages/cpp'
import langJs from 'highlight.js/lib/languages/javascript'
import langTs from 'highlight.js/lib/languages/typescript'
import langPy from 'highlight.js/lib/languages/python'
import langBash from 'highlight.js/lib/languages/bash'

// Los tipos de hljs son estrictos con $pattern en keywords — cast necesario
const reg = (name: string, lang: unknown) =>
  hljs.registerLanguage(name, lang as LanguageFn)

reg('c',          langC)
reg('cpp',        langCpp)
reg('javascript', langJs)
reg('js',         langJs)
reg('typescript', langTs)
reg('ts',         langTs)
reg('python',     langPy)
reg('py',         langPy)
reg('bash',       langBash)
reg('sh',         langBash)

const ALIAS: Record<string, string> = { js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash' }

export function highlightCode(code: string, lang: string): string {
  const resolved = ALIAS[lang] ?? lang
  if (hljs.getLanguage(resolved)) {
    return hljs.highlight(code, { language: resolved, ignoreIllegals: true }).value
  }
  // fallback: escapar HTML plano
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
