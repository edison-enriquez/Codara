export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type LessonType = 'lesson' | 'lab'
export type Language = 'javascript' | 'typescript' | 'python' | 'c' | 'general'

export interface CourseSummary {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  language: Language
  category: string
  icon: string
  lessonsCount: number
  labsCount: number
  estimatedTime: string
  tags: string[]
}

export interface LessonMeta {
  id: string
  title: string
  type: LessonType
  order: number
  file: string
}

export interface Chapter {
  id: string
  title: string
  lessons: LessonMeta[]
}

export interface CourseData {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  language: Language
  category: string
  icon: string
  estimatedTime: string
  lessons: LessonMeta[]   // flat list (built from chapters by courseLoader)
  chapters?: Chapter[]    // optional grouped structure for menu
}

export interface CodeCheck {
  id: string
  description: string
  pattern: string          // regex pattern
  hint: string
  type?: 'regex' | 'contains' | 'not-contains'
  required?: boolean       // si false, es opcional (bonificación)
}

export interface LessonFrontmatter {
  id: string
  title: string
  type: LessonType
  language: Language
  difficulty?: Difficulty
  order?: number
  hints?: string[]
  checks?: CodeCheck[]     // CryptoZombies-style live analysis
  solution?: string        // nombre de archivo de solución (opcional)
}

export interface ParsedLesson {
  meta: LessonFrontmatter
  content: string          // full markdown body
  starterCode?: string     // extracted from ```lang lab blocks
  testCode?: string        // extracted from ```lang tests blocks
  displayContent: string   // markdown without lab/tests blocks
}

export interface TestResult {
  name: string
  passed: boolean
  error?: string
}

export interface RunResult {
  logs: string[]
  error: string | null
  testResults?: TestResult[]
}

export type SegmentType = 'prose' | 'exec' | 'lab' | 'tests' | 'hints' | 'code'

export interface ProseSegment    { type: 'prose';  content: string }
export interface ExecSegment     { type: 'exec';   lang: string; content: string }
export interface LabSegment      { type: 'lab';    lang: string; content: string }
export interface TestsSegment    { type: 'tests';  lang: string; content: string }
export interface HintsSegment    { type: 'hints';  items: string[] }
export interface CodeSegment     { type: 'code';   lang: string; content: string }

export type Segment =
  | ProseSegment
  | ExecSegment
  | LabSegment
  | TestsSegment
  | HintsSegment
  | CodeSegment

export interface CourseProgress {
  [courseId: string]: {
    [lessonId: string]: boolean
  }
}
