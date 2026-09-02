import { describe, expect, it } from 'vitest'
import { allLessons, course, findLesson, findModule } from '@/shared/course'
import { examQuestionsPerLesson, lessonQuizSize, moduleExamSize } from '@/shared/course/quiz'

const lessons = allLessons()

describe('course structure', () => {
  it('ships five modules ordered from basics to advanced', () => {
    expect(course.map((module) => module.id)).toEqual([
      'foundations',
      'aggregation',
      'joins',
      'modifying',
      'analytics'
    ])
    expect(course.map((module) => module.level)).toEqual([
      'basics',
      'basics',
      'intermediate',
      'intermediate',
      'advanced'
    ])
  })

  it('marks the data changing module as sandboxed and the others as read only', () => {
    expect(findModule('modifying')?.usesSandbox).toBe(true)
    expect(course.filter((module) => module.usesSandbox).map((module) => module.id)).toEqual(['modifying'])
  })

  it('uses unique lesson ids that can be looked up', () => {
    const ids = lessons.map((lesson) => lesson.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(findLesson(id)?.lesson.id).toBe(id)
    }
  })

  it('leaves room for at least two questions per lesson in every module exam', () => {
    for (const module of course) {
      expect(moduleExamSize(module)).toBeGreaterThanOrEqual(module.lessons.length * examQuestionsPerLesson)
      expect(moduleExamSize(module)).toBeGreaterThanOrEqual(10)
    }
  })
})

describe('lesson content', () => {
  it.each(lessons.map((lesson) => [lesson.id, lesson] as const))('%s teaches and can be practised', (_id, lesson) => {
    expect(lesson.title.length).toBeGreaterThan(10)
    expect(lesson.goal.length).toBeGreaterThan(10)
    expect(lesson.tables.length).toBeGreaterThan(0)

    const sqlBlocks = lesson.blocks.filter((block) => block.kind === 'sql')
    expect(sqlBlocks.length).toBeGreaterThanOrEqual(2)
    for (const block of sqlBlocks) {
      expect(block.sql.trim().length).toBeGreaterThan(0)
      expect(block.explanation.trim().length).toBeGreaterThan(0)
      expect(block.breakdown.length).toBeGreaterThan(0)
      for (const item of block.breakdown) {
        expect(item.part.trim().length).toBeGreaterThan(0)
        expect(item.meaning.trim().length).toBeGreaterThan(0)
      }
    }

    expect(lesson.practice.task.trim().length).toBeGreaterThan(0)
    expect(lesson.practice.hint.trim().length).toBeGreaterThan(0)
    expect(lesson.practice.solution.trim().length).toBeGreaterThan(0)
  })
})

describe('question banks', () => {
  it('gives every lesson more variants than a single draw needs', () => {
    for (const lesson of lessons) {
      expect(lesson.questions.length).toBeGreaterThanOrEqual(lessonQuizSize)
      expect(lesson.questions.length).toBeGreaterThanOrEqual(examQuestionsPerLesson * 2)
    }
  })

  it('uses unique question ids across the whole course', () => {
    const ids = lessons.flatMap((lesson) => lesson.questions.map((question) => question.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('offers four distinct options and an answer that is one of them', () => {
    for (const lesson of lessons) {
      for (const question of lesson.questions) {
        expect(question.options).toHaveLength(4)
        expect(new Set(question.options).size).toBe(4)
        expect(question.options).toContain(question.answer)
        expect(question.prompt.trim().length).toBeGreaterThan(0)
        expect(question.explanation.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
