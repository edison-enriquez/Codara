import type {
  CourseData,
  CourseSummary,
  LessonFrontmatter,
  ParsedLesson,
  Segment,
} from '../types'

// ─── Frontmatter parser (subset YAML con soporte de objetos anidados) ────────

export function parseFrontmatter(raw: string): { meta: LessonFrontmatter; content: string } {
  const emptyMeta: LessonFrontmatter = { id: '', title: '', type: 'lesson', language: 'javascript' }
  if (!raw.startsWith('---')) return { meta: emptyMeta, content: raw }

  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { meta: emptyMeta, content: raw }

  const yamlStr = raw.slice(4, end)
  const content = raw.slice(end + 4).trim()

  const parsed = parseYamlSubset(yamlStr)
  return { meta: parsed as unknown as LessonFrontmatter, content }
}

/** Parser YAML simplificado que soporta:
 *  - Claves simples: key: value
 *  - Listas de strings: - item
 *  - Listas de objetos:
 *      - id: foo
 *        description: bar
 */
function parseYamlSubset(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = yaml.split('\n')
  let i = 0

  function indentOf(line: string): number {
    return line.match(/^(\s*)/)?.[1].length ?? 0
  }

  function unquote(s: string): string {
    const t = s.trim()
    // Convertir booleans sin comillas
    if (t === 'true') return true as unknown as string
    if (t === 'false') return false as unknown as string
    // Quitar comillas y procesar escapes de strings YAML/JSON
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      const inner = t.slice(1, -1)
      // Convertir escapes: \\ → \, \n → newline, \t → tab, \" → "
      return inner
        .replace(/\\\\/g, '\x00BSLASH\x00')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\x00BSLASH\x00/g, '\\')
    }
    return t
  }

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue }

    const indent = indentOf(line)
    const trimmed = line.trim()

    // Top-level key: value or key:
    if (indent === 0 && !trimmed.startsWith('-')) {
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx === -1) { i++; continue }
      const key = trimmed.slice(0, colonIdx).trim()
      const val = trimmed.slice(colonIdx + 1).trim()

      if (val) {
        result[key] = unquote(val)
        i++
      } else {
        // Valor es lista o objeto — mirar las líneas siguientes
        i++
        const items: unknown[] = []

        while (i < lines.length) {
          const childLine = lines[i]
          if (!childLine.trim() || childLine.trim().startsWith('#')) { i++; continue }
          const childIndent = indentOf(childLine)
          if (childIndent === 0 && !childLine.trim().startsWith('-')) break

          const childTrimmed = childLine.trim()

          if (childTrimmed.startsWith('- ')) {
            // Puede ser un string simple o inicio de objeto
            const afterDash = childTrimmed.slice(2).trim()
            if (afterDash.includes(':')) {
              // Objeto en lista: "- key: value"
              const obj: Record<string, unknown> = {}
              const firstColon = afterDash.indexOf(':')
              obj[afterDash.slice(0, firstColon).trim()] = unquote(afterDash.slice(firstColon + 1))
              i++
              // Continuar leyendo propiedades del mismo objeto (líneas con mayor indentación)
              while (i < lines.length) {
                const propLine = lines[i]
                if (!propLine.trim() || propLine.trim().startsWith('#')) { i++; continue }
                const propIndent = indentOf(propLine)
                if (propIndent <= childIndent) break
                const propTrimmed = propLine.trim()
                if (propTrimmed.startsWith('- ')) break
                const pColon = propTrimmed.indexOf(':')
                if (pColon !== -1) {
                  obj[propTrimmed.slice(0, pColon).trim()] = unquote(propTrimmed.slice(pColon + 1))
                }
                i++
              }
              items.push(obj)
            } else {
              // String simple
              items.push(unquote(afterDash))
              i++
            }
          } else {
            break
          }
        }

        result[key] = items
      }
    } else {
      i++
    }
  }

  return result
}

