import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import type { QuizSnapshotSource } from '@/renderer/src/utils/quiz-snapshot'
import { createQuizSnapshot } from '@/renderer/src/utils/quiz-snapshot'

describe('createQuizSnapshot', () => {
  it('removes Vue proxies before sending answered quiz state through IPC', () => {
    const quiz = reactive<QuizSnapshotSource>({
      mode: 'lesson',
      targetId: 'foundations-tour',
      title: 'Database tour',
      index: 0,
      furthestIndex: 0,
      finished: false,
      passed: false,
      items: [{
        question: {
          id: 'foundations-tour-q1',
          prompt: 'Which table?',
          options: ['orders', 'customers'],
          answer: 'orders',
          explanation: 'Orders are stored in orders.'
        },
        options: ['customers', 'orders'],
        selected: 'customers',
        queryDraft: ''
      }]
    })

    expect(() => structuredClone(quiz)).toThrow()
    const snapshot = createQuizSnapshot(quiz)
    expect(() => structuredClone(snapshot)).not.toThrow()
    expect(snapshot.items[0]?.selected).toBe('customers')
  })
})
