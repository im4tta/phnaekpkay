# Phnaek Pkay source layout

- `main.js` is the application controller. It is being migrated into modules; new logic
  should go into `lib/` (pure, tested) or `components/` (DOM, tested with jsdom), not into
  `main.js`.
- `lib/` has small modules with unit tests in `tests/unit`. `lib/dom.js` is the only way
  the app creates DOM from data: **never assign `innerHTML`** (ESLint enforces it).
- `components/` renders UI pieces from state (photo picker, start screen).
- `styles/` is layered: `tokens.css` (design tokens, controls) → `layout.css` (shell, tab
  bar, menu, drawer, dock) → `components.css` → `stage.css` (photo views). Phone first;
  the desktop layout is the `min-width: 821px` block.
- `workers/` holds the AI upscale worker. onnxruntime-web is served from `/vendor/ort/`.
