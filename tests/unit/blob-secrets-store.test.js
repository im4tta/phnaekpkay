import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { dataUrlToBlob } from '../../src/lib/blob.js';
import { saveSecrets, loadSecrets, scrubLegacySecrets } from '../../src/lib/secrets.js';
import { putRecord, getRecord, deleteRecord } from '../../src/lib/store.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
}

describe('blob helpers', () => {
  it('decodes a data URL into a typed Blob', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,' + btoa('hello world'));
    expect(blob.type).toBe('image/png');
    expect(await blob.text()).toBe('hello world');
  });
});

describe('secrets', () => {
  let session;
  beforeEach(() => { session = new MemoryStorage(); });

  it('stores and loads only the known fields, truncated', () => {
    saveSecrets({ mapboxToken: 'a'.repeat(999), sentinelId: 'id', placesApiKey: 'k', extra: 'x' }, session);
    const out = loadSecrets(session);
    expect(out.mapboxToken).toHaveLength(300);
    expect(Object.keys(out).sort()).toEqual(['mapboxToken', 'placesApiKey', 'sentinelId']);
  });

  it('returns null for missing or corrupt data', () => {
    expect(loadSecrets(session)).toBeNull();
    session.setItem('phnaek-pkay-session-keys', '{bad');
    expect(loadSecrets(session)).toBeNull();
  });

  it('scrubs keys that older versions saved in localStorage', () => {
    const local = new MemoryStorage();
    local.setItem('phnaek-pkay-preferences', JSON.stringify({ mode: 'grid', map: { lat: 1, mapboxToken: 'S', sentinelId: 'S', placesApiKey: 'S' } }));
    local.setItem('phnaek-pkay-workspace', '{corrupt');
    scrubLegacySecrets(local);
    const saved = JSON.parse(local.getItem('phnaek-pkay-preferences'));
    expect(saved).toEqual({ mode: 'grid', map: { lat: 1 } });
  });
});

describe('IndexedDB store', () => {
  it('stores Blobs and plain state and deletes records', async () => {
    const blob = new Blob(['pixels'], { type: 'image/png' });
    await putRecord('blobs', { byId: { 1: blob } });
    await putRecord('state', { state: { mode: 'grid' }, frames: [{ id: 1 }] });
    const blobs = await getRecord('blobs');
    expect(await blobs.byId[1].text()).toBe('pixels');
    expect((await getRecord('state')).state.mode).toBe('grid');
    await deleteRecord('state');
    expect(await getRecord('state')).toBeUndefined();
  });
});
