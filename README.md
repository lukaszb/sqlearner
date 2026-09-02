# SQLearner

SQLearner is an Electron desktop app for learning SQL with a local SQLite dataset.

## Development

```bash
npm install
npm run dev
```

`npm run dev` expects Vite on port `5173`. Stop any older dev server using that port before restarting.

## Kaggle Dataset

When a session is created, SQLearner downloads the complete public Olist dataset directly from Kaggle and imports all nine CSV files into SQLite. Python, `kagglehub`, and Kaggle API credentials are not required.

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

`npm run build:win` creates a Windows x64 installer. `npm run build:win:portable` creates a portable Windows x64 `.exe`. The Windows build runs from macOS through Electron Builder. Document any required signing, notarization, or Wine setup before release.
