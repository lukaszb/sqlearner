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

The `Changing data` module runs against `practice.sqlite`, a writable copy of the session database created on demand.
The imported Olist database stays read-only and `Reset sandbox` restores the copy.

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
npm run build:win
npm run build:win:portable
```

`npm run build:win` creates a Windows x64 installer in `release/`. `npm run build:win:portable` creates a portable Windows x64 `.exe` in the same directory. The Windows build runs from macOS through Electron Builder. Document any required signing, notarization, or Wine setup before release.

Windows packaging uses the prebuilt `better-sqlite3` binary included by the dependency. Electron Builder's native dependency rebuild is disabled because `node-gyp` cannot cross-compile a Windows x64 addon on a macOS ARM host.
