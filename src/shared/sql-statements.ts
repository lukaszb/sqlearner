/**
 * Splits a SQL script into individual statements.
 *
 * better-sqlite3 prepares one statement at a time, so lesson scripts such as
 * "DROP TABLE ...; CREATE TABLE ...; SELECT ...;" have to be executed step by
 * step. Semicolons inside string literals, quoted identifiers and comments are
 * ignored.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let quote: "'" | '"' | '`' | ']' | undefined
  let lineComment = false
  let blockComment = false

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index] as string
    const next = sql[index + 1]

    if (lineComment) {
      current += char
      if (char === '\n') lineComment = false
      continue
    }

    if (blockComment) {
      current += char
      if (char === '*' && next === '/') {
        current += next
        index += 1
        blockComment = false
      }
      continue
    }

    if (quote) {
      current += char
      if (char === quote) {
        // Two quotes in a row escape the quote character inside a literal.
        if (next === quote && quote !== ']') {
          current += next
          index += 1
        } else {
          quote = undefined
        }
      }
      continue
    }

    if (char === '-' && next === '-') {
      current += char
      lineComment = true
      continue
    }

    if (char === '/' && next === '*') {
      current += char + next
      index += 1
      blockComment = true
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char
      current += char
      continue
    }

    if (char === '[') {
      quote = ']'
      current += char
      continue
    }

    if (char === ';') {
      if (current.trim()) statements.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) statements.push(current.trim())
  return statements
}
