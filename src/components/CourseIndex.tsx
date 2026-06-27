import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, CheckCircle2, Circle, BookOpen, FlaskConical, ChevronLeft, Play } from 'lucide-react'
import { isComplete } from '../utils/courseLoader'
import type { CourseData, LessonMeta } from '../types'

const DIFF_LABEL: Record<string, string> = {
  beginner: 'Fácil', intermediate: 'Media', advanced: 'Difícil',
}
const DIFF_BADGE: Record<string, string> = {
  beginner:     'text-green  bg-green/10  border-green/30',
  intermediate: 'text-yellow bg-yellow/10 border-yellow/30',
  advanced:     'text-red    bg-red/10    border-red/30',
}

type TypeFilter = 'all' | 'lesson' | 'lab'

export default function CourseIndex({ course, courseId }: { course: CourseData; courseId: string }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [diff, setDiff] = useState<string>('all')

  const lessons = course.lessons
  const chapterOf = useMemo(() => {
    const map: Record<string, string> = {}
    course.chapters?.forEach((ch) => ch.lessons.forEach((l) => { map[l.id] = ch.title }))
    return map
  }, [course])

  const done = lessons.filter((l) => isComplete(courseId, l.id)).length
  const total = lessons.length
  const pct = total ? Math.round((done / total) * 100) : 0

  // Primera lección sin completar (para "Continuar"), o la primera.
  const nextLesson = lessons.find((l) => !isComplete(courseId, l.id)) ?? lessons[0]
  const started = done > 0

  const filtered = lessons.filter((l) => {
    const q = search.toLowerCase()
    const matchSearch = !q || l.title.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || l.type === typeFilter
    const matchDiff = diff === 'all' || l.difficulty === diff
    return matchSearch && matchType && matchDiff
  })

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto bg-base">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted hover:text-green transition-colors">
          <ChevronLeft size={12} /> Todos los cursos
        </Link>

        <div className="mb-5 flex items-start gap-4">
          <span className="text-3xl">{course.icon}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-text">{course.title}</h1>
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

        {/* ── Filtros ─────────────────────────────────────────────────── */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar lección o lab…"
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
                  diff === d
                    ? 'border-cyan/50 bg-cyan/10 text-cyan'
                    : 'border-border text-muted hover:border-cyan/40 hover:text-cyan'
                }`}
              >
                {d === 'all' ? 'Dif.' : DIFF_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tabla ───────────────────────────────────────────────────── */}
        <div className="overflow-hidden border-t border-border">
          {/* head */}
          <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted">
            <span className="w-5 text-center">✓</span>
            <span className="w-6 text-right">#</span>
            <span className="flex-1">Título</span>
            <span className="hidden sm:block">Etiquetas</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted">— Sin resultados —</div>
          ) : (
            filtered.map((l) => (
              <Row key={l.id} lesson={l} courseId={courseId} language={course.language} chapter={chapterOf[l.id]} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Row({
  lesson, courseId, language, chapter,
}: {
  lesson: LessonMeta
  courseId: string
  language: string
  chapter?: string
}) {
  const completed = isComplete(courseId, lesson.id)
  const isLab = lesson.type === 'lab'

  return (
    <Link
      to={`/course/${courseId}/${lesson.id}`}
      className="group flex items-center gap-3 border-b border-border px-3 py-2.5 transition-colors hover:bg-surface"
    >
      {/* status */}
      <span className="w-5 text-center">
        {completed
          ? <CheckCircle2 size={14} className="mx-auto text-green" />
          : <Circle size={14} className="mx-auto text-muted/40" />}
      </span>

      {/* order */}
      <span className="w-6 text-right text-[11px] tabular-nums text-muted/60">{lesson.order}</span>

      {/* title + chapter */}
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {isLab
          ? <FlaskConical size={13} className="shrink-0 text-cyan/70" />
          : <BookOpen size={13} className="shrink-0 text-muted/60" />}
        <span className="min-w-0">
          <span className={`block truncate text-sm ${completed ? 'text-muted line-through' : 'text-text group-hover:text-green'} transition-colors`}>
            {lesson.title}
          </span>
          {chapter && <span className="block truncate text-[10px] text-muted/50">{chapter}</span>}
        </span>
      </span>

      {/* tags */}
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
      </span>
    </Link>
  )
}

function Tag({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${className}`}>{children}</span>
  )
}
