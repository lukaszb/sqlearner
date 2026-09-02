import type { CourseModule, Lesson, QuizQuestion } from './types.js'

/** Number of questions drawn at the end of a single lesson. */
export const lessonQuizSize = 4
/** Every lesson quiz includes one or two questions that execute SQL. */
export const lessonQueryQuestionMinimum = 1
export const lessonQueryQuestionMaximum = 2
/** Minimum number of questions every lesson contributes to a module exam. */
export const examQuestionsPerLesson = 2
/** Baseline module exam length; grows when a module has many lessons. */
export const examBaseSize = 10

export type RandomFn = () => number

export function shuffle<T>(items: readonly T[], random: RandomFn = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1))
    const current = result[index] as T
    result[index] = result[swapWith] as T
    result[swapWith] = current
  }
  return result
}

export function pickRandom<T>(items: readonly T[], count: number, random: RandomFn = Math.random): T[] {
  return shuffle(items, random).slice(0, Math.max(0, Math.min(count, items.length)))
}

/**
 * A module exam is at least `examBaseSize` questions and always leaves room for
 * `examQuestionsPerLesson` questions from every lesson of the module.
 */
export function moduleExamSize(module: CourseModule): number {
  return Math.max(examBaseSize, module.lessons.length * examQuestionsPerLesson)
}

export function drawLessonQuestions(
  lesson: Lesson,
  count: number = lessonQuizSize,
  random: RandomFn = Math.random
): QuizQuestion[] {
  const sqlBlocks = lesson.blocks.filter((block) => block.kind === 'sql')
  const queryCount = count > 1 && sqlBlocks.length > 0 && random() >= 0.5
    ? lessonQueryQuestionMaximum
    : lessonQueryQuestionMinimum
  const runnableQuestions: QuizQuestion[] = [
    {
      id: `${lesson.id}-practice-query`,
      kind: 'query',
      prompt: lesson.practice.task,
      hint: lesson.practice.hint,
      options: [],
      answer: '__query_succeeded__',
      explanation: `One possible solution:\n${lesson.practice.solution}`
    }
  ]

  if (queryCount === lessonQueryQuestionMaximum) {
    const [example] = pickRandom(sqlBlocks, 1, random)
    if (example) {
      runnableQuestions.push({
        id: `${lesson.id}-example-query`,
        kind: 'query',
        prompt: `Run the "${example.title}" query from this lesson.`,
        starterSql: example.sql,
        options: [],
        answer: '__query_succeeded__',
        explanation: example.explanation
      })
    }
  }

  const choiceCount = Math.max(0, count - runnableQuestions.length)
  return shuffle([
    ...runnableQuestions,
    ...pickRandom(lesson.questions, choiceCount, random)
  ], random)
}

/**
 * Draws a module exam: `examQuestionsPerLesson` questions from every lesson
 * first, then fills the remaining slots from the leftover pool.
 */
export function drawExamQuestions(
  module: CourseModule,
  size: number = moduleExamSize(module),
  random: RandomFn = Math.random
): QuizQuestion[] {
  const selected: QuizQuestion[] = []
  const leftovers: QuizQuestion[] = []

  for (const lesson of module.lessons) {
    const shuffled = shuffle(lesson.questions, random)
    selected.push(...shuffled.slice(0, examQuestionsPerLesson))
    leftovers.push(...shuffled.slice(examQuestionsPerLesson))
  }

  const missing = Math.max(0, size - selected.length)
  selected.push(...pickRandom(leftovers, missing, random))
  return shuffle(selected, random)
}

export interface PresentedQuestion {
  question: QuizQuestion
  options: string[]
}

export function presentQuestion(question: QuizQuestion, random: RandomFn = Math.random): PresentedQuestion {
  return { question, options: shuffle(question.options, random) }
}

export function isCorrectAnswer(question: QuizQuestion, option: string | undefined): boolean {
  return option !== undefined && option === question.answer
}
