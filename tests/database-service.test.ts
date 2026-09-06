import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import {
  assertCompleteKaggleDataset,
  executeSql,
  getTableColumns,
  isKaggleCacheFresh,
  serializeRows
} from '@/main/services/database-service'

describe('database metadata', () => {
  it('returns columns for empty tables', () => {
    const db = new Database(':memory:')
    db.exec('CREATE TABLE lessons (id TEXT PRIMARY KEY, title TEXT NOT NULL)')

    expect(getTableColumns(db, 'lessons')).toEqual(['id', 'title'])

    db.close()
  })

  it('returns IPC-safe rows for pragma table-valued queries', () => {
    const db = new Database(':memory:')
    db.exec('CREATE TABLE order_items (id TEXT, price REAL)')

    const result = executeSql(db, "SELECT name FROM pragma_table_info('order_items');")

    expect(result.rows).toEqual([{ name: 'id' }, { name: 'price' }])
    expect(Object.getPrototypeOf(result.rows[0])).toBe(Object.prototype)
    expect(() => structuredClone(result)).not.toThrow()
    db.close()
  })

  it('copies database rows into serializable ordinary objects', () => {
    const source = Object.assign(Object.create(null) as Record<string, unknown>, { value: 1 })
    const [serialized] = serializeRows([source])

    expect(serialized).toEqual({ value: 1 })
    expect(Object.getPrototypeOf(serialized)).toBe(Object.prototype)
  })
})

describe('Kaggle dataset validation', () => {
  const completeDataset = [
    'olist_customers_dataset.csv',
    'olist_geolocation_dataset.csv',
    'olist_order_items_dataset.csv',
    'olist_order_payments_dataset.csv',
    'olist_order_reviews_dataset.csv',
    'olist_orders_dataset.csv',
    'olist_products_dataset.csv',
    'olist_sellers_dataset.csv',
    'product_category_name_translation.csv'
  ]

  it('accepts the complete Olist dataset', () => {
    expect(() => assertCompleteKaggleDataset(completeDataset)).not.toThrow()
  })

  it('rejects an incomplete Olist dataset', () => {
    expect(() => assertCompleteKaggleDataset(completeDataset.slice(1))).toThrow('olist_customers_dataset.csv')
  })
})

describe('Kaggle cache freshness', () => {
  const dayMs = 24 * 60 * 60 * 1000
  const now = Date.parse('2026-09-02T12:00:00.000Z')

  it('reuses a cache file that is no more than 30 days old', () => {
    expect(isKaggleCacheFresh(now - 30 * dayMs, now)).toBe(true)
  })

  it('refreshes a cache file that is older than 30 days', () => {
    expect(isKaggleCacheFresh(now - 30 * dayMs - 1, now)).toBe(false)
  })
})
