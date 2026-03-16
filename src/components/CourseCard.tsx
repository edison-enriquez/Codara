import { Link } from 'react-router-dom'
import { FlaskConical, BookOpen, Clock, ArrowRight } from 'lucide-react'
import type { CourseSummary } from '../types'

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner:     'text-green  border-green/40  bg-green/10',
  intermediate: 'text-yellow border-yellow/40 bg-yellow/10',
  advanced:     'text-red    border-red/40    bg-red/10',
}
const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
}

const TAG_COLORS = [
  'text-cyan   border-cyan/40   bg-cyan/10',
  'text-purple border-purple/40 bg-purple/10',
  'text-orange border-orange/40 bg-orange/10',
  'text-pink   border-pink/40   bg-pink/10',
  'text-blue   border-blue/40   bg-blue/10',
  'text-yellow border-yellow/40 bg-yellow/10',
]

interface Props {
  course: CourseSummary
  completedCount?: number
  index?: number
}

export default function CourseCard({ course, completedCount = 0, index = 0 }: Props) {
  const total = course.lessonsCount + course.labsCount
  const pct   = total > 0 ? Math.round((completedCount / total) * 100) : 0

  return (
    <Link
      to={`/course/${course.id}`}
      className="group flex items-center gap-4 border-b border-border px-4 py-4 transition-colors hover:bg-surface"
    >
      {/* Icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-border bg-elevated text-xl">
        {course.icon}
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-bold text-text group-hover:text-green transition-colors">
            {course.title}
          </span>
          <span className="text-xs text-muted uppercase tracking-wider">{course.language}</span>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{course.description}</p>

        {/* Tags */}
        {course.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {course.tags.slice(0, 4).map((t, i) => (
              <span
                key={t}
                className={`rounded border px-1.5 py-0.5 text-xs font-medium ${TAG_COLORS[(index + i) % TAG_COLORS.length]}`}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right metadata */}
      <div className="hidden flex-shrink-0 flex-col items-end gap-2 sm:flex">
        <span className={`rounded border px-2 py-0.5 text-xs font-medium ${DIFFICULTY_STYLE[course.difficulty]}`}>
          {DIFFICULTY_LABEL[course.difficulty]}
        </span>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <BookOpen size={11} />{course.lessonsCount}
          </span>
          <span className="flex items-center gap-1">
            <FlaskConical size={11} />{course.labsCount} labs
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />{course.estimatedTime}
          </span>
        </div>
        {/* Progress bar */}
        {completedCount > 0 && (
          <div className="w-24">
            <div className="h-px w-full bg-border">
              <div className="h-full bg-green transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted">{pct}% completado</span>
          </div>
        )}
      </div>

      <ArrowRight size={14} className="flex-shrink-0 text-muted group-hover:text-green transition-colors" />
    </Link>
  )
}