// ─── Markdown segmenter ──────────────────────────────────────────────────────

export function segmentMarkdown(markdown: string): Segment[] {
  const segments: Segment[] = []
  const lines = markdown.split('\n')
  let i = 0
  let prose: string[] = []

  const flushProse = () => {
    if (prose.length) {
      segments.push({ type: 'prose', content: prose.join('\n') })
      prose = []
    }
  }

  while (i < lines.length) {
    const line = lines[i]
    const fenceMatch = line.match(/^```(\w*)(?:\s+(.*))?$/)

    if (fenceMatch) {
      flushProse()
      const lang = fenceMatch[1] || ''
      const meta = (fenceMatch[2] || '').trim().toLowerCase()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i])
        i++
      }
      i++ // skip closing ```
      const content = code.join('\n')

      if (lang === 'hints') {
        segments.push({ type: 'hints', items: content.split('\n').filter((l) => l.trim()) })
      } else if (meta.startsWith('exec')) {
        segments.push({ type: 'exec', lang, content })
      } else if (meta.startsWith('lab')) {
        segments.push({ type: 'lab', lang, content })
      } else if (meta.startsWith('test')) {
        segments.push({ type: 'tests', lang, content })
      } else {
        segments.push({ type: 'code', lang, content })
      }
    } else {
      prose.push(line)
      i++
    }
  }

  flushProse()
  return segments
}

// ─── Parse a full lesson markdown file ───────────────────────────────────────

export function parseLesson(raw: string): ParsedLesson {
  const { meta, content } = parseFrontmatter(raw)
  const segments = segmentMarkdown(content)

  let starterCode: string | undefined
  let testCode: string | undefined
  const displaySegments: Segment[] = []

  for (const seg of segments) {
    if (seg.type === 'lab') {
      starterCode = seg.content
    } else if (seg.type === 'tests') {
      testCode = seg.content
    } else {
      displaySegments.push(seg)
    }
  }

  // Re-assemble display content for prose segments (used in lesson view)
  const displayContent = displaySegments
    .map((s) => {
      if (s.type === 'prose') return s.content
      if (s.type === 'code') return `\`\`\`${s.lang}\n${s.content}\n\`\`\``
      if (s.type === 'exec') return `\`\`\`${s.lang} exec\n${s.content}\n\`\`\``
      if (s.type === 'hints') return `\`\`\`hints\n${s.items.join('\n')}\n\`\`\``
      return ''
    })
    .join('\n')

  return { meta, content, starterCode, testCode, displayContent }
}

// ─── Loaders ─────────────────────────────────────────────────────────────────

export async function loadCourseIndex(): Promise<CourseSummary[]> {
  const res = await fetch('/courses/index.json')
  if (!res.ok) throw new Error('No se pudo cargar el índice de cursos')
  return res.json()
}

export async function loadCourseData(courseId: string): Promise<CourseData> {
  const res = await fetch(`/courses/${courseId}/meta.json`)
  if (!res.ok) throw new Error(`No se pudo cargar el curso "${courseId}"`)
  return res.json()
}

export async function loadLessonFile(courseId: string, fileName: string): Promise<ParsedLesson> {
  const res = await fetch(`/courses/${courseId}/${fileName}`)
  if (!res.ok) throw new Error(`No se pudo cargar la lección "${fileName}"`)
  const raw = await res.text()
  return parseLesson(raw)
}

// ─── Progress (localStorage) ─────────────────────────────────────────────────

const PROGRESS_KEY = 'codara_progress'

export function getProgress(): Record<string, Record<string, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function markComplete(courseId: string, lessonId: string) {
  const p = getProgress()
  if (!p[courseId]) p[courseId] = {}
  p[courseId][lessonId] = true
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
}

export function isComplete(courseId: string, lessonId: string): boolean {
  return !!getProgress()[courseId]?.[lessonId]
}
