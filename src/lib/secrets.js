/* API keys and tokens.
   They are never written to localStorage, IndexedDB, project files or exports.
   They live in sessionStorage so a reload keeps them, and they disappear when the
   tab is closed. */

const STORE = 'phnaek-pkay-session-keys';
const FIELDS = ['mapboxToken', 'sentinelId', 'placesApiKey'];
const MAX_LENGTH = 300;

export function saveSecrets(values, storage = globalThis.sessionStorage) {
  try {
    const clean = {};
    for (const key of FIELDS) clean[key] = String(values[key] || '').slice(0, MAX_LENGTH);
    storage.setItem(STORE, JSON.stringify(clean));
  } catch { /* storage may be unavailable (private mode) */ }
}

export function loadSecrets(storage = globalThis.sessionStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORE) || 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const out = {};
    for (const key of FIELDS) out[key] = String(parsed[key] || '').slice(0, MAX_LENGTH);
    return out;
  } catch {
    return null;
  }
}

/** Remove keys that older versions persisted into localStorage preference blobs. */
export function scrubLegacySecrets(storage = globalThis.localStorage) {
  for (const key of ['phnaek-pkay-preferences', 'phnaek-pkay-workspace']) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const value = JSON.parse(raw);
      if (value && value.map && typeof value.map === 'object' && FIELDS.some((f) => f in value.map)) {
        for (const f of FIELDS) delete value.map[f];
        storage.setItem(key, JSON.stringify(value));
      }
    } catch { /* ignore corrupt entries */ }
  }
}
