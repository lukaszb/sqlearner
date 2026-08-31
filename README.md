# SQLearner

SQLearner is an Electron desktop app for learning SQL with a local SQLite dataset.

## Development

```bash
npm install
npm run dev
```

`npm run dev` expects Vite on port `5173`. Stop any older dev server using that port before restarting.

## Kaggle Dataset

SQLearner uses Python's `kagglehub` package to download the public Olist dataset without Kaggle API credentials:

```bash
npm run setup:kagglehub
```

If Python or `kagglehub` is unavailable, SQLearner creates a small starter SQLite database so the app can still be explored locally.

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

`npm run build:win` creates a Windows x64 installer. `npm run build:win:portable` creates a portable Windows x64 `.exe`. The Windows build runs from macOS through Electron Builder. Document any required signing, notarization, or Wine setup before release.
