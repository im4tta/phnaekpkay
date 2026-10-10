# Tools

| File | Purpose |
|---|---|
| `make-icons.mjs` | Generates every icon and iOS splash image from one design (needs a Chromium: `PW_CHROMIUM_PATH`). |
| `optimize-splash.py` | Quantises the splash PNGs to ~200 KB each (Pillow). |
| `convert-sites.py` | One-off conversion of the legacy 10 MB project JSON files into WebP + small `project.json` files. The legacy JSON is in git history before the "Modularize" commit. |
| `serve-dist.mjs` | Serves `dist/` with the headers and rewrites from `vercel.json` (used by the e2e tests). |
