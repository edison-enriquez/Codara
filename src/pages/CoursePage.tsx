import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { useCourseData, useLesson } from '../hooks/useCourses'
import MarkdownRenderer from '../components/MarkdownRenderer'
import VoiceTutor from '../components/VoiceTutor'
import LabView from '../components/LabView'
import NotebookView from '../components/NotebookView'
import CourseIndex from '../components/CourseIndex'

export default function CoursePage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>()
  const { course, loading: courseLoading } = useCourseData(courseId)

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

  // Sin lección seleccionada → índice del curso (tabla de retos)
  if (!lessonId) return <CourseIndex course={course} courseId={courseId!} />

  const currentIdx = course.lessons.findIndex((l) => l.id === lessonId)
  const prevLesson = currentIdx > 0 ? course.lessons[currentIdx - 1] : null
  const nextLesson = currentIdx < course.lessons.length - 1 ? course.lessons[currentIdx + 1] : null
  const isLab = currentLessonMeta?.type === 'lab' || lesson?.meta?.type === 'lab'

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
      {/* ── Toolbar superior: breadcrumb + navegación prev/next ──────────── */}
      <div className="flex items-center gap-2 border-b border-border bg-base px-4 py-2">
        {/* Breadcrumb */}
        <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
          <Link to="/" className="shrink-0 text-muted hover:text-green transition-colors">Cursos</Link>
          <ChevronRight size={11} className="shrink-0 text-muted/40" />
          <Link to={`/course/${courseId}`} className="max-w-[40vw] shrink-0 truncate text-muted hover:text-green transition-colors">
            {course.title}
          </Link>
          <ChevronRight size={11} className="shrink-0 text-muted/40" />
          <span className="truncate text-text">{currentLessonMeta?.title ?? lesson?.meta?.title ?? 'Lección'}</span>
        </nav>

        {/* Prev / Next */}
        <div className="flex shrink-0 items-center gap-1">
          {prevLesson ? (
            <Link to={`/course/${courseId}/${prevLesson.id}`} title={prevLesson.title}
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:border-green/40 hover:text-green transition-colors">
              <ChevronLeft size={15} />
            </Link>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded border border-border/50 text-muted/30"><ChevronLeft size={15} /></span>
          )}
          {nextLesson ? (
            <Link to={`/course/${courseId}/${nextLesson.id}`} title={nextLesson.title}
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:border-green/40 hover:text-green transition-colors">
              <ChevronRight size={15} />
            </Link>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded border border-border/50 text-muted/30"><ChevronRight size={15} /></span>
          )}
        </div>
      </div>

      {lessonLoading || !lesson ? (
        <FullPageLoader text="Cargando lección…" />
      ) : isLab ? (
        <LabView
          lesson={lesson}
          courseId={courseId!}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
        />
      ) : (
        /* Lesson Reader */
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {course.notebook ? (
              <NotebookView lesson={lesson} />
            ) : (
              <div className="mx-auto max-w-3xl px-6 pb-16 pt-8">
                {/* Lesson header */}
                <div className="mb-6 border-b border-border pb-6">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted uppercase tracking-widest">
                    <BookOpen size={11} />
                    <span>Lección {(currentIdx ?? 0) + 1}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-xl font-bold text-text">{lesson.meta.title}</h1>
                    <VoiceTutor content={lesson.displayContent} />
                  </div>
                </div>
                <MarkdownRenderer content={lesson.displayContent} />
              </div>
            )}
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
              ) : (
                <Link
                  to={`/course/${courseId}`}
                  className="flex items-center gap-1.5 border border-border px-4 py-2 text-xs text-muted hover:border-green/40 hover:text-text uppercase tracking-wider transition-colors"
                >
                  <ChevronLeft size={14} />
                  Índice del curso
                </Link>
              )}
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
                  to={`/course/${courseId}`}
                  className="flex items-center gap-1.5 border border-green/50 bg-green/10 px-4 py-2 text-xs font-bold text-green hover:bg-green/20 uppercase tracking-wider transition-colors"
                >
                  ¡Completado! Volver al índice
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
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
