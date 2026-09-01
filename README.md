# Phnaek Pkay · Satellite Eye

A browser-based tool for satellite imagery comparison — no server, no account, no install. Open it and it immediately shows you a live before/after slider over Phnom Penh using Esri satellite imagery alongside a CARTO reference map, so the interface is self-explanatory from the first second.

Live at **[phnaekpkay.vercel.app](https://phnaekpkay.vercel.app)**

---

## What it does

The homepage opens in **Slider mode** with two demo frames of Phnom Penh already loaded — Esri World Imagery on the left, CARTO street reference on the right. Drag the divider to compare them. The inline map in the bottom-right corner shows the live Google satellite layer; pan and zoom it directly without opening the sidebar.

From there you can:

- Upload your own frames (drag and drop, file picker, or `Ctrl/Cmd+V` to paste from clipboard)
- Capture a fresh satellite tile from any provider (Esri, Bing, Esri Wayback, Planet NICFI, NASA GIBS, Google, Mapbox, Sentinel Hub) at the current map position — frames are **geotagged** with their center coordinates and zoom
- Measure distances and areas directly on the imagery, with live meter readouts from the frame geotag
- Switch modes, export (PNG, WebM, HTML report, GeoJSON/KML of change regions), undo/redo, and share a map-view link

---

## Modes

| Mode | What it does |
|---|---|
| **Slider** | Draggable before/after wipe. Drag the divider, or drag each frame independently to reposition it. Optional third-frame band. |
| **Grid** | Side-by-side layout in 2, 3, or 4 columns. Pan/zoom can be synced across all panels or unlinked per panel. |
| **Overlay** | Two frames blended with a density slider. Auto-pulse "blink comparator" for spotting subtle differences. |
| **Sequence** | Auto-playing timelapse through every frame, with crossfade and a scrubbable timeline. |
| **Change Map** | Pixel-level difference map (RGB, brightness, or vegetation proxy) with adjustable sensitivity, region filtering, and **one-click or manual alignment** of the two frames before differencing. |

---

## Live satellite capture

The sidebar's **Live satellite capture** section lets you navigate a tile map and capture the current view as a frame. The same map is also embedded directly in the Slider view — you never need to open the sidebar just to change location.

| Provider | Key required | Dated imagery |
|---|---|---|
| Esri World Imagery | No | No — current mosaic |
| Bing Maps aerial | No (unofficial) | No — current mosaic |
| Esri Wayback | No | Yes — dated archive 2014–present |
| Planet NICFI | Free key | Yes — dated 4.8 m monthly/quarterly |
| CARTO Voyager | No | No — reference map |
| NASA GIBS | No | Yes — VIIRS/MODIS near-real-time |
| Google Satellite | No (unofficial) | No — current mosaic |
| Mapbox Satellite | Free token | No — current mosaic |
| Sentinel Hub | Free config ID | Yes — dated 10 m Sentinel-2 |

For real before/after by date, use **Planet NICFI** (free key, ~4.8 m, monthly mosaics since 2020-09 — excellent for Cambodia), **Esri Wayback** (no key), or **Sentinel Hub** (free tier, ~10 m Sentinel-2). For a quick reference overlay, use Esri, Bing, or CARTO. For historical imagery from Google Earth Pro, paste screenshots with `Ctrl/Cmd+V`.

Each provider has a **Test connection** button, and the Wayback/NICFI pickers include **"last year"** quick-jump plus prev/next period buttons so you can compare the same season across years.

### Toolbox

- **Measure** — click to drop points, double-click or `Esc` to finish. Segment and total distances are shown in pixels and (for geotagged frames) meters, with an area readout for closed shapes. Measure overlays are baked into PNG exports.
- **Geotagged frames** — captures store center `lat/lng`/zoom; exports and the live map show a **scale bar** and print the frame's own coordinates instead of the current map position.
- **GIS export** — the Change Map can be exported as **GeoJSON** or **KML** polygons of each changed region (and annotation line strokes), georeferenced via the geotagged frames — ready for QGIS/Google Earth.
- **Undo/redo** — `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` (and toolbar buttons) revert frame, label, annotation, and notes changes.
- **Share** — copies a `#map=provider,lat,lng,zoom` link that reopens the live map at that position.
- **Keyboard** — `1`–`5` switch modes, `C` captures the view, `[` / `]` swap slider panels, arrows/`+`/`-`/`0` pan and zoom.

---

## Export

- **PNG** — grid layout, slider frame, overlay blend, or annotated change map
- **WebM video** — slider sweep, overlay blink, or sequence timelapse (native `MediaRecorder`, no external libraries)
- **HTML report** — frame metadata, notes, and change map packaged into a shareable standalone file
- **Project JSON** — full workspace save/restore including imagery, labels, settings, and view state

---

## Field sites

The **Locations** button opens a curated set of documented field sites from around the world — conflict zones, flood disasters, and affected villages. Clicking a site loads its before/after imagery directly into the slider (e.g. the 2026 Nepal flood at Rasuwagadhi on the China–Nepal border, alongside the original Cambodia–Thailand border villages).

---

## Development

No build step required — open `index.html` directly in any modern browser.

For the optional Vite dev server:

```bash
npm install
npm run dev
```

Or with Python:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Some browsers restrict `fetch` and clipboard APIs on `file://` origins, so a local server is recommended for the full feature set.

---

## AI enhancement

The **Enhance** button runs a local ONNX super-resolution model (Real-ESRGAN or SwinIR) entirely in the browser via ONNX Runtime WebAssembly. A hosted `RealESRGAN_x4plus.onnx` model is included. Generated detail is for visual review only — originals remain the analytical source, and enhanced frames are labelled clearly.

---

## License

MIT — see [LICENSE](LICENSE).
