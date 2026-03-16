import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, BookOpen, FlaskConical, CheckCircle2, Circle, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useCourseData, useLesson } from '../hooks/useCourses'
import { isComplete } from '../utils/courseLoader'
import MarkdownRenderer from '../components/MarkdownRenderer'
import LabView from '../components/LabView'
import type { LessonMeta, Chapter } from '../types'

export default function CoursePage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>()
  const navigate = useNavigate()
  const { course, loading: courseLoading } = useCourseData(courseId)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 w-64 flex flex-col overflow-hidden border-r border-border bg-surface',
            'transition-transform duration-300',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
            'lg:relative lg:z-auto lg:translate-x-0 lg:transition-all lg:duration-200',
            sidebarCollapsed ? 'lg:w-0 lg:border-r-0' : 'lg:w-64',
          ].join(' ')}
          style={{ top: '56px', height: 'calc(100vh - 56px)' }}
        >
          <div className="flex min-w-[256px] flex-1 flex-col overflow-hidden">
          {/* Course header */}
          <div className="border-b border-border p-4">
            <Link to="/" className="mb-3 flex items-center gap-1 text-xs text-muted hover:text-green transition-colors uppercase tracking-wider">
              <ChevronLeft size={12} />
              Todos los cursos
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">{course.icon}</span>
              <div>
                <p className="text-xs font-bold text-text uppercase tracking-wide leading-tight">{course.title}</p>
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
                      <span className="text-green">{pct}%</span>
                    </div>
                    <div className="h-px w-full bg-border">
                      <div className="h-full bg-green transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          {/* Lesson list */}
          <nav className="flex-1 overflow-y-auto py-2">
            {course.chapters ? (
              course.chapters.map((chapter) => (
                <ChapterGroup
                  key={chapter.id}
                  chapter={chapter}
                  courseId={courseId!}
                  lessonId={lessonId}
                  allLessons={course.lessons}
                  onNavigate={() => setMobileSidebarOpen(false)}
                />
              ))
            ) : (
              course.lessons.map((l, i) => (
                <LessonNavItem
                  key={l.id}
                  lesson={l}
                  index={i}
                  courseId={courseId!}
                  isActive={l.id === lessonId}
                  isDone={isComplete(courseId!, l.id)}
                  onClick={() => setMobileSidebarOpen(false)}
                />
              ))
            )}
          </nav>
          </div>
        </aside>
      </>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Toolbar — siempre visible, toggle según dispositivo */}
        <div className="flex items-center gap-2 border-b border-border bg-base px-4 py-2">
          {/* Móvil: abrir overlay */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="text-muted hover:text-green transition-colors lg:hidden"
            title="Abrir menú"
          >
            <Menu size={18} />
          </button>
          {/* Escritorio: colapsar / expandir sidebar */}
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="hidden text-muted hover:text-green transition-colors lg:block"
            title={sidebarCollapsed ? 'Mostrar menú' : 'Ocultar menú'}
          >
            <Menu size={18} />
          </button>
          <span className="truncate text-xs uppercase tracking-wider text-muted">{currentLessonMeta?.title ?? 'Lección'}</span>
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
                <div className="mb-6 border-b border-border pb-6">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted uppercase tracking-widest">
                    <BookOpen size={11} />
                    <span>Lección {(currentIdx ?? 0) + 1}</span>
                  </div>
                  <h1 className="text-xl font-bold text-text">{lesson.meta.title}</h1>
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
                    className="flex items-center gap-1.5 border border-border px-4 py-2 text-xs text-muted hover:border-green/40 hover:text-text uppercase tracking-wider transition-colors"
                  >
                    <ChevronLeft size={14} />
                    {prevLesson.title}
                  </Link>
                ) : <div />}
                {nextLesson ? (
                  <Link
                    to={`/course/${courseId}/${nextLesson.id}`}
                    className="flex items-center gap-1.5 border border-green/50 bg-green/10 px-4 py-2 text-xs font-bold text-green hover:bg-green/20 uppercase tracking-wider transition-colors"
                  >
                    {nextLesson.title}
                    <ChevronRight size={14} />
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className="flex items-center gap-1.5 border border-green/50 bg-green/10 px-4 py-2 text-xs font-bold text-green hover:bg-green/20 uppercase tracking-wider transition-colors"
                  >
                    ¡Completado! Volver al inicio
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

function ChapterGroup({
  chapter, courseId, lessonId, allLessons, onNavigate,
}: {
  chapter: Chapter
  courseId: string
  lessonId: string | undefined
  allLessons: LessonMeta[]
  onNavigate: () => void
}) {
  const hasActive = chapter.lessons.some((l) => l.id === lessonId)
  const [isOpen, setIsOpen] = useState(hasActive)
  const done = chapter.lessons.filter((l) => isComplete(courseId, l.id)).length
  const total = chapter.lessons.length
  const pct = Math.round((done / total) * 100)

  const theoryLessons = chapter.lessons.filter((l) => l.type !== 'lab')
  const labLessons = chapter.lessons.filter((l) => l.type === 'lab')

  return (
    <div>
      {/* Chapter header — clickable to collapse */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-t border-border/40 bg-base px-4 py-2 hover:bg-elevated transition-colors"
      >
        <ChevronDown
          size={12}
          className={`shrink-0 text-muted transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
        />
        <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted">
          {chapter.title}
        </span>
        <span className="text-[10px] text-muted tabular-nums">{done}/{total}</span>
      </button>

      {isOpen && (
        <>
          {/* Progress bar */}
          {pct > 0 && (
            <div className="h-px w-full bg-border">
              <div className="h-full bg-green/60 transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
          {/* Sub-group: Lecciones */}
          {theoryLessons.length > 0 && (
            <LessonSubGroup
              title="Lecciones"
              lessons={theoryLessons}
              courseId={courseId}
              lessonId={lessonId}
              allLessons={allLessons}
              onNavigate={onNavigate}
              defaultOpen={theoryLessons.some((l) => l.id === lessonId)}
            />
          )}
          {/* Sub-group: Laboratorios */}
          {labLessons.length > 0 && (
            <LessonSubGroup
              title="Laboratorios"
              lessons={labLessons}
              courseId={courseId}
              lessonId={lessonId}
              allLessons={allLessons}
              onNavigate={onNavigate}
              defaultOpen={labLessons.some((l) => l.id === lessonId)}
            />
          )}
        </>
      )}
    </div>
  )
}

function LessonSubGroup({
  title, lessons, courseId, lessonId, allLessons, onNavigate, defaultOpen,
}: {
  title: string
  lessons: LessonMeta[]
  courseId: string
  lessonId: string | undefined
  allLessons: LessonMeta[]
  onNavigate: () => void
  defaultOpen: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-5 py-1.5 hover:bg-elevated transition-colors"
      >
        <ChevronRight
          size={10}
          className={`shrink-0 text-muted/50 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
        <span className="text-[9px] uppercase tracking-widest text-muted/60">{title}</span>
      </button>
      {isOpen && lessons.map((l) => {
        const globalIndex = allLessons.findIndex((x) => x.id === l.id)
        return (
          <LessonNavItem
            key={l.id}
            lesson={l}
            index={globalIndex}
            courseId={courseId}
            isActive={l.id === lessonId}
            isDone={isComplete(courseId, l.id)}
            onClick={onNavigate}
          />
        )
      })}
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
          ? 'bg-green/5 text-green border-r-2 border-green'
          : 'text-muted hover:bg-elevated hover:text-text'
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {isDone ? (
          <CheckCircle2 size={14} className="text-green" />
        ) : lesson.type === 'lab' ? (
          <FlaskConical size={14} className={isActive ? 'text-green' : 'text-muted'} />
        ) : (
          <Circle size={14} className={isActive ? 'text-green' : 'text-muted'} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs leading-4">{index + 1}. {lesson.title}</p>
        {lesson.type === 'lab' && (
          <span className="text-[10px] text-cyan/60 uppercase tracking-wider">Lab</span>
        )}
      </div>
    </Link>
  )
}

function FullPageLoader({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
      <span className="h-5 w-5 animate-spin border-2 border-border border-t-green" />
      <p className="text-xs uppercase tracking-widest">{text}</p>
    </div>
  )
}
