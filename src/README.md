# Phnaek Pkay source layout

```
main.js           entry point: imports every feature module (they wire up their own
                  listeners), then starts the app
app/els.js        every DOM element the app uses, looked up once and typed from index.html
app/state.js      shared state; change it only through the assign…() functions
features/         one file per piece of behaviour (see below)
lib/              pure or DOM-light modules with unit tests (tests/unit)
components/       small renderers from data (photo picker, start screen), tested with jsdom
workers/          background workers (AI upscale; onnxruntime-web is served from /vendor/ort/)
styles/           tokens.css → layout.css → components.css → stage.css (phone first)
```

## Features

| File | Responsibility |
|---|---|
| `frames` | turn files, blobs and URLs into frames; drop / pick / paste photos |
| `image-list`, `picker`, `modes` | the Frames list, the Before/After picker and dock, switching views |
| `stage` | render whatever the current view shows |
| `slider`, `overlay`, `grid`, `sequence`, `changes`, `view` | the five views and shared zoom / pan |
| `live-map`, `slider-map`, `capture` | the satellite map in the drawer, the map overlay in Compare, capturing a view into frames |
| `export`, `video` | image / report / video export |
| `project`, `sites` | save, restore and autosave; bundled field sites and share links |
| `menu`, `fullscreen`, `theme`, `shell`, `start`, `annotation`, `upscale` | chrome and the remaining tools |

## Rules

- **Never assign `innerHTML`.** `lib/dom.js` (`h()`, `setChildren()`) is the only way the app builds DOM from
  data; ESLint fails the build otherwise, and the CSP enforces Trusted Types in the browser.
- New logic goes into `lib/` (pure, unit-tested) or a `features/` file, never back into one big file.
- Feature files import each other freely today (it grew from one closure), so there are cycles. They are
  safe because nothing runs at import time except wiring listeners, and `main.js` starts the app last.
  Do not call another feature's function (or read one of its `const`s) at the top level of a module.
- Shared state lives in `app/state.js`. Read the exported bindings directly; write through `assignX()`.
- Types: `tsconfig.json` runs `tsc` over `src/` (`npm run typecheck`). It is deliberately lenient
  (`strict: false`); new code should add JSDoc types where they help.
