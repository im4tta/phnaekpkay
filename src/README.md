# Phnaek Pkay source layout

The application remains deployable as a static page while its reusable code is
organized under `src/`:

- `components/` contains UI-bound modules and controls.
- `lib/` contains provider-independent image and workspace utilities.
- `styles/` is reserved for extracted design-system styles.
- `../assets/` contains the Phnaek Pkay brand mark, favicon, and SVG icon sprite.

The current legacy inline controller is intentionally kept working during the
incremental migration. New processing code should be added as modules here,
not appended to the page controller.
