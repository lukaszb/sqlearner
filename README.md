# SQLearner

SQLearner is an Electron desktop app for learning SQL with a local SQLite dataset.

## Development

```bash
npm install
npm run dev
```

`npm run dev` expects Vite on port `5173`. Stop any older dev server using that port before restarting.

## Kaggle Dataset

Set Kaggle API credentials before running setup if you want the full Olist dataset import:

```bash
export KAGGLE_USERNAME="your-kaggle-username"
export KAGGLE_KEY="your-kaggle-api-key"
```

Without credentials, SQLearner creates a small starter SQLite database so the app can still be explored locally.

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
```

The Windows build runs from macOS through Electron Builder. Document any required signing, notarization, or Wine setup before release.
