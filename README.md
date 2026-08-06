# Phnaek Pkay (Satellite Eye)

A browser-first tool for building before/after satellite imagery
comparisons — grid, slider, density overlay, and animated sequence — with
live tile capture from several free/no-key providers, explainable change maps,
project files, research links, and PNG/WebM/report export.

It still runs directly from `index.html` with no backend. An optional Vite
workflow is included for local development and deployment.

## Features

- **Grid mode** — lay out any number of frames side by side (2/3/4 columns)
- **Slider mode** — classic before/after wipe comparison with a draggable divider
- **Overlay mode** — blend two frames with an adjustable density slider, plus
  an auto-pulse "blink comparator" mode (the astronomer's trick for spotting
  subtle differences between two images)
- **Sequence mode** — auto-playing timelapse through every uploaded frame,
  with crossfade and a scrubbable timeline
- **Change map mode** — explainable RGB, brightness, or vegetation-proxy
  difference maps with adjustable sensitivity, small-region cleanup, changed
  area, region count, and a review-oriented reliability indicator
- **Live satellite capture** — pan/zoom a live tile map (Esri World Imagery,
  NASA GIBS near-real-time layers, Google Satellite tiles, Mapbox Satellite,
  Sentinel Hub) and capture the current view as a frame, with a place-name
  search box
- **Drag-and-drop reordering** of frames in the sidebar (plus up/down buttons)
- **Synced pan/zoom** across all frames so comparisons stay aligned
- **PNG export** for grid/slider/overlay, and **WebM video export** for
  slider sweep, overlay blink, and sequence timelapse; change maps export as
  annotated PNGs
- **Light / dark theme** toggle (persists via `localStorage`)
- **Project save/load** — preserve imagery, ordering, labels, selected frames,
  comparison settings, and view state in a portable JSON file
- **Adaptive controls drawer** — the sidebar collapses on desktop, becomes an
  off-canvas drawer on mobile, and closes automatically after choosing a mode
- **HTML report export** — package frame metadata and the current change map
  into a shareable report
- Paste images directly from the clipboard (`Ctrl/Cmd+V`) — handy for
  pasting screenshots out of Google Earth Pro's historical imagery slider,
  which isn't otherwise accessible via any public API

## Usage

Just open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari).
There is nothing required to install.

For the optional development server:

```bash
npm install
npm run dev
```

## Image enhancement roadmap

The current Detail Boost uses local unsharp masking and bicubic resampling for
fast, private visual enhancement. It does not recover missing Sentinel-2
detail. The practical open-source AI path is an opt-in Real-ESRGAN model
converted to ONNX and run with ONNX Runtime WebGPU, with a WASM fallback.
SwinIR is a heavier alternative. Upscayl is a desktop Vulkan application and
is not directly embeddable in this static browser app.

AI enhancement should remain separate from change detection because generated
textures can create false changes. Originals remain the analytical source.

To develop with a local server (recommended, since some browsers restrict
`fetch`/clipboard APIs on `file://` origins):

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

### Live imagery providers

| Provider | Key needed | Dated imagery | Notes |
|---|---|---|---|
| Esri World Imagery | No | No (current mosaic) | Good default, reliable |
| NASA GIBS | No | **Yes** | Near-real-time VIIRS/MODIS monitoring layers; lower resolution |
| Google Satellite tiles | No | No (current mosaic) | Unofficial endpoint, subject to Google's terms, may fail CORS capture |
| Mapbox Satellite | Yes (free tier) | No (current mosaic) | Needs a Mapbox access token |
| Sentinel Hub | Yes (free tier) | **Yes** | The one to use for real before/after by capture date, ~10m resolution |

Google Earth's own historical-imagery timeline (the slider in the desktop
app) has no public API — see the note in the app's sidebar. For real dated
satellite history, use Sentinel Hub, or capture manually in Google Earth Pro
and paste the screenshot in with `Ctrl/Cmd+V`.

## Reference mapping

The four referenced repositories are research and tooling collections rather
than one installable application. Their practical ideas are implemented here
through temporal workflows, provider-aware tile capture, classical explainable
change analysis, cleaned change regions, and portable project/report artifacts.
Deep-learning training and large public datasets remain external workflows.

## License

MIT — see [LICENSE](LICENSE). Do whatever you like with it.
