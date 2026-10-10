# Phnaek Pkay · Satellite Eye

A browser-based tool for satellite imagery comparison — no server, no account, no install. Your photos and keys stay on your device.

Live at **[phnaekpkay.vercel.app](https://phnaekpkay.vercel.app)**

---

## What it does

Open it and you get a friendly start screen: **add photos**, **capture from the map**, open one of the bundled **field sites**, or **continue** your last project (autosaved on your device). Pick two photos by tapping their thumbnails and drag the divider to compare.

- Add your own photos (choose, drag and drop, paste from the clipboard, or `Ctrl/Cmd+V`)
- Capture a satellite view from any provider (Esri, NASA GIBS, Google, Mapbox, Sentinel Hub) at the current map position
- Switch views, save an image, or share it with your phone's share sheet
- English and Khmer interface (the Khmer text is a first draft and needs native review)

---

## Views

| View | What it does |
|---|---|
| **All** | Side-by-side grid in 2, 3 or 4 columns (1–2 on phones). |
| **Compare** | Draggable before/after divider (keyboard accessible). Drag or pinch each photo independently. Optional third photo. |
| **Blend** | Two photos blended with one slider; "Blink" auto-pulses for spotting subtle differences. |
| **Play** | Timelapse through every photo with smooth fades and a tappable timeline. |
| **Changes** | Highlights likely change and says how much of the area changed. One sensitivity slider, compare by colour, brightness or vegetation. |

---

## Live satellite capture

The sidebar's **Live satellite capture** section lets you navigate a tile map and capture the current view as a frame. The same map is also embedded directly in the Slider view — you never need to open the sidebar just to change location.

| Provider | Key required | Dated imagery |
|---|---|---|
| Esri World Imagery | No | No — current mosaic |
| CARTO Voyager | No | No — reference map |
| NASA GIBS | No | Yes — VIIRS/MODIS near-real-time |
| Google Satellite | No (unofficial) | No — current mosaic |
| Mapbox Satellite | Free token | No — current mosaic |
| Sentinel Hub | Free config ID | Yes — dated 10 m Sentinel-2 |

For real before/after by date, use **Sentinel Hub** (free tier, ~10 m resolution). For a quick reference overlay, use Esri or CARTO. For historical imagery from Google Earth Pro, paste screenshots with `Ctrl/Cmd+V`.

---

## Export

- **Image (PNG)** at the on-screen framing, shared through the native share sheet when available
- **Video (WebM)**: compare sweep, blend blink, or play timelapse (native `MediaRecorder`)
- **HTML report** with frame metadata, notes and the change map
- **Project file (JSON)** with photos, labels, settings and view state. API keys are never included.

---

## Field sites

The **Field sites** carousel (and menu entry) opens documented villages along the Cambodia–Thailand border. Each site is a small `project.json` plus WebP frames under `public/assets/sites/<slug>/` (about 0.9 MB per site; the old 10 MB base64 JSON files were converted with `tools/convert-sites.py`). Share links look like `/p/<lat>,<lng>`.

---

## Development

```bash
npm install
npm run dev          # Vite dev server
npm run lint         # ESLint (also forbids innerHTML)
npm test             # unit tests (Vitest)
npm run build        # production build to dist/
npm run test:e2e     # build, then Playwright on phone + desktop profiles
npm run serve:dist   # serve dist/ with the headers from vercel.json
```

End-to-end tests run against `tools/serve-dist.mjs`, which applies the same headers and rewrites as `vercel.json`, so the enforced Content-Security-Policy is exercised. Locally, point Playwright at a browser with `PW_CHROMIUM_PATH=/path/to/chrome`; in CI run `npx playwright install --with-deps chromium` first.

### Layout

```
index.html            markup only (no inline script)
src/main.js           app controller (being split into modules)
src/lib/              tested, DOM-light modules: dom, geo, format, project (validation),
                      change-detect, blob, secrets, store (IndexedDB), i18n, toast, share, install-help
src/components/       picker, start screen pieces
src/styles/           tokens → layout → components → stage
src/workers/          AI upscale worker (onnxruntime-web, self-hosted)
public/               static files: icons, splash images, field sites, sw.js, manifest
tools/                icon + splash generator, site converter, dist server
tests/                unit (Vitest) and e2e (Playwright)
```

### Icons and the iPhone Home Screen

iOS reads `<link rel="apple-touch-icon">` (not the manifest) and needs an opaque, square PNG. `tools/make-icons.mjs` generates the whole set (120/152/167/180 px, root `/apple-touch-icon.png`, maskable/any PWA icons, `favicon.ico`, 12 launch screens) from one design; run `python3 -I tools/optimize-splash.py` afterwards. If the icon is still blank after deploying:

1. Make sure **Vercel → Settings → Deployment Protection** does not cover your production domain (icon requests must not receive a login page). Preview URLs may be protected; production should not be.
2. iOS caches the icon: **delete the Home Screen app and add it again**.

---

## AI enhancement

**Enhance** runs a local ONNX super-resolution model (Real-ESRGAN or SwinIR) in the browser through ONNX Runtime WebAssembly, self-hosted under `/vendor/ort/` and only started when you load a model. Generated detail is for visual review only; originals remain the analytical source and enhanced photos are labelled.

`public/models/RealESRGAN_x4plus.onnx` is stored with **Git LFS**. For the hosted model to work on Vercel, enable *Settings → Git → Git Large File Storage (LFS)*; otherwise the file served is a tiny pointer and loading fails (use the file picker instead).

---

## Security

See [SECURITY.md](SECURITY.md) for the model and for the keys that remain in git history and must be rotated.

---

## License

MIT — see [LICENSE](LICENSE).
