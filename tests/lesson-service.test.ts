import { describe, expect, it } from 'vitest'
import { sanitizeProgress } from '@/main/services/lesson-service'

describe('sanitizeProgress', () => {
  it('returns empty progress for anything that is not an object', () => {
    expect(sanitizeProgress(undefined)).toEqual({ lessons: {}, exams: {} })
    expect(sanitizeProgress('broken')).toEqual({ lessons: {}, exams: {} })
    expect(sanitizeProgress(null)).toEqual({ lessons: {}, exams: {} })
  })

  it('keeps well formed entries and drops malformed ones', () => {
    const progress = sanitizeProgress({
      lessons: {
        'foundations-tour': { completedAt: '2026-09-02T10:00:00.000Z', attempts: 2 },
        'broken-lesson': { completedAt: 42 }
      },
      exams: {
        foundations: { completedAt: '2026-09-02T10:30:00.000Z', attempts: 1 },
        joins: 'nope'
      },
      unexpected: true
    })

    expect(progress).toEqual({
      lessons: { 'foundations-tour': { completedAt: '2026-09-02T10:00:00.000Z', attempts: 2 } },
      exams: { foundations: { completedAt: '2026-09-02T10:30:00.000Z', attempts: 1 } }
    })
  })
})
