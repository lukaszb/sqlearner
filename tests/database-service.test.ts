import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { assertCompleteKaggleDataset, getTableColumns } from '@/main/services/database-service'

describe('database metadata', () => {
  it('returns columns for empty tables', () => {
    const db = new Database(':memory:')
    db.exec('CREATE TABLE lessons (id TEXT PRIMARY KEY, title TEXT NOT NULL)')

    expect(getTableColumns(db, 'lessons')).toEqual(['id', 'title'])

    db.close()
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
