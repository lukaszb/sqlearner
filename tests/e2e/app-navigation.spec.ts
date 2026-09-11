import { expect, test } from '@playwright/test'
import type {
  CourseProgress,
  ProgressUpdate,
  QueryResult,
  SessionSummary,
  SessionWorkspacePatch,
  SessionWorkspaceState,
  TablePreview,
  TableSummary
} from '@/shared/types'

declare global {
  interface Window {
    sessionExported?: string
    interactionTypes?: string[]
    deleteSessionCalled?: boolean
    resetDatabaseCalled?: boolean
    restoreLastSession?: boolean
    restoreQuiz?: boolean
    sqlearner: {
      exportSession: (sessionId: string) => Promise<boolean>
      importSession: () => Promise<SessionSummary | undefined>
      recordSessionEvent: (sessionId: string, event: { type: string; data: unknown }) => Promise<void>
      listSessions: () => Promise<SessionSummary[]>
      activateSession: () => Promise<SessionSummary>
      getLastOpenedSessionId: () => Promise<string | undefined>
      prepareDatabase: () => Promise<SessionSummary>
      renameSession: (_sessionId: string, name: string) => Promise<SessionSummary>
      openSessionFolder: () => Promise<void>
      deleteSession: () => Promise<void>
      listTables: () => Promise<TableSummary[]>
      previewTable: (_sessionId: string, tableName: string) => Promise<TablePreview>
      runQuery: () => Promise<QueryResult>
      resetDatabase: () => Promise<void>
      loadLessonProgress: () => Promise<CourseProgress>
      saveLessonProgress: (_sessionId: string, progress: CourseProgress) => Promise<CourseProgress>
      loadSessionWorkspace: () => Promise<SessionWorkspaceState>
      saveSessionWorkspace: (_sessionId: string, patch: SessionWorkspacePatch) => Promise<SessionWorkspaceState>
      onProgress: (_callback: (update: ProgressUpdate) => void) => () => void
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.deleteSessionCalled = false
    window.resetDatabaseCalled = false
    const session: SessionSummary = {
      id: 'session-e2e',
      name: 'SQLearner E2E',
      folderPath: '/tmp/sqlearner/session-e2e',
      databasePath: '/tmp/sqlearner/session-e2e/olist.sqlite',
      workingDatabasePath: '/tmp/sqlearner/session-e2e/practice.sqlite',
      createdAt: '2026-08-29T00:00:00.000Z',
      lastUsedAt: '2026-08-29T00:00:00.000Z',
      status: 'ready'
    }

    window.sqlearner = {
      exportSession: async (id) => { window.sessionExported = id; return true },
      importSession: async () => session,
      recordSessionEvent: async (_id, event) => { (window.interactionTypes ??= []).push(event.type) },
      listSessions: async () => [session],
      activateSession: async () => session,
      getLastOpenedSessionId: async () => window.restoreLastSession || window.restoreQuiz ? session.id : undefined,
      prepareDatabase: async () => session,
      renameSession: async (_sessionId: string, name: string) => ({ ...session, name }),
      openSessionFolder: async () => undefined,
      deleteSession: async () => {
        window.deleteSessionCalled = true
      },
      listTables: async () => [
        { name: 'customers', rowCount: 3, columns: ['customer_id', 'city', 'state'] },
        { name: 'orders', rowCount: 3, columns: ['order_id', 'customer_id', 'status', 'total'] }
      ],
      previewTable: async (_sessionId: string, tableName: string) => {
        if (tableName === 'orders') {
          return {
            columns: ['order_id', 'customer_id', 'status', 'total'],
            rows: [{ order_id: 'o_1001', customer_id: 'c_001', status: 'delivered', total: 129.9 }]
          }
        }

        return {
          columns: ['customer_id', 'city', 'state'],
          rows: [{ customer_id: 'c_001', city: 'sao paulo', state: 'SP' }]
        }
      },
      runQuery: async () => ({
        columns: ['customer_id', 'city'],
        rows: [{ customer_id: 'c_001', city: 'sao paulo' }],
        elapsedMs: 4
      }),
      resetDatabase: async () => {
        window.resetDatabaseCalled = true
      },
      loadLessonProgress: async () => ({ lessons: {}, exams: {} }),
      saveLessonProgress: async (_sessionId: string, progress: CourseProgress) => progress,
      loadSessionWorkspace: async (): Promise<SessionWorkspaceState> => window.restoreQuiz
        ? {
            activeView: 'lessons',
            lessons: {
              expandedModules: ['foundations'],
              selection: { type: 'lesson', lessonId: 'foundations-tour' },
              attempts: { 'lesson:foundations-tour': 1 },
              practiceDrafts: {},
              quiz: {
                mode: 'lesson',
                targetId: 'foundations-tour',
                title: 'Lesson 1: Meet the Olist database',
                index: 1,
                furthestIndex: 1,
                finished: false,
                passed: false,
                items: [
                  {
                    question: {
                      id: 'restored-random-question-1',
                      prompt: 'First randomly drawn question',
                      options: ['A', 'B'],
                      answer: 'A',
                      explanation: 'A is correct.'
                    },
                    options: ['B', 'A'],
                    selected: 'A',
                    queryDraft: ''
                  },
                  {
                    question: {
                      id: 'restored-random-question-2',
                      prompt: 'Second randomly drawn question',
                      options: ['C', 'D'],
                      answer: 'C',
                      explanation: 'C is correct.'
                    },
                    options: ['D', 'C'],
                    selected: 'D',
                    queryDraft: ''
                  }
                ]
              }
            }
          }
        : window.restoreLastSession
        ? {
            activeView: 'lessons',
            lessons: {
              expandedModules: ['foundations'],
              selection: { type: 'lesson', lessonId: 'foundations-tour' },
              attempts: {},
              practiceDrafts: { 'foundations-tour': 'SELECT 1 AS restored;' }
            }
          }
        : {
            activeView: 'database',
            lessons: { expandedModules: [], attempts: {}, practiceDrafts: {} }
          },
      saveSessionWorkspace: async (_sessionId: string, patch: SessionWorkspacePatch) => ({
        activeView: patch.activeView ?? 'database',
        lessons: patch.lessons ?? { expandedModules: [], attempts: {}, practiceDrafts: {} }
      }),
      onProgress: () => () => undefined
    }
  })
})

