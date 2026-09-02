import { describe, expect, it } from 'vitest'
import { splitSqlStatements } from '@/shared/sql-statements'

describe('splitSqlStatements', () => {
  it('returns a single statement unchanged', () => {
    expect(splitSqlStatements('SELECT 1')).toEqual(['SELECT 1'])
    expect(splitSqlStatements('SELECT 1;')).toEqual(['SELECT 1'])
  })

  it('splits a script and drops empty fragments', () => {
    expect(splitSqlStatements('DROP TABLE t;\n\nCREATE TABLE t (a TEXT);;\n')).toEqual([
      'DROP TABLE t',
      'CREATE TABLE t (a TEXT)'
    ])
  })

  it('keeps semicolons inside string literals', () => {
    expect(splitSqlStatements("SELECT 'a;b' AS x; SELECT 2")).toEqual(["SELECT 'a;b' AS x", 'SELECT 2'])
  })

  it('handles escaped quotes inside literals', () => {
    expect(splitSqlStatements("SELECT 'it''s; fine'; SELECT 2")).toEqual(["SELECT 'it''s; fine'", 'SELECT 2'])
  })

  it('ignores semicolons in comments', () => {
    expect(splitSqlStatements('SELECT 1; -- trailing; comment\nSELECT 2')).toEqual([
      'SELECT 1',
      '-- trailing; comment\nSELECT 2'
    ])
    expect(splitSqlStatements('SELECT 1 /* a; b */; SELECT 2')).toEqual(['SELECT 1 /* a; b */', 'SELECT 2'])
  })

  it('returns an empty list for blank input', () => {
    expect(splitSqlStatements('   \n  ')).toEqual([])
  })
})
