import { useState } from 'react'
import { Search, Zap, Code2, FlaskConical } from 'lucide-react'
import CourseCard from '../components/CourseCard'
import { useCourseIndex } from '../hooks/useCourses'
import { getProgress } from '../utils/courseLoader'
import type { Difficulty } from '../types'

const DIFF_LABELS: Record<string, string> = {
  all: 'Todos', beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
}

export default function HomePage() {
  const { courses, loading, error } = useCourseIndex()
  const [search, setSearch] = useState('')
  const [diff, setDiff] = useState<string>('all')
  const [lang, setLang] = useState<string>('all')
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
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-blue/5 to-base py-16 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue/20 bg-blue/10 px-3 py-1 text-xs text-blue">
            <Zap size={12} fill="currentColor" />
            Aprende haciendo — código real desde el primer día
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-text sm:text-5xl">
            Domina la programación<br />
            <span className="text-blue">con práctica interactiva</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-muted">
            Cursos con lecciones activas, editor integrado y laboratorios con pruebas automáticas. Sin instalaciones, directo en el navegador.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted">
            <Stat icon={<Code2 size={14} />} label="Código ejecutable en el navegador" />
            <Stat icon={<FlaskConical size={14} />} label="Laboratorios con pruebas automáticas" />
            <Stat icon={<span className="text-yellow text-sm">💡</span>} label="Sistema de pistas progresivo" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Filters */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Buscar cursos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text placeholder:text-muted focus:border-blue focus:outline-none"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDiff(d)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  diff === d
                    ? 'border-blue bg-blue/15 text-blue'
                    : 'border-border text-muted hover:border-blue/40 hover:text-text'
                }`}
              >
                {DIFF_LABELS[d]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {langs.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-lg border px-3 py-1.5 text-xs capitalize transition-colors ${
                  lang === l
                    ? 'border-purple bg-purple/15 text-purple'
                    : 'border-border text-muted hover:border-purple/40 hover:text-text'
                }`}
              >
                {l === 'all' ? 'Todos los lenguajes' : l}
              </button>
            ))}
          </div>
        </div>

        {/* Course grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-xl border border-border bg-surface" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red/20 bg-red/5 p-6 text-center text-sm text-red">
            Error al cargar los cursos: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted">
            No se encontraron cursos con esos filtros.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <CourseCard key={c.id} course={c} completedCount={getCompletedCount(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      {label}
    </div>
  )
}
