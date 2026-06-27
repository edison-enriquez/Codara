#!/usr/bin/env node
/**
 * build-content.mjs — Compila la CAPA 1 (contenido canónico) en la CAPA 2 (manifiesto).
 *
 *   content/<curso>/course.json   (fuente de verdad: metadata + estructura ordenada)
 *   content/<curso>/**.md         (lecciones, con frontmatter)
 *        │
 *        ▼  este script
 *   public/courses/index.json     (catálogo, conteos DERIVADOS — nunca a mano)
 *   public/courses/<curso>/meta.json
 *   public/courses/<curso>/**.md  (copiados verbatim)
 *
 * Reglas:
 *  - El orden de las lecciones = su posición en course.json (no se duplica `order`).
 *  - id / title / type salen del frontmatter de cada .md (única fuente de verdad).
 *  - Si una lección referenciada no existe o su frontmatter es inválido → falla el build.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'content')
const OUT = join(ROOT, 'public', 'courses')

const VALID_TYPES = new Set(['lesson', 'lab'])

/** Errores acumulados para reportar todo de una vez. */
const errors = []
function fail(msg) { errors.push(msg) }

function unquote(v) {
  v = v.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1)
  return v
}

/** Extrae claves de nivel superior del frontmatter YAML: escalares y listas (inline o en bloque). */
function readFrontmatter(raw, file) {
  if (!raw.startsWith('---')) { fail(`${file}: falta el frontmatter (--- al inicio)`); return {} }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) { fail(`${file}: frontmatter sin cierre (---)`); return {} }
  const lines = raw.slice(4, end).split('\n')
  const meta = {}
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || /^\s/.test(line) || line.trim().startsWith('#') || line.trimStart().startsWith('-')) continue
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const val = line.slice(colon + 1).trim()

    if (!val) {
      // Lista en bloque: líneas siguientes "  - item"
      const items = []
      let j = i + 1
      while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
        items.push(unquote(lines[j].replace(/^\s+-\s+/, '')))
        j++
      }
      if (items.length) { meta[key] = items; i = j - 1 }
      continue
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      // Lista inline: [a, b, c]
      meta[key] = val.slice(1, -1).split(',').map(unquote).filter((s) => s !== '')
      continue
    }
    meta[key] = unquote(val)
  }
  return meta
}

/** Devuelve la metadata de una lección a partir de su archivo .md. */
function loadLesson(courseDir, relPath) {
  const abs = join(courseDir, relPath)
  if (!existsSync(abs)) { fail(`${relPath}: archivo no encontrado`); return null }
  const fm = readFrontmatter(readFileSync(abs, 'utf8'), relPath)
  if (!fm.id) fail(`${relPath}: frontmatter sin "id"`)
  if (!fm.title) fail(`${relPath}: frontmatter sin "title"`)
  if (!fm.type) fail(`${relPath}: frontmatter sin "type"`)
  else if (!VALID_TYPES.has(fm.type)) fail(`${relPath}: type "${fm.type}" inválido (usa lesson | lab)`)
  const tags = Array.isArray(fm.tags) ? fm.tags : undefined
  return { id: fm.id, title: fm.title, type: fm.type, difficulty: fm.difficulty, tags, file: relPath, _abs: abs }
}

function copyInto(srcAbs, destAbs) {
  mkdirSync(dirname(destAbs), { recursive: true })
  // Normalizar finales de línea a LF: los .md editados en Windows traen CRLF,
  // que rompe el parseo de fences (``` ) en el cliente. Mantiene la salida
  // consistente con la build de CI (Linux).
  if (destAbs.endsWith('.md')) {
    writeFileSync(destAbs, readFileSync(srcAbs, 'utf8').replace(/\r\n?/g, '\n'))
  } else {
    copyFileSync(srcAbs, destAbs)
  }
}

// ─── Compilación ─────────────────────────────────────────────────────────────

const courseDirs = readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()

// Limpiar salida previa y regenerar
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const catalog = []

for (const courseId of courseDirs) {
  const courseDir = join(SRC, courseId)
  const cfgPath = join(courseDir, 'course.json')
  if (!existsSync(cfgPath)) { fail(`${courseId}: falta course.json`); continue }

  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
  if (cfg.id !== courseId) fail(`${courseId}/course.json: id "${cfg.id}" no coincide con la carpeta`)

  let order = 0
  const allLessons = [] // plano, para conteos
  const emit = (relPath) => {
    const lesson = loadLesson(courseDir, relPath)
    if (!lesson) return null
    order += 1
    copyInto(lesson._abs, join(OUT, courseId, relPath))
    const out = { id: lesson.id, title: lesson.title, type: lesson.type, order, file: lesson.file }
    if (lesson.difficulty) out.difficulty = lesson.difficulty
    if (lesson.tags?.length) out.tags = lesson.tags
    allLessons.push(out)
    return out
  }

  const meta = {
    id: cfg.id, title: cfg.title, description: cfg.description,
    difficulty: cfg.difficulty, language: cfg.language, category: cfg.category,
    icon: cfg.icon, estimatedTime: cfg.estimatedTime,
  }
  if (cfg.notebook) meta.notebook = true

  if (Array.isArray(cfg.chapters)) {
    meta.chapters = cfg.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      lessons: ch.lessons.map(emit).filter(Boolean),
    }))
  } else if (Array.isArray(cfg.lessons)) {
    meta.lessons = cfg.lessons.map(emit).filter(Boolean)
  } else {
    fail(`${courseId}/course.json: debe declarar "chapters" o "lessons"`)
  }

  writeFileSync(join(OUT, courseId, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')

  catalog.push({
    id: cfg.id, title: cfg.title, description: cfg.description,
    difficulty: cfg.difficulty, language: cfg.language, category: cfg.category,
    icon: cfg.icon,
    lessonsCount: allLessons.filter((l) => l.type === 'lesson').length,
    labsCount: allLessons.filter((l) => l.type === 'lab').length,
    estimatedTime: cfg.estimatedTime,
    tags: cfg.tags ?? [],
  })
}

if (errors.length) {
  console.error(`\n✗ build-content: ${errors.length} error(es)\n`)
  for (const e of errors) console.error('  • ' + e)
  console.error('')
  process.exit(1)
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify(catalog, null, 2) + '\n')

const totalLessons = catalog.reduce((n, c) => n + c.lessonsCount + c.labsCount, 0)
console.log(`✓ build-content: ${catalog.length} cursos, ${totalLessons} lecciones → ${relative(ROOT, OUT)}`)
