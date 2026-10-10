/* Text helpers for frame labels and dates. */

const LABEL_PATTERNS = [
  /(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})/, // 2025-04-12
  /(\d{4})[-_.](\d{1,2})(?![\d])/, //        2025-04
  /(\d{4})(\d{2})(\d{2})/, //                20250412
  /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\D{0,3}(\d{4})/i,
  /(\d{4})/, //                              bare year
];

/** Guess a short date label from a file name, falling back to the first 40 characters. */
export function extractDateLabel(filename) {
  const base = String(filename).replace(/\.[^.]+$/, '');
  for (const pattern of LABEL_PATTERNS) {
    const match = base.match(pattern);
    if (match) return match[0].replace(/_/g, '-');
  }
  return base.slice(0, 40);
}

const PROVIDER_NAMES = { esri: 'Esri', google: 'Google', carto: 'CARTO', nasa: 'NASA', mapbox: 'Mapbox', sentinel: 'Sentinel-2' };

/**
 * Short, human label for a frame. Captures are named like
 * "google · latest · captured Aug 11, 2026, 10:22 AM"; show "Google · latest".
 * Anything else is trimmed to `max` characters.
 */
export function friendlyLabel(label, max = 28) {
  let text = String(label == null ? '' : label).trim();
  text = text.replace(/\s*·\s*captured .*$/i, '');
  text = text.replace(/^([a-z]+)(?=\s*·)/i, (name) => PROVIDER_NAMES[name.toLowerCase()] || name);
  if (text.length > max) text = text.slice(0, max - 1).trimEnd() + '…';
  return text || 'Frame';
}

export function formatTimestamp(value, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value));
}
