import { describe, expect, it } from 'vitest'
import { course, findModule } from '@/shared/course'
import {
  drawExamQuestions,
  drawLessonQuestions,
  examQuestionsPerLesson,
  isCorrectAnswer,
  lessonQuizSize,
  moduleExamSize,
  presentQuestion,
  shuffle
} from '@/shared/course/quiz'

function sequenceRandom(values: number[]): () => number {
  let index = 0
  return () => {
    const value = values[index % values.length] as number
    index += 1
    return value
  }
}

const foundations = findModule('foundations')
const firstLesson = foundations?.lessons[0]

describe('shuffle', () => {
  it('keeps every element exactly once', () => {
    const input = [1, 2, 3, 4, 5]
    const output = shuffle(input, sequenceRandom([0.1, 0.9, 0.4, 0.7, 0.2]))
    expect([...output].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })
})

describe('lesson quiz draw', () => {
  it('draws the configured number of distinct questions', () => {
    if (!firstLesson) throw new Error('missing lesson')
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const drawn = drawLessonQuestions(firstLesson)
      expect(drawn).toHaveLength(lessonQuizSize)
      expect(new Set(drawn.map((question) => question.id)).size).toBe(lessonQuizSize)
      for (const question of drawn) {
        expect(firstLesson.questions).toContain(question)
      }
    }
  })

  it('does not always draw the same questions', () => {
    if (!firstLesson) throw new Error('missing lesson')
    const draws = new Set<string>()
    for (let attempt = 0; attempt < 40; attempt += 1) {
      draws.add(
        drawLessonQuestions(firstLesson)
          .map((question) => question.id)
          .sort()
          .join('|')
      )
    }
    expect(draws.size).toBeGreaterThan(1)
  })
})

describe('module exam draw', () => {
  it.each(course.map((module) => [module.id, module] as const))(
    '%s exam takes at least two questions from every lesson',
    (_id, module) => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const drawn = drawExamQuestions(module)
        expect(drawn).toHaveLength(moduleExamSize(module))
        expect(new Set(drawn.map((question) => question.id)).size).toBe(drawn.length)

        for (const lesson of module.lessons) {
          const fromLesson = drawn.filter((question) =>
            lesson.questions.some((candidate) => candidate.id === question.id)
          )
          expect(fromLesson.length).toBeGreaterThanOrEqual(examQuestionsPerLesson)
        }
      }
    }
  )
})

describe('answer handling', () => {
  it('keeps the answer among the shuffled options', () => {
    if (!firstLesson) throw new Error('missing lesson')
    for (const question of firstLesson.questions) {
      const presented = presentQuestion(question)
      expect(presented.options).toHaveLength(question.options.length)
      expect(presented.options).toContain(question.answer)
      expect(isCorrectAnswer(question, question.answer)).toBe(true)
      expect(isCorrectAnswer(question, undefined)).toBe(false)
      const wrong = presented.options.find((option) => option !== question.answer)
      expect(isCorrectAnswer(question, wrong)).toBe(false)
    }
  })
})
