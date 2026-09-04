export type ModuleLevel = 'basics' | 'intermediate' | 'advanced'

export interface SqlBreakdownItem {
  /** The exact SQL fragment, for example `GROUP BY customer_state`. */
  part: string
  /** What that fragment instructs SQLite to do. */
  meaning: string
}

export interface SqlExampleBlock {
  kind: 'sql'
  title: string
  sql: string
  /** One sentence describing the goal of the whole statement. */
  explanation: string
  /** Clause-by-clause description of the statement. */
  breakdown: SqlBreakdownItem[]
}

export type LessonBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; title?: string; items: string[] }
  | { kind: 'note'; text: string }
  | SqlExampleBlock

export interface QuizQuestion {
  id: string
  /** Omitted for the existing multiple-choice question bank. */
  kind?: 'choice' | 'query'
  prompt: string
  /** Optional SQL snippet shown above the answers. */
  code?: string
  /** Optional initial SQL for a runnable query question. */
  starterSql?: string
  /** Hint shown alongside a runnable query question. */
  hint?: string
  options: string[]
  /** Must be one of `options`; matched by value so options can be shuffled. */
  answer: string
  explanation: string
}

export interface LessonPractice {
  task: string
  hint: string
  solution: string
}

export interface Lesson {
  id: string
  /** Full lesson name shown in the hover tooltip and in the lesson header. */
  title: string
  goal: string
  tables: string[]
  blocks: LessonBlock[]
  practice: LessonPractice
  questions: QuizQuestion[]
}

export interface CourseModule {
  id: string
  level: ModuleLevel
  title: string
  description: string
  /** Marks modules whose statements change data, so the lesson screen can warn about it. */
  changesData?: boolean
  lessons: Lesson[]
}

export interface ProgressEntry {
  completedAt: string
  attempts: number
}

export interface CourseProgress {
  lessons: Record<string, ProgressEntry>
  exams: Record<string, ProgressEntry>
}

export function createEmptyProgress(): CourseProgress {
  return { lessons: {}, exams: {} }
}
