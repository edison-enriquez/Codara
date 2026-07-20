import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Terminal, FileJson, Code2, Presentation, Search, CheckCircle2, Circle, BookOpen, FlaskConical, ChevronLeft, Play, Users, X, type LucideIcon } from 'lucide-react'
import { isComplete, cleanTitle } from '../utils/courseLoader'
import { fetchCounts } from '../utils/passedCounts'
import type { CourseData, LessonMeta } from '../types'

const DIFF_LABEL: Record<string, string> = {
  beginner: 'Fácil', intermediate: 'Media', advanced: 'Difícil',
}
const DIFF_BADGE: Record<string, string> = {
  beginner:     'text-green  bg-green/10  border-green/30',
  intermediate: 'text-yellow bg-yellow/10 border-yellow/30',
  advanced:     'text-red    bg-red/10    border-red/30',
}

const ICON_MAP: Record<string, LucideIcon> = {
  Terminal,
  FileJson,
  Code2,
  Presentation,
}

// TODO(usuarios): desbloqueo secuencial / candados por reto. Diferido hasta que
// existan cuentas de usuario: el gating debe basarse en progreso del usuario, no
// solo en localStorage anónimo. Al implementarlo: añadir estado "bloqueado" en la
// fila (icono Lock, deshabilitar el Link) según el reto previo completado, y
// hacerlo configurable por curso (course.json: { "sequential": true }).

type TypeFilter = 'all' | 'lesson' | 'lab'

