import { useState } from 'react'
import { Search } from 'lucide-react'
import CourseCard from '../components/CourseCard'
import { useCourseIndex } from '../hooks/useCourses'
import { getProgress } from '../utils/courseLoader'

const DIFF_LABELS: Record<string, string> = {
  all: 'Todos', beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
}

const DIFF_STYLE: Record<string, string> = {
  all:          'border-border text-muted hover:border-green/50 hover:text-green',
  beginner:     'border-border text-muted hover:border-green/50  hover:text-green',
  intermediate: 'border-border text-muted hover:border-yellow/50 hover:text-yellow',
  advanced:     'border-border text-muted hover:border-red/50    hover:text-red',
}
const DIFF_ACTIVE: Record<string, string> = {
  all:          'border-green/50  bg-green/10  text-green',
  beginner:     'border-green/50  bg-green/10  text-green',
  intermediate: 'border-yellow/50 bg-yellow/10 text-yellow',
  advanced:     'border-red/50    bg-red/10    text-red',
}

export default function HomePage() {
  const { courses, loading, error } = useCourseIndex()
  const [search, setSearch] = useState('')
  const [diff, setDiff]   = useState<string>('all')
  const [lang, setLang]   = useState<string>('all')
  const progress = getProgress()

  const langs = ['all', ...Array.from(new Set(courses.map((c) => c.language)))]

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.tags?.some((t) => t.toLowerCase().includes(q))
    const matchDiff = diff === 'all' || c.difficulty === diff
    const matchLang = lang === 'all' || c.language === lang
    return matchSearch && matchDiff && matchLang
  })

  function getCompletedCount(courseId: string) {
    return Object.values(progress[courseId] ?? {}).filter(Boolean).length
  }

  return (
    <div className="min-h-screen bg-base">

      {/* ── Hero strip ──────────────────────────────────────────────────── */}
      <section className="border-b border-border px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="mb-1 text-xs uppercase tracking-widest text-muted">
            Plataforma de aprendizaje interactivo
          </p>
          <h1 className="mb-3 font-bold text-3xl tracking-tight text-text sm:text-4xl">
            Aprende a programar<br />
            <span className="text-green">con código real.</span>
          </h1>
          <p className="mb-6 max-w-xl text-sm text-muted leading-relaxed">
            Lecciones activas, editor integrado y labs con pruebas automáticas.
            Sin instalaciones — ejecuta C, Python y JavaScript directo en el navegador.
          </p>
          {/* Stats row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
            <span><span className="text-green font-bold">{courses.length}</span> cursos disponibles</span>
            <span><span className="text-green font-bold">3</span> lenguajes</span>
            <span><span className="text-green font-bold">100%</span> gratis &amp; open source</span>
          </div>
        </div>
      </section>

      {/* ── Filters + list container ────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-6">

        {/* Filter bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar cursos, tecnologías…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-border bg-surface pl-9 pr-3 py-2 text-xs text-text placeholder:text-muted focus:border-green/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Difficulty pills */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDiff(d)}
                className={`border px-2.5 py-1 text-xs uppercase tracking-wider transition-colors ${
                  diff === d ? DIFF_ACTIVE[d] : DIFF_STYLE[d]
                }`}
              >
                {DIFF_LABELS[d]}
              </button>
            ))}
          </div>

          {/* Language pills */}
          <div className="flex gap-1.5 flex-wrap">
            {langs.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`border px-2.5 py-1 text-xs uppercase tracking-wider transition-colors ${
                  lang === l
                    ? 'border-cyan/50 bg-cyan/10 text-cyan'
                    : 'border-border text-muted hover:border-cyan/40 hover:text-cyan'
                }`}
              >
                {l === 'all' ? 'TODOS' : l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && !error && (
          <p className="mb-2 text-xs text-muted border-b border-border pb-2">
            {filtered.length === courses.length
              ? `${courses.length} cursos`
              : `${filtered.length} de ${courses.length} cursos`
            }
          </p>
        )}

        {/* Course list */}
        <div className="border-t border-border">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse border-b border-border bg-surface" />
              ))}
            </>
          ) : error ? (
            <div className="border-b border-border p-6 text-center text-xs text-red">
              Error al cargar: {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted">
              — No se encontraron cursos —
            </div>
          ) : (
            filtered.map((c, i) => (
              <CourseCard key={c.id} course={c} completedCount={getCompletedCount(c.id)} index={i} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

