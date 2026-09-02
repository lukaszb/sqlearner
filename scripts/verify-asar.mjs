#!/usr/bin/env node
// Verifies that a packed app.asar actually contains every module the built main
// process and preload bridge import at runtime.
//
// This is the end-to-end counterpart to tests/package-files.test.ts: the test
// guards the electron-builder globs at the source level, this script checks the
// artifact that ships. A dropped glob (see v0.1.0, which lost dist/shared) makes
// the packaged app die at launch with ERR_MODULE_NOT_FOUND, and nothing else in
// the build catches it.
//
// Usage: node scripts/verify-asar.mjs [path/to/app.asar]

import { closeSync, existsSync, openSync, readFileSync, readdirSync, readSync } from 'node:fs'
import path from 'node:path'

const archivePath = process.argv[2] ?? 'release/win-unpacked/resources/app.asar'
const entryDirectories = ['dist/main', 'dist/preload']
const requiredFiles = ['dist/main/index.js', 'dist/preload/index.cjs', 'dist/renderer/index.html']
const scannedExtensions = new Set(['.js', '.cjs', '.mjs'])
const relativeSpecifier = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"](\.[^'"]*)['"]/g

function readArchiveEntries(file) {
  const descriptor = openSync(file, 'r')
  try {
    const preamble = Buffer.alloc(16)
    readSync(descriptor, preamble, 0, 16, 0)
    const header = Buffer.alloc(preamble.readUInt32LE(12))
    readSync(descriptor, header, 0, header.length, 16)
    const entries = new Set()
    const walk = (node, prefix) => {
      for (const [name, child] of Object.entries(node.files ?? {})) {
        if (child.files) walk(child, `${prefix}${name}/`)
        else entries.add(`${prefix}${name}`)
      }
    }
    walk(JSON.parse(header.toString('utf8')), '')
    return entries
  } finally {
    closeSync(descriptor)
  }
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return listFiles(full)
    return scannedExtensions.has(path.extname(entry.name)) ? [full] : []
  })
}

// Node resolves extensionless CommonJS specifiers; mirror the candidates it tries.
function resolutionCandidates(target) {
  return [target, `${target}.js`, `${target}.cjs`, `${target}.mjs`, `${target}/index.js`]
}

if (!existsSync(archivePath)) {
  console.error(`verify-asar: archive not found: ${archivePath}`)
  process.exit(1)
}

const packaged = readArchiveEntries(archivePath)
const problems = []

for (const required of requiredFiles) {
  if (!packaged.has(required)) problems.push(`missing required file: ${required}`)
}

let scanned = 0
for (const directory of entryDirectories) {
  if (!existsSync(directory)) {
    problems.push(`missing build output: ${directory}`)
    continue
  }
  for (const file of listFiles(directory)) {
    scanned += 1
    const source = readFileSync(file, 'utf8')
    for (const [, specifier] of source.matchAll(relativeSpecifier)) {
      const from = file.split(path.sep).join('/')
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier))
      if (resolutionCandidates(target).some((candidate) => packaged.has(candidate))) continue
      problems.push(`${from} imports ${specifier} -> ${target} is not in the archive`)
    }
  }
}

if (problems.length > 0) {
  console.error(`verify-asar: ${archivePath} is incomplete`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(
  `verify-asar: ok - ${packaged.size} entries, ${scanned} module(s) scanned, all imports resolve`
)
