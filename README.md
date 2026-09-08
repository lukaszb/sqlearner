# SQLearner

SQLearner is an Electron desktop app for learning SQL with a local SQLite dataset.

## Development

```bash
npm install
npm run dev
```

`npm run dev` expects Vite on port `5173`. Stop any older dev server using that port before restarting.

## Lessons

The sidebar has a `Lessons` item with the SQL course built on the session database. It expands into modules and each
module into individual lessons; hovering a lesson shows its full title in a tooltip on the right.

- Five modules: Foundations, Aggregation, Combining tables, Changing data and the Analyst toolkit, ordered from basics
  to advanced.
- Every lesson explains what each SQL clause does, and every example can be run against the session database from the
  lesson screen.
- Each lesson ends with three questions drawn at random from a larger bank. All of them have to be correct; a single
  mistake draws a fresh set and the lesson stays unfinished.
- Every module ends with an exam of at least ten questions with at least two from every lesson of that module.
- Lessons can be taken in any order, and progress is stored per session in `lesson-progress.json` inside the session
  folder.

The table browser, the query tabs and the lessons all run against `practice.sqlite`, a writable working copy created
during setup. Write statements are allowed everywhere, and the database produced by the CSV import is kept aside
untouched, so `Reset database` in the Database view rebuilds the working copy from it at any time.

## Kaggle Dataset

When a session is created, SQLearner downloads the complete public Olist dataset directly from Kaggle and imports all nine CSV files into SQLite. Python, `kagglehub`, and Kaggle API credentials are not required.

The downloaded ZIP is cached in the OS-specific app data directory for 30 days and reused when creating additional sessions. An expired or invalid cache is downloaded again. Extracted CSV files are removed from the session after a successful import.

An incomplete download or import fails session creation instead of silently substituting a sample database.

Run checks:

```bash
npm run typecheck
npm test
```

Native modules such as `better-sqlite3` must be rebuilt for Electron, not the system Node.js runtime. `npm install` runs this automatically through `postinstall`; use `npm run rebuild:native` after changing Electron or native SQLite versions.

Build binaries:

```bash
npm run build:mac
npm run build:mac:release
npm run build:win
npm run build:win:portable
```

`npm run build:win` creates a standalone Windows x64 `.exe` in `release/`; it does not require installation. `npm run build:mac` creates an ad-hoc-signed ZIP for local testing on the Mac that built it. Hardened Runtime is disabled for this local build because Electron contains native libraries signed by another team. `build:win:portable` remains as an alias for `build:win`.

`npm run build:mac:release` is the distributable macOS build. It requires a `Developer ID Application` certificate and Apple notarization credentials, enables Hardened Runtime, and fails instead of silently producing an unsigned ZIP. `npm run build:release` does the same after building Windows and must run on macOS. The Windows portable executable remains unsigned unless a Windows certificate is configured. Cross-building Windows from an Apple Silicon Mac may also require Wine.

For a local Developer ID certificate installed in Keychain, configure notarization with one of the credential sets supported by Electron Builder:

```bash
# Recommended for CI: App Store Connect API key
export APPLE_API_KEY=/absolute/path/to/AuthKey_ABC123.p8
export APPLE_API_KEY_ID=ABC123
export APPLE_API_ISSUER=00000000-0000-0000-0000-000000000000

# Or an Apple ID app-specific password
export APPLE_ID=developer@example.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=ABCDE12345

npm run build:mac:release
```

Do not publish the output of `build:mac`: an ad-hoc signature is only a local-development convenience. Apps downloaded by other users must use the Developer ID and notarized release build to pass Gatekeeper.

Detailed certificate setup, notarization and troubleshooting instructions are
in [`docs/macos-code-signing.md`](docs/macos-code-signing.md).

Windows packaging uses the prebuilt `better-sqlite3` binary included by the dependency. Electron Builder's native dependency rebuild is disabled because `node-gyp` cannot cross-compile a Windows x64 addon on a macOS ARM host.

## Releasing

```bash
GITHUB_TOKEN=<token> scripts/release
```

Bump `version` in `package.json` first — the script derives the tag (`v<version>`)
and the asset name from it, and refuses to run if that release already exists.
The token needs `repo` scope (classic) or `Contents: write` (fine-grained); it can
also come from `GH_TOKEN`, a `GITHUB_TOKEN=` line in the gitignored `.env`, or
`gh auth token`.

The script cleans, builds, verifies and publishes in one pass: it wipes `dist/`,
`release/` and the `*.tsbuildinfo` files, runs lint and unit tests, builds the
standalone Windows `.exe` and macOS `.app` ZIP, checks `app.asar` in both packaged
apps, creates a draft release, uploads both artifacts, compares their uploaded
sizes against the local files and only then publishes. Use `--draft` to stop before
publishing, `--skip-checks` to skip lint and tests, and `--skip-build` to reuse both
artifacts already in `release/` (existing outputs are preserved in that mode).

Deleting `dist/` without deleting the `*.tsbuildinfo` files is what breaks a
manual build: `tsc` runs in composite mode, sees an up-to-date build info file and
emits nothing, so the installer ships without a main process. Use `npm run clean`
rather than `rm -rf dist`.

`scripts/verify-asar.mjs` resolves every relative import in `dist/main` and
`dist/preload` against the contents of the packed archive. It exists because
0.1.0 shipped without `dist/shared` and died at launch with
`ERR_MODULE_NOT_FOUND`; `tests/package-files.test.ts` guards the same mistake at
the source level, by checking the `build.files` globs against the imports.
