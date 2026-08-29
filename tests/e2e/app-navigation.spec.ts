import { expect, test } from '@playwright/test'
import type { ProgressUpdate, QueryResult, SessionSummary, TablePreview, TableSummary } from '@/shared/types'

declare global {
  interface Window {
    sqlearner: {
      listSessions: () => Promise<SessionSummary[]>
      prepareDatabase: () => Promise<SessionSummary>
      openSessionFolder: () => Promise<void>
      deleteSession: () => Promise<void>
      listTables: () => Promise<TableSummary[]>
      previewTable: (_sessionId: string, tableName: string) => Promise<TablePreview>
      runQuery: () => Promise<QueryResult>
      onProgress: (_callback: (update: ProgressUpdate) => void) => () => void
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
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
      openSessionFolder: async () => undefined,
      deleteSession: async () => undefined,
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
      onProgress: () => () => undefined
    }
  })
})

test('keeps database tables visible after navigating to queries and back', async ({ page }) => {
  await page.goto('/')

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

  await page.getByTestId('nav-queries').click()
  await page.getByTestId('run-query').click()

  await expect(page.getByTestId('query-result')).toBeVisible()
  await expect(page.getByTestId('query-result')).toContainText('sao paulo')
})
