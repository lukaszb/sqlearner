import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { CourseProgress, ProgressEntry, SessionSummary } from '@/shared/types.js'
import { createEmptyProgress } from '@/shared/course/types.js'

const progressFileName = 'lesson-progress.json'

export function getProgressPath(session: SessionSummary): string {
  return path.join(session.folderPath, progressFileName)
}

function isProgressEntry(value: unknown): value is ProgressEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<ProgressEntry>
  return typeof entry.completedAt === 'string' && typeof entry.attempts === 'number'
}

function sanitizeEntries(value: unknown): Record<string, ProgressEntry> {
  if (typeof value !== 'object' || value === null) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter((pair): pair is [string, ProgressEntry] =>
      isProgressEntry(pair[1])
    )
  )
}

/** Accepts anything read from disk or sent by the renderer and returns a valid progress object. */
export function sanitizeProgress(value: unknown): CourseProgress {
  if (typeof value !== 'object' || value === null) return createEmptyProgress()
  const raw = value as { lessons?: unknown; exams?: unknown }
  return {
    lessons: sanitizeEntries(raw.lessons),
    exams: sanitizeEntries(raw.exams)
  }
}

export async function loadProgress(session: SessionSummary): Promise<CourseProgress> {
  try {
    return sanitizeProgress(JSON.parse(await readFile(getProgressPath(session), 'utf8')))
  } catch {
    return createEmptyProgress()
  }
}

export async function saveProgress(session: SessionSummary, progress: unknown): Promise<CourseProgress> {
  const sanitized = sanitizeProgress(progress)
  await writeFile(getProgressPath(session), JSON.stringify(sanitized, null, 2))
  return sanitized
}
