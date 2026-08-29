# Repository Guidelines

## Project Structure

SQLearner is an Electron app for macOS and Windows teaching SQL with Kaggle's `olistbr/brazilian-ecommerce` dataset. Use this layout:

- `src/main/` for main-process code, filesystem access, downloads, SQLite setup, and shell actions.
- `src/renderer/` for the Vue UI, table browser, query tabs, and progress states.
- `src/shared/` for types, constants, and IPC contracts.
- `tests/` for tests that mirror source structure.
- `assets/` for icons, static assets, and resources.
- `docs/` for product notes and architecture decisions.

Do not commit generated databases, downloaded Kaggle data, session folders, build output, or credentials.

## Build, Test, and Development Commands

No package manifest exists yet. When adding the Electron + Vue scaffold, keep these commands:

- `npm install` installs dependencies.
- `npm run dev` starts Electron locally.
- `npm test` runs automated tests.
- `npm run lint` runs format and lint checks.
- `npm run build:mac` builds macOS.
- `npm run build:win` builds Windows from macOS.

Document signing, notarization, Wine, and cross-builds.

## Product & Architecture Notes

On first launch, explain that SQLearner must prepare a dataset. `Setup my database` downloads Kaggle data, creates a session SQLite database in the OS-specific app data location, and shows progress.

On later launches, show sessions sorted by most recently used. Support opening folders in Finder or Explorer and deleting sessions.

The sidebar has `Database` and `Queries`. `Database` displays tables and previews. `Queries` uses browser-like tabs where users write SQL, run it, and inspect results.

## Coding Style & Naming Conventions

Use TypeScript with Vue, Pinia, and Tailwind for renderer work unless Electron compatibility forces a change. Prefer 2-space indentation, `PascalCase` for Vue components, `camelCase` for variables/functions, and `kebab-case`.

Keep IPC channel names explicit, for example `sessions:list`, `database:prepare`, and `query:run`. Long operations must report progress.

Use Pinia for sessions, selected table, query tabs, and progress. Keep Tailwind classes readable; extract repeated patterns into Vue components.

## Testing Guidelines

Cover session discovery, dataset preparation, SQLite import, query execution, and IPC validation. Use small fixtures. Name tests by behavior, for example `database-prepare.test.ts`.

For UI work, cover onboarding, progress bars, session ordering, Database browsing, and query tabs.

## Commit & PR Guidelines

No Git history is available, so use short imperative commit subjects such as `Add session manager`.

PRs should include a summary, test results, linked issues, and screenshots or recordings for UI changes. Call out macOS versus Windows paths and packaging changes.
