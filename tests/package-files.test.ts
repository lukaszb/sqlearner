import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const srcRoot = path.join(projectRoot, 'src')

// Trees that electron-builder copies into app.asar verbatim, as opposed to the
// renderer, which Vite bundles into a self-contained chunk.
const entryRoots = ['main', 'preload']
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.cjs', '.mjs', '.vue'])
// Matches both relative specifiers and the "@/" alias that tsc-alias rewrites
// into relative paths at build time.
const localSpecifier = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]((?:\.|@\/)[^'"]*)['"]/g

const packageJson = JSON.parse(
  readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
) as { build: { files: string[] } }

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return listSourceFiles(full)
    return sourceExtensions.has(path.extname(entry.name)) ? [full] : []
  })
}

// Top-level directories under src/ that imports inside `root` reach into.
function directoriesReachedFrom(root: string): Set<string> {
  const reached = new Set<string>()
  for (const file of listSourceFiles(path.join(srcRoot, root))) {
    const source = readFileSync(file, 'utf8')
    for (const [, specifier] of source.matchAll(localSpecifier)) {
      const resolved = specifier.startsWith('@/')
        ? path.join(srcRoot, specifier.slice(2))
        : path.resolve(path.dirname(file), specifier)
      const relativeToSrc = path.relative(srcRoot, resolved)
      if (relativeToSrc.startsWith('..')) continue
      reached.add(relativeToSrc.split(path.sep)[0])
    }
  }
  return reached
}

function requiredDistDirectories(): string[] {
  const required = new Set(entryRoots)
  const queue = [...entryRoots]
  while (queue.length > 0) {
    for (const directory of directoriesReachedFrom(queue.shift() as string)) {
      if (required.has(directory)) continue
      required.add(directory)
      queue.push(directory)
    }
  }
  return [...required].sort()
}

function isShipped(distDirectory: string): boolean {
  return packageJson.build.files.some((pattern) => pattern.startsWith(`dist/${distDirectory}/`))
}

describe('electron-builder file globs', () => {
  // Regression guard: dropping dist/shared from build.files packaged an app that
  // crashed on launch with ERR_MODULE_NOT_FOUND for dist/shared/ipc.js.
  it('ships every dist directory the packaged main process imports', () => {
    expect(requiredDistDirectories().filter((directory) => !isShipped(directory))).toEqual([])
  })

  it('ships the bundled renderer', () => {
    expect(isShipped('renderer')).toBe(true)
  })
})