test('automatically restores the last opened session', async ({ page }) => {
  await page.addInitScript(() => {
    window.restoreLastSession = true
  })
  await page.goto('/')

  await expect(page.getByTestId('workspace-sidebar')).toBeVisible()
  await expect(page.getByTestId('session-name-readonly')).toHaveText('SQLearner E2E')
  await expect(page.getByTestId('lessons-view')).toBeVisible()
  await expect(page.getByTestId('lesson-title')).toContainText('Lesson 1')
  await expect(page.getByTestId('lesson-practice').getByTestId('sql-block-editor'))
    .toHaveValue('SELECT 1 AS restored;')
})

test('restores the drawn quiz and answered question at the same position', async ({ page }) => {
  await page.addInitScript(() => {
    window.restoreQuiz = true
  })
  await page.goto('/')

  await expect(page.getByTestId('lessons-view')).toBeVisible()
  await expect(page.getByTestId('quiz-counter')).toHaveText('Question 2 of 2')
  await expect(page.getByTestId('quiz-prompt')).toHaveText('Second randomly drawn question')
  await expect(page.getByTestId('quiz-feedback')).toContainText('Not quite')
  await expect(page.getByTestId('quiz-next')).toBeEnabled()

  await page.getByTestId('lesson-item').first().click()
  await expect(page.getByTestId('quiz-counter')).toHaveText('Question 2 of 2')
  await expect(page.getByTestId('quiz-prompt')).toHaveText('Second randomly drawn question')
  await expect(page.getByTestId('quiz-feedback')).toContainText('Not quite')
})

