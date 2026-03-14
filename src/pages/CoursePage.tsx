import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BookOpen, FlaskConical, CheckCircle2, Circle, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useCourseData, useLesson } from '../hooks/useCourses'
import { isComplete } from '../utils/courseLoader'
import MarkdownRenderer from '../components/MarkdownRenderer'
import LabView from '../components/LabView'
import type { LessonMeta } from '../types'

export default function CoursePage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>()
  const navigate = useNavigate()
  const { course, loading: courseLoading } = useCourseData(courseId)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Redirect to first lesson if no lessonId
  useEffect(() => {
    if (!lessonId && course?.lessons?.length) {
      navigate(`/course/${courseId}/${course.lessons[0].id}`, { replace: true })
    }
  }, [lessonId, course, courseId, navigate])

  const currentLessonMeta = course?.lessons.find((l) => l.id === lessonId)
  const { lesson, loading: lessonLoading } = useLesson(courseId, currentLessonMeta?.file)

  if (courseLoading) return <FullPageLoader text="Cargando curso…" />

  if (!course) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-text">Curso no encontrado.</p>
        <Link to="/" className="text-blue hover:underline text-sm">← Volver al inicio</Link>
      </div>
    )
  }

  const currentIdx = course.lessons.findIndex((l) => l.id === lessonId)
  const prevLesson = currentIdx > 0 ? course.lessons[currentIdx - 1] : null
  const nextLesson = currentIdx < course.lessons.length - 1 ? course.lessons[currentIdx + 1] : null
  const isLab = currentLessonMeta?.type === 'lab' || lesson?.meta?.type === 'lab'

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform lg:relative lg:translate-x-0 lg:z-auto`}
          style={{ top: '56px', height: 'calc(100vh - 56px)' }}
        >
          {/* Course header */}
          <div className="border-b border-border p-4">
            <Link to="/" className="mb-3 flex items-center gap-1 text-xs text-muted hover:text-text transition-colors">
              <ChevronLeft size={12} />
              Todos los cursos
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">{course.icon}</span>
              <div>
                <p className="text-sm font-semibold text-text leading-tight">{course.title}</p>
                <p className="text-xs text-muted capitalize">{course.language}</p>
              </div>
            </div>
            {/* Progress */}
            <div className="mt-3">
              {(() => {
                const done = course.lessons.filter((l) => isComplete(courseId!, l.id)).length
                const pct = Math.round((done / course.lessons.length) * 100)
                return (
                  <>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>{done}/{course.lessons.length} completadas</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-elevated">
                      <div className="h-full rounded-full bg-blue transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          {/* Lesson list */}
          <nav className="flex-1 overflow-y-auto py-2">
            {course.lessons.map((l, i) => (
              <LessonNavItem
                key={l.id}
                lesson={l}
                index={i}
                courseId={courseId!}
                isActive={l.id === lessonId}
                isDone={isComplete(courseId!, l.id)}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </nav>
        </aside>
      </>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile toolbar */}
        <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-muted hover:text-text">
            <Menu size={20} />
          </button>
          <span className="truncate text-sm text-text">{currentLessonMeta?.title ?? 'Lección'}</span>
        </div>

        {lessonLoading || !lesson ? (
          <FullPageLoader text="Cargando lección…" />
        ) : isLab ? (
          <LabView lesson={lesson} courseId={courseId!} />
        ) : (
          /* Lesson Reader */
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-6 pb-16 pt-8">
                {/* Lesson header */}
                <div className="mb-6">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                    <BookOpen size={12} />
                    <span>Lección {(currentIdx ?? 0) + 1}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-text">{lesson.meta.title}</h1>
                </div>
                <MarkdownRenderer content={lesson.displayContent} />
              </div>
            </div>

            {/* Prev/Next navigation */}
            <div className="shrink-0 border-t border-border bg-surface px-6 py-3">
              <div className="mx-auto flex max-w-3xl items-center justify-between">
                {prevLesson ? (
                  <Link
                    to={`/course/${courseId}/${prevLesson.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted hover:border-blue/40 hover:text-text transition-colors"
                  >
                    <ChevronLeft size={14} />
                    {prevLesson.title}
                  </Link>
                ) : <div />}
                {nextLesson ? (
                  <Link
                    to={`/course/${courseId}/${nextLesson.id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue/80 transition-colors"
                  >
                    {nextLesson.title}
                    <ChevronRight size={14} />
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className="flex items-center gap-1.5 rounded-lg bg-green/20 px-4 py-2 text-sm font-medium text-green hover:bg-green/30 transition-colors"
                  >
                    ¡Curso completado! Volver al inicio
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LessonNavItem({
  lesson, index, courseId, isActive, isDone, onClick,
}: {
  lesson: LessonMeta
  index: number
  courseId: string
  isActive: boolean
  isDone: boolean
  onClick: () => void
}) {
  return (
    <Link
      to={`/course/${courseId}/${lesson.id}`}
      onClick={onClick}
      className={`flex items-start gap-2.5 px-4 py-2.5 transition-colors ${
        isActive
          ? 'bg-blue/10 text-blue border-r-2 border-blue'
          : 'text-muted hover:bg-elevated hover:text-text'
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {isDone ? (
          <CheckCircle2 size={14} className="text-green" />
        ) : lesson.type === 'lab' ? (
          <FlaskConical size={14} className={isActive ? 'text-blue' : 'text-muted'} />
        ) : (
          <Circle size={14} className={isActive ? 'text-blue' : 'text-muted'} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs leading-4">{index + 1}. {lesson.title}</p>
        {lesson.type === 'lab' && (
          <span className="text-[10px] text-blue/60">Laboratorio</span>
        )}
      </div>
    </Link>
  )
}

function FullPageLoader({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-blue" />
      <p className="text-sm">{text}</p>
    </div>
  )
}
