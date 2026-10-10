# Styles

Load order (see `index.html`): `fonts.css` → `tokens.css` → `layout.css` → `components.css` → `stage.css`.

- Colours, radii and fonts are CSS variables in `tokens.css`; the light theme overrides them under `[data-theme='light']`.
- Labels and controls that sit on top of imagery use `--stage-glass`, which stays dark in both themes.
- Keep touch targets at `--tap` (44 px) and text at 12 px or larger; the mobile e2e test fails otherwise.