test('keeps database tables visible after navigating to queries and back', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('sessions-home')).toBeVisible()
  await expect(page.getByTestId('workspace-sidebar')).toBeHidden()
  await page.getByTestId('session-card').click()

  await expect(page.getByTestId('database-view')).toBeVisible()
  await expect(page.getByTestId('table-button').filter({ hasText: 'customers' })).toBeVisible()
  await expect(page.getByTestId('table-preview')).toContainText('sao paulo')

  await page.getByTestId('nav-queries').click()
  await expect(page.getByTestId('queries-view')).toBeVisible()
  await expect(page.getByTestId('query-editor')).toBeVisible()
  await expect(page.getByTestId('query-editor')).toHaveValue('SELECT * FROM customers LIMIT 10;')

  await page.getByTestId('nav-database').click()
  await expect(page.getByTestId('database-view')).toBeVisible()
  await expect(page.getByTestId('table-button').filter({ hasText: 'customers' })).toBeVisible()
  await expect(page.getByTestId('table-button').filter({ hasText: 'orders' })).toBeVisible()
  await expect(page.getByTestId('table-preview')).toContainText('sao paulo')
})

test('runs a query from the Queries tab', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('session-card').click()
  await page.getByTestId('nav-queries').click()
  await page.getByTestId('run-query').click()

  await expect(page.getByTestId('query-result')).toBeVisible()
  await expect(page.getByTestId('query-result')).toContainText('sao paulo')
})

test('shows and uses the run shortcut for the current platform', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('session-card').click()
  await page.getByTestId('nav-queries').click()

  const platform = await page.evaluate(() => navigator.platform.toLowerCase())
  const usesMeta = platform.includes('mac') || platform.includes('win')
  const accessibleShortcut = platform.includes('mac')
    ? 'Command + Enter'
    : platform.includes('win') ? 'Windows + Enter' : 'Control + Enter'

  const shortcut = page.getByTestId('run-query').getByTestId('run-shortcut')
  await expect(shortcut).toHaveAttribute('aria-label', accessibleShortcut)
  await expect(shortcut.locator('kbd')).toHaveCount(2)
  await page.getByTestId('query-editor').press(usesMeta ? 'Meta+Enter' : 'Control+Enter')

  await expect(page.getByTestId('query-result')).toBeVisible()
  await expect(page.getByTestId('query-result')).toContainText('sao paulo')
})

test('renames a session and returns to the session list', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('session-card').click()

  await expect(page.getByTestId('session-name-readonly')).toHaveText('SQLearner E2E')
  await expect(page.getByTestId('session-name-input')).toBeHidden()
  await page.getByTestId('edit-session-name').click()
  await page.getByTestId('session-name-input').fill('My SQL practice')
  await page.getByTestId('save-session-name').click()
  await expect(page.getByTestId('session-name-input')).toBeHidden()
  await expect(page.getByTestId('session-name-readonly')).toHaveText('My SQL practice')

  await page.getByTestId('back-to-sessions').click()
  await expect(page.getByTestId('sessions-home')).toBeVisible()
  await expect(page.getByTestId('workspace-sidebar')).toBeHidden()
  await expect(page.getByTestId('session-card')).toContainText('My SQL practice')
  await expect(page.getByTestId('create-session')).toBeVisible()
})

test('confirms session deletion in a custom modal', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('delete-session-button').click()
  const modal = page.getByTestId('delete-session-modal')
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('SQLearner E2E')
  await expect(page.getByTestId('cancel-delete-session')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await expect.poll(() => page.evaluate(() => window.deleteSessionCalled)).toBe(false)

  await page.getByTestId('delete-session-button').click()
  await page.getByTestId('confirm-delete-session').click()
  await expect(modal).toBeHidden()
  await expect.poll(() => page.evaluate(() => window.deleteSessionCalled)).toBe(true)
})