export default function CourseIndex({ course, courseId }: { course: CourseData; courseId: string }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [diff, setDiff] = useState<string>('all')
  const [tag, setTag] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let alive = true
    fetchCounts(courseId).then((c) => { if (alive) setCounts(c) })
    return () => { alive = false }
  }, [courseId])

  const lessons = course.lessons
  const showPassed = Object.keys(counts).length > 0

  const chapterOf = useMemo(() => {
    const map: Record<string, string> = {}
    course.chapters?.forEach((ch) => ch.lessons.forEach((l) => { map[l.id] = ch.title }))
    return map
  }, [course])

  const done = lessons.filter((l) => isComplete(courseId, l.id)).length
  const total = lessons.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const nextLesson = lessons.find((l) => !isComplete(courseId, l.id)) ?? lessons[0]
  const started = done > 0

  const filtered = lessons.filter((l) => {
    const q = search.toLowerCase()
    const matchSearch = !q || l.title.toLowerCase().includes(q) || l.tags?.some((t) => t.toLowerCase().includes(q))
    const matchType = typeFilter === 'all' || l.type === typeFilter
    const matchDiff = diff === 'all' || l.difficulty === diff
    const matchTag = !tag || l.tags?.includes(tag)
    return matchSearch && matchType && matchDiff && matchTag
  })

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto bg-base">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted hover:text-green transition-colors">
          <ChevronLeft size={12} /> Todos los cursos
        </Link>

        <div className="mb-5 flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-elevated">
            {(() => {
              const Icon = ICON_MAP[course.icon]
              return Icon ? <Icon size={24} /> : <span className="text-3xl">{course.icon}</span>
            })()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-bold text-text sm:text-2xl">{course.title}</h1>
            <p className="mt-1 text-sm text-muted">{course.description}</p>
          </div>
        </div>

        {/* Progreso + Empezar/Continuar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
              <span className="font-bold text-text">{done} / {total}</span> retos completados
              <span className="text-green">{pct}%</span>
            </div>
            <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-elevated">
              <div className="h-full rounded-full bg-green transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          {nextLesson && (
            <Link
              to={`/course/${courseId}/${nextLesson.id}`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-green/50 bg-green/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-green hover:bg-green/20 transition-colors"
            >
              <Play size={12} fill="currentColor" />
              {started ? 'Continuar' : 'Empezar'}
            </Link>
          )}
        </div>

        {/* Filtros */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar por título o tema…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-border bg-surface pl-9 pr-3 py-2 text-xs text-text placeholder:text-muted focus:border-green/50 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex gap-1.5">
            {([['all', 'Todos'], ['lesson', 'Lecciones'], ['lab', 'Labs']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setTypeFilter(v)}
                className={`border px-2.5 py-1 text-xs uppercase tracking-wider transition-colors ${
                  typeFilter === v ? 'border-green/50 bg-green/10 text-green' : 'border-border text-muted hover:border-green/40 hover:text-green'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDiff(d)}
                className={`border px-2.5 py-1 text-xs uppercase tracking-wider transition-colors ${
                  diff === d ? 'border-cyan/50 bg-cyan/10 text-cyan' : 'border-border text-muted hover:border-cyan/40 hover:text-cyan'
                }`}
              >
                {d === 'all' ? 'Dif.' : DIFF_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro de tag activo */}
        {tag && (
          <button
            onClick={() => setTag(null)}
            className="mb-2 inline-flex items-center gap-1 rounded-full border border-purple/40 bg-purple/10 px-2.5 py-1 text-xs text-purple hover:bg-purple/20 transition-colors"
          >
            tema: {tag} <X size={11} />
          </button>
        )}

        {/* Tabla */}
        <div className="overflow-hidden border-t border-border">
          <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted">
            <span className="w-5 text-center">✓</span>
            <span className="w-6 text-right">#</span>
            <span className="flex-1">Título</span>
            <span className="hidden sm:block">Etiquetas</span>
            {showPassed && <span className="w-14 text-right">resuelto</span>}
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted">— Sin resultados —</div>
          ) : (
            filtered.map((l) => (
              <Row
                key={l.id}
                lesson={l}
                courseId={courseId}
                language={course.language}
                chapter={chapterOf[l.id]}
                passed={showPassed ? (counts[l.id] ?? 0) : null}
                onTag={setTag}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Row({
  lesson, courseId, language, chapter, passed, onTag,
}: {
  lesson: LessonMeta
  courseId: string
  language: string
  chapter?: string
  passed: number | null
  onTag: (t: string) => void
}) {
  const completed = isComplete(courseId, lesson.id)
  const isLab = lesson.type === 'lab'

  return (
    <Link
      to={`/course/${courseId}/${lesson.id}`}
      className="group flex items-center gap-3 border-b border-border px-3 py-2.5 transition-colors hover:bg-surface"
    >
      <span className="w-5 text-center">
        {completed
          ? <CheckCircle2 size={14} className="mx-auto text-green" />
          : <Circle size={14} className="mx-auto text-muted/40" />}
      </span>

      <span className="w-6 text-right text-[11px] tabular-nums text-muted/60">{lesson.order}</span>

      <span className="flex min-w-0 flex-1 items-center gap-2">
        {isLab
          ? <FlaskConical size={13} className="shrink-0 text-cyan/70" />
          : <BookOpen size={13} className="shrink-0 text-muted/60" />}
        <span className="min-w-0">
          <span className={`block truncate text-sm ${completed ? 'text-muted line-through' : 'text-text group-hover:text-green'} transition-colors`}>
            {cleanTitle(lesson.title)}
          </span>
          {chapter && <span className="block truncate text-[10px] text-muted/50">{chapter}</span>}
        </span>
      </span>

      {/* Etiquetas */}
      <span className="hidden shrink-0 items-center gap-1 sm:flex">
        <Tag className="text-orange bg-orange/10 border-orange/30">{language}</Tag>
        <Tag className={isLab ? 'text-cyan bg-cyan/10 border-cyan/30' : 'text-muted bg-elevated border-border'}>
          {isLab ? 'lab' : 'teoría'}
        </Tag>
        {lesson.difficulty && (
          <Tag className={DIFF_BADGE[lesson.difficulty] ?? 'text-muted bg-elevated border-border'}>
            {DIFF_LABEL[lesson.difficulty] ?? lesson.difficulty}
          </Tag>
        )}
        {lesson.tags?.map((t) => (
          <button
            key={t}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTag(t) }}
            className="rounded border border-purple/30 bg-purple/10 px-1.5 py-0.5 text-[10px] font-medium text-purple hover:bg-purple/20 transition-colors"
          >
            {t}
          </button>
        ))}
      </span>

      {/* Passed */}
      {passed !== null && (
        <span className="flex w-14 items-center justify-end gap-1 text-[11px] tabular-nums text-muted">
          <Users size={10} className="text-muted/50" />
          {passed}
        </span>
      )}
    </Link>
  )
}

function Tag({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${className}`}>{children}</span>
  )
}
