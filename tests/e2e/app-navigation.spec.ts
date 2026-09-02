import { expect, test } from '@playwright/test'
import type { CourseProgress, ProgressUpdate, QueryResult, SessionSummary, TablePreview, TableSummary } from '@/shared/types'

declare global {
  interface Window {
    deleteSessionCalled?: boolean
    sqlearner: {
      listSessions: () => Promise<SessionSummary[]>
      prepareDatabase: () => Promise<SessionSummary>
      renameSession: (_sessionId: string, name: string) => Promise<SessionSummary>
      openSessionFolder: () => Promise<void>
      deleteSession: () => Promise<void>
      listTables: () => Promise<TableSummary[]>
      previewTable: (_sessionId: string, tableName: string) => Promise<TablePreview>
      runQuery: () => Promise<QueryResult>
      runLessonQuery: () => Promise<QueryResult>
      resetSandbox: () => Promise<void>
      loadLessonProgress: () => Promise<CourseProgress>
      saveLessonProgress: (_sessionId: string, progress: CourseProgress) => Promise<CourseProgress>
      onProgress: (_callback: (update: ProgressUpdate) => void) => () => void
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.deleteSessionCalled = false
    const session: SessionSummary = {
      id: 'session-e2e',
      name: 'SQLearner E2E',
      folderPath: '/tmp/sqlearner/session-e2e',
      databasePath: '/tmp/sqlearner/session-e2e/olist.sqlite',
      createdAt: '2026-08-29T00:00:00.000Z',
      lastUsedAt: '2026-08-29T00:00:00.000Z',
      status: 'ready'
    }

    window.sqlearner = {
      listSessions: async () => [session],
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
      runLessonQuery: async () => ({
        columns: ['customer_id', 'city'],
        rows: [{ customer_id: 'c_001', city: 'sao paulo' }],
        elapsedMs: 4
      }),
      resetSandbox: async () => undefined,
      loadLessonProgress: async () => ({ lessons: {}, exams: {} }),
      saveLessonProgress: async (_sessionId: string, progress: CourseProgress) => progress,
      onProgress: () => () => undefined
    }
  })
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

test('opens a lesson from the Lessons sidebar and runs its example', async ({ page }) => {
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
