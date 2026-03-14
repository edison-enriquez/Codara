import { useState, useEffect } from 'react'
import { loadCourseIndex, loadCourseData, loadLessonFile } from '../utils/courseLoader'
import type { CourseSummary, CourseData, ParsedLesson } from '../types'

export function useCourseIndex() {
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCourseIndex()
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { courses, loading, error }
}

export function useCourseData(courseId: string | undefined) {
  const [course, setCourse] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    setLoading(true)
    setError(null)
    loadCourseData(courseId)
      .then(setCourse)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [courseId])

  return { course, loading, error }
}

export function useLesson(courseId: string | undefined, fileName: string | undefined) {
  const [lesson, setLesson] = useState<ParsedLesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId || !fileName) return
    setLoading(true)
    setError(null)
    loadLessonFile(courseId, fileName)
      .then(setLesson)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [courseId, fileName])

  return { lesson, loading, error }
}
