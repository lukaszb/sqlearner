import type { QuizQuestion, QuizSnapshot } from '@/shared/types'

export interface QuizSnapshotSource {
  mode: 'lesson' | 'exam'
  targetId: string
  title: string
  items: Array<{
    question: QuizQuestion
    options: string[]
    selected?: string
    queryDraft: string
  }>
  index: number
  furthestIndex: number
  finished: boolean
  passed: boolean
}

/** Builds an IPC-safe DTO instead of leaking Vue's reactive Proxy objects to Electron. */
export function createQuizSnapshot(quiz: QuizSnapshotSource): QuizSnapshot {
  return {
    mode: quiz.mode,
    targetId: quiz.targetId,
    title: quiz.title,
    items: quiz.items.map((item) => ({
      question: {
        ...item.question,
        options: [...item.question.options]
      },
      options: [...item.options],
      ...(item.selected !== undefined ? { selected: item.selected } : {}),
      queryDraft: item.queryDraft
    })),
    index: quiz.index,
    furthestIndex: quiz.furthestIndex,
    finished: quiz.finished,
    passed: quiz.passed
  }
}
