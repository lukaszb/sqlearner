import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { getTableColumns } from '@/main/services/database-service'

describe('database metadata', () => {
  it('returns columns for empty tables', () => {
    const db = new Database(':memory:')
    db.exec('CREATE TABLE lessons (id TEXT PRIMARY KEY, title TEXT NOT NULL)')

    expect(getTableColumns(db, 'lessons')).toEqual(['id', 'title'])

    db.close()
  })
})
