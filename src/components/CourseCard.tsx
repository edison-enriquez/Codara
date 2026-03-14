import { Link } from 'react-router-dom'
import { Clock, BookOpen, FlaskConical, ChevronRight } from 'lucide-react'
import type { CourseSummary } from '../types'

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
}
const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: 'text-green border-green/30 bg-green/10',
  intermediate: 'text-yellow border-yellow/30 bg-yellow/10',
  advanced: 'text-red border-red/30 bg-red/10',
}

interface Props {
  course: CourseSummary
  completedCount?: number
}

export default function CourseCard({ course, completedCount = 0 }: Props) {
  const total = course.lessonsCount + course.labsCount
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  return (
    <Link
      to={`/course/${course.id}`}
      className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-all hover:border-blue/40 hover:shadow-lg hover:shadow-blue/5"
    >
      {/* Icon + difficulty */}
      <div className="mb-4 flex items-start justify-between">
        <span className="text-3xl">{course.icon}</span>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLOR[course.difficulty]}`}>
          {DIFFICULTY_LABEL[course.difficulty]}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-1 font-semibold text-text group-hover:text-blue transition-colors">{course.title}</h3>
      <p className="mb-4 line-clamp-2 text-sm text-muted">{course.description}</p>

      {/* Tags */}
      {course.tags?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {course.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded px-1.5 py-0.5 text-xs bg-elevated text-muted">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {completedCount > 0 && (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Progreso</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-elevated overflow-hidden">
            <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-auto flex items-center gap-4 text-xs text-muted border-t border-border pt-3">
        <span className="flex items-center gap-1">
          <BookOpen size={12} />
          {course.lessonsCount} lecciones
        </span>
        <span className="flex items-center gap-1">
          <FlaskConical size={12} />
          {course.labsCount} labs
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {course.estimatedTime}
        </span>
        <ChevronRight size={12} className="ml-auto text-muted group-hover:text-blue transition-colors" />
      </div>
    </Link>
  )
}
