# Security

## Reporting a problem

Please open a private security advisory on GitHub (Security → Report a vulnerability) rather than a public issue.

## How the app protects users

| Area | What is enforced |
|---|---|
| Scripts | Content-Security-Policy (`vercel.json`) allows only same-origin scripts (`script-src 'self'`); there is no inline script and no third-party script or font origin. |
| Markup injection | The app never assigns `innerHTML`; DOM is built with `h()` / `textContent` (`src/lib/dom.js`). An ESLint rule fails the build if `innerHTML`, `outerHTML` or `insertAdjacentHTML` is used. |
| Trusted Types | The CSP also says `require-trusted-types-for 'script'; trusted-types default`, so the browser refuses to turn any string into script (innerHTML, `script.src`, `new Worker(string)`, …). The one `default` policy (`src/lib/trusted-types.js`, copied at the top of the worker) approves same-origin script URLs only. Browsers without Trusted Types ignore the directive. |
| Imported projects | Treated as untrusted. `src/lib/project.js` validates every field (types, ranges, size and image-count limits, raster data URLs only, no SVG, whitelisted providers/layers). Property-style fuzz tests (`tests/unit/fuzz.test.js`) hammer the importer, data-URL checks, `dataUrlToBlob` and the share-link parser with mutated input. |
| API keys | Mapbox token, Sentinel instance ID and Google Places key are kept in `sessionStorage` for the tab only. They are never written to localStorage, IndexedDB, project files or exports (tests assert this). |
| Network | `connect-src` and `img-src` list only the imagery/geocoding hosts the app uses. Hosted AI models must be same-origin. |
| Headers | HSTS, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, COOP, and `Cross-Origin-Resource-Policy: same-origin` on scripts, WASM, models and bundled site data. Cross-origin isolation (COEP) is deliberately **not** enabled: it would block the satellite tiles. |
| Service worker | Only same-origin GETs are cached; imagery tiles and geocoding never are. A tab that is still running an old version is told “Update ready · Reload” as soon as a new worker takes over, so fixes reach people quickly. |
| CI | Lint, unit tests, end-to-end tests under the production headers (the local test server applies every rule in `vercel.json` to every path, as Vercel does), `npm audit`, a gitleaks scan of new commits and CodeQL (`security-extended`). Dependencies are installed with `npm ci --ignore-scripts`. |

## Keys that were committed in the past

Earlier versions of this repository shipped a Sentinel Hub instance ID and a Google API key inside bundled project files. They were removed from the working tree, **but they remain in git history**.

- Treat them as compromised: **rotate them** (Copernicus Data Space dashboard, Google Cloud Console).
- Restrict browser keys by HTTP referrer (Google) and to the services you use.
- Optional: purge them from history with `git filter-repo --replace-text` and force-push, then ask collaborators to re-clone.

## Known limits

- API keys typed into the app are visible to scripts running on the same origin; the CSP keeps that to this app's own code.
- GitHub Actions are referenced by version tag, not commit SHA (Dependabot keeps them current). Pinning to SHAs is a worthwhile follow-up for someone with network access to look the SHAs up.
- Imagery tiles are fetched directly from third-party providers, which therefore see the viewer's IP address.
