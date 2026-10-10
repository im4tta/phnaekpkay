/* Project file validation.
   Imported project JSON is untrusted input (it can come from a link, an email
   attachment or a shared drive). Everything is validated and normalised here, and
   only whitelisted fields ever reach application state. */

export const LIMITS = Object.freeze({
  maxFileBytes: 250 * 1024 * 1024,
  maxImages: 60,
  maxImageChars: 80 * 1024 * 1024,
  maxLabel: 200,
  maxDate: 60,
  maxCaption: 500,
  maxNotes: 20000,
});

export const PROVIDERS = Object.freeze(['esri', 'carto', 'nasa', 'google', 'mapbox', 'sentinel']);
export const NASA_LAYERS = Object.freeze([
  'VIIRS_SNPP_CorrectedReflectance_TrueColor',
  'MODIS_Terra_CorrectedReflectance_TrueColor',
  'MODIS_Aqua_CorrectedReflectance_TrueColor',
]);
export const MODES = Object.freeze(['grid', 'slider', 'overlay', 'sequence', 'change']);
export const CHANGE_METHODS = Object.freeze(['rgb', 'luma', 'ndvi']);

/** Raster data URLs only. SVG is deliberately excluded: imagery is raster. */
const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpeg|webp|gif|avif|bmp);base64,[A-Za-z0-9+/]+=*$/;
/** Same-origin bundled field-site images. */
const SITE_IMAGE = /^\/assets\/sites\/[a-z0-9-]+\/[a-z0-9_.-]+\.(?:webp|jpg|png)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LAYER_NAME = /^[A-Za-z0-9_.\- ]{1,64}$/;

export function isSafeImageSrc(value, { allowSiteUrls = false } = {}) {
  if (typeof value !== 'string') return false;
  if (allowSiteUrls && SITE_IMAGE.test(value)) return true;
  return value.length < LIMITS.maxImageChars && SAFE_DATA_IMAGE.test(value);
}

export function cleanText(value, max = 200) {
  return String(value == null ? '' : value).slice(0, max);
}

function num(value, min, max, fallback) {
  const usable = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
  const n = usable ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function int(value, min, max, fallback) {
  return Math.round(num(value, min, max, fallback));
}

function id(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 1e9 ? n : null;
}

function isoOrNull(value) {
  if (typeof value !== 'string' || value.length > 40) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function panelView(raw) {
  const v = raw && typeof raw === 'object' ? raw : {};
  return { zoom: num(v.zoom, 1, 4, 1), x: num(v.x, -1e5, 1e5, 0), y: num(v.y, -1e5, 1e5, 0) };
}

export function defaultSliderState() {
  return { leftId: null, middleId: null, rightId: null, clip: 50, clip2: 75, three: false, leftView: panelView(), rightView: panelView(), thirdView: panelView() };
}
export function defaultOverlayState() {
  return { baseId: null, topId: null, thirdId: null, density: 50, thirdDensity: 55 };
}
export function defaultChangeState() {
  return { beforeId: null, afterId: null, method: 'rgb', threshold: 30, minSize: 12 };
}

function sliderState(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    leftId: id(s.leftId), middleId: id(s.middleId), rightId: id(s.rightId),
    clip: num(s.clip, 0.5, 99.5, 50), clip2: num(s.clip2, 0.5, 99.5, 75), three: s.three === true,
    leftView: panelView(s.leftView), rightView: panelView(s.rightView), thirdView: panelView(s.thirdView),
  };
}
function overlayState(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return { baseId: id(s.baseId), topId: id(s.topId), thirdId: id(s.thirdId), density: num(s.density, 0, 100, 50), thirdDensity: num(s.thirdDensity, 0, 100, 55) };
}
function changeState(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    beforeId: id(s.beforeId), afterId: id(s.afterId),
    method: CHANGE_METHODS.includes(s.method) ? s.method : 'rgb',
    threshold: int(s.threshold, 5, 90, 30), minSize: int(s.minSize, 1, 80, 12),
  };
}

function mapState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    provider: PROVIDERS.includes(raw.provider) ? raw.provider : null,
    lat: num(raw.lat, -85, 85, null), lng: num(raw.lng, -180, 180, null), zoom: num(raw.zoom, 2, 22, null),
    sentinelLayer: typeof raw.sentinelLayer === 'string' && LAYER_NAME.test(raw.sentinelLayer) ? raw.sentinelLayer : 'TRUE_COLOR',
    sentinelDate: typeof raw.sentinelDate === 'string' && ISO_DATE.test(raw.sentinelDate) ? raw.sentinelDate : '',
    sentinelCloud: int(raw.sentinelCloud, 0, 100, 20), sentinelSharpness: int(raw.sentinelSharpness, 0, 80, 35),
    nasaLayer: NASA_LAYERS.includes(raw.nasaLayer) ? raw.nasaLayer : null,
    nasaDate: typeof raw.nasaDate === 'string' && ISO_DATE.test(raw.nasaDate) ? raw.nasaDate : null,
  };
}

/**
 * Validate and normalise a parsed project. Throws Error('invalid project') when the
 * value is not a project at all; individually bad images are dropped, not fatal.
 * `trusted` marks the bundled field-site files, whose images are same-origin URLs.
 */
export function sanitizeProject(raw, { trusted = false } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid project');
  const preferenceOnly = raw.preferenceOnly === true;
  if (!Array.isArray(raw.images) && !preferenceOnly) throw new Error('invalid project');

  const seen = new Set();
  const images = [];
  for (const saved of Array.isArray(raw.images) ? raw.images : []) {
    if (images.length >= LIMITS.maxImages) break;
    if (!saved || typeof saved !== 'object' || !isSafeImageSrc(saved.src, { allowSiteUrls: trusted })) continue;
    let imageId = id(saved.id);
    if (imageId === null || seen.has(imageId)) imageId = null; // reassigned by the caller
    if (imageId !== null) seen.add(imageId);
    images.push({
      id: imageId,
      src: saved.src,
      label: cleanText(saved.label, LIMITS.maxLabel) || 'frame',
      imageryDate: cleanText(saved.imageryDate, LIMITS.maxDate),
      capturedAt: isoOrNull(saved.capturedAt),
      generated: saved.generated === true,
      selected: saved.selected !== false,
    });
  }

  return {
    preferenceOnly,
    mode: MODES.includes(raw.mode) ? raw.mode : 'slider',
    cols: int(raw.cols, 1, 4, 2),
    view: { zoom: num(raw.view && raw.view.zoom, 1, 4, 1), panx: num(raw.view && raw.view.panx, -1e5, 1e5, 0), pany: num(raw.view && raw.view.pany, -1e5, 1e5, 0) },
    caption: cleanText(raw.caption, LIMITS.maxCaption),
    notes: cleanText(raw.notes, LIMITS.maxNotes),
    includeNotesExport: raw.includeNotesExport === true,
    annotation: isSafeImageSrc(raw.annotation) ? raw.annotation : null,
    map: mapState(raw.map),
    images,
    sliderState: sliderState(raw.sliderState),
    overlayState: overlayState(raw.overlayState),
    changeState: changeState(raw.changeState),
  };
}

/** Parse project JSON text with a size limit. */
export function parseProjectText(text, options) {
  if (typeof text !== 'string' || text.length > LIMITS.maxFileBytes) throw new Error('project too large');
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('invalid project');
  }
  return sanitizeProject(raw, options);
}