test('includes a runnable query in every four-question lesson quiz', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('session-card').click()
  await page.getByTestId('nav-lessons').click()
  await page.getByTestId('lesson-item').first().click()
  await page.getByTestId('start-lesson-quiz').click()

  await expect(page.getByTestId('quiz-counter')).toContainText('of 4')
  let ranQuery = false
  let revealedHint = false

  const platform = await page.evaluate(() => navigator.platform.toLowerCase())
  const usesMeta = platform.includes('mac') || platform.includes('win')
  const accessibleShortcut = platform.includes('mac')
    ? 'Command + Enter'
    : platform.includes('win') ? 'Windows + Enter' : 'Control + Enter'

  for (let index = 0; index < 4; index += 1) {
    const editor = page.getByTestId('quiz-query-editor')
    if (await editor.isVisible()) {
      const shortcut = page.getByTestId('quiz-run-query').getByTestId('run-shortcut')
      await expect(shortcut).toHaveAttribute('aria-label', accessibleShortcut)
      await expect(shortcut.locator('kbd')).toHaveCount(2)

      const hintToggle = page.getByTestId('quiz-hint-toggle')
      if (await hintToggle.isVisible()) {
        await expect(hintToggle).toHaveAttribute('aria-expanded', 'false')
        await expect(page.getByTestId('quiz-hint')).toBeHidden()
        await hintToggle.click()
        await expect(hintToggle).toHaveAttribute('aria-expanded', 'true')
        await expect(page.getByTestId('quiz-hint')).toBeVisible()
        revealedHint = true
      }

      if (!(await editor.inputValue()).trim()) await editor.fill('SELECT 1;')
      await editor.press(usesMeta ? 'Meta+Enter' : 'Control+Enter')
      await expect(page.getByTestId('quiz-query-result')).toBeVisible()
      await expect(page.getByTestId('quiz-next')).toBeEnabled()
      ranQuery = true
      if (revealedHint) break
    } else {
      await page.getByTestId('quiz-option').first().click()
    }

    await page.getByTestId('quiz-next').click()
  }

  expect(ranQuery).toBe(true)
  expect(revealedHint).toBe(true)
})

test('allows navigation only between quiz questions already reached', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('session-card').click()
  await page.getByTestId('nav-lessons').click()
  await page.getByTestId('lesson-item').first().click()
  await page.getByTestId('start-lesson-quiz').click()

  const navigationItems = page.getByTestId('quiz-question-navigation-item')
  await expect(navigationItems).toHaveCount(4)
  await expect(navigationItems.nth(0)).toBeEnabled()
  await expect(navigationItems.nth(1)).toBeDisabled()

  const editor = page.getByTestId('quiz-query-editor')
  if (await editor.isVisible()) {
    await editor.fill('SELECT 1;')
    await page.getByTestId('quiz-run-query').click()
  } else {
    await page.getByTestId('quiz-option').first().click()
  }
  await page.getByTestId('quiz-next').click()

  await expect(page.getByTestId('quiz-counter')).toHaveText('Question 2 of 4')
  await expect(navigationItems.nth(0)).toBeEnabled()
  await expect(navigationItems.nth(1)).toBeEnabled()
  await expect(navigationItems.nth(2)).toBeDisabled()

  await navigationItems.nth(0).click()
  await expect(page.getByTestId('quiz-counter')).toHaveText('Question 1 of 4')
  await navigationItems.nth(1).click()
  await expect(page.getByTestId('quiz-counter')).toHaveText('Question 2 of 4')
})

