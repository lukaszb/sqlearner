import type { CourseModule, Lesson, QuizQuestion } from './types.js'

/** Number of questions drawn at the end of a single lesson. */
export const lessonQuizSize = 3
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
  return pickRandom(lesson.questions, count, random)
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
