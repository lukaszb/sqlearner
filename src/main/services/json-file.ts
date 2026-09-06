import { rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

/** Replaces a JSON file in one filesystem operation so an interrupted write cannot truncate it. */
export async function writeJsonAtomically(filePath: string, value: unknown): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temporaryPath, JSON.stringify(value, null, 2))
  await rename(temporaryPath, filePath)
}