test('opens a lesson and lets the user practice before revealing the solution', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('session-card').click()

  await page.getByTestId('nav-lessons').click()
  await expect(page.getByTestId('lessons-view')).toBeVisible()
  await expect(page.getByTestId('lessons-tree')).toBeVisible()

  const firstLesson = page.getByTestId('lesson-item').first()
  await firstLesson.hover()
  await expect(page.getByTestId('lesson-tooltip')).toContainText('Lesson 1')

  await firstLesson.click()
  await expect(page.getByTestId('lesson-title')).toContainText('Lesson 1')

  const practice = page.getByTestId('lesson-practice')
  const practiceEditor = practice.getByTestId('sql-block-editor')
  await expect(practiceEditor).toBeVisible()
  await expect(practiceEditor).toHaveValue('')
  await practiceEditor.fill('SELECT 1 AS practice;')
  await practice.getByTestId('run-sql-block').click()
  await expect(practice.getByTestId('sql-block-result')).toBeVisible()

  await page.getByTestId('show-solution').click()
  await expect(page.getByTestId('practice-solution')).toBeVisible()
  await expect(practiceEditor).toHaveValue('SELECT 1 AS practice;')
  await page.getByTestId('use-practice-solution').click()
  await expect(practiceEditor).toHaveValue("SELECT name, type\nFROM pragma_table_info('order_items');")

  await page.getByTestId('run-sql-block').first().click()
  await expect(page.getByTestId('sql-block-result').first()).toContainText('sao paulo')
})

test('draws a random set of questions at the end of a lesson', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('session-card').click()
  await page.getByTestId('nav-lessons').click()
  await page.getByTestId('lesson-item').first().click()

  await page.getByTestId('start-lesson-quiz').click()
  await expect(page.getByTestId('quiz-panel')).toBeVisible()
  await expect(page.getByTestId('quiz-counter')).toContainText('Question 1 of 4')

  const queryEditor = page.getByTestId('quiz-query-editor')
  if (await queryEditor.isVisible()) {
    if (!(await queryEditor.inputValue()).trim()) await queryEditor.fill('SELECT 1;')
    await page.getByTestId('quiz-run-query').click()
  } else {
    await expect(page.getByTestId('quiz-option')).toHaveCount(4)
    await page.getByTestId('quiz-option').first().click()
  }

  await expect(page.getByTestId('quiz-feedback')).toBeVisible()
  await expect(page.getByTestId('quiz-next')).toBeEnabled()
})

test('jumps straight to a module exam without finishing the lessons', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('session-card').click()
  await page.getByTestId('nav-lessons').click()

  await page.getByTestId('module-exam-item').first().click()
  await expect(page.getByTestId('exam-detail')).toBeVisible()
  await page.getByTestId('start-module-exam').click()
  await expect(page.getByTestId('quiz-counter')).toContainText('of 14')
})

test('rebuilds the working copy from the database view', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('session-card').click()
  await expect(page.getByTestId('database-view')).toBeVisible()

  await page.getByTestId('reset-database').click()
  await expect(page.getByTestId('reset-database-confirm')).toBeVisible()
  await page.getByTestId('reset-database-confirm-button').click()

  await expect(page.getByTestId('reset-database-notice')).toBeVisible()
  expect(await page.evaluate(() => window.resetDatabaseCalled)).toBe(true)
})


test('exports and restores a session key and records user actions', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Restore session key' })).toBeVisible()
  await page.getByRole('button', { name: 'Restore session key' }).click()
  await expect(page.getByTestId('database-view')).toBeVisible()
  await page.getByRole('button', { name: 'Save session key' }).click()
  await expect(page.getByRole('status')).toHaveText('Session key saved.')
  expect(await page.evaluate(() => window.sessionExported)).toBe('session-e2e')
  expect(await page.evaluate(() => window.interactionTypes)).toContain('ui.app.selectTable')
})

test('shows transfer errors and allows another attempt', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => { window.sqlearner.importSession = async () => { throw new Error('Session key checksum mismatch') } })
  await page.getByRole('button', { name: 'Restore session key' }).click()
  await expect(page.getByRole('status')).toHaveText('Session key checksum mismatch')
  await expect(page.getByRole('button', { name: 'Restore session key' })).toBeEnabled()
})
