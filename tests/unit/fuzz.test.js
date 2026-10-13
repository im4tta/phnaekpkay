/* Property-style fuzzing of everything that parses untrusted input: imported project files,
   data URLs and share links. A seeded generator keeps failures reproducible. */
import { describe, it, expect } from 'vitest';
import { sanitizeProject, parseProjectText, isSafeImageSrc, LIMITS, PROVIDERS, MODES, CHANGE_METHODS } from '../../src/lib/project.js';
import { dataUrlToBlob } from '../../src/lib/blob.js';
import { parseSlug } from '../../src/lib/slug.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NASTY_STRINGS = [
  '', ' ', '0', '-1', '1e999', 'NaN', 'Infinity', '__proto__', 'constructor', 'prototype', 'toString', '"><img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>', 'javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zy8+',
  'https://evil.example/x.png', '//evil.example/a.png', '\u0000', '\n', 'x'.repeat(5000), '‮', '😀'.repeat(300),
  'data:image/png;base64,iVBORw0KGgo=', '/assets/sites/an-ses/frame-1.webp', '/assets/sites/../../etc/passwd',
];
const NASTY_NUMBERS = [0, -0, 1, -1, 0.5, 1e9, -1e9, 1e308, -1e308, Number.MAX_SAFE_INTEGER, Number.MIN_VALUE, NaN, Infinity, -Infinity];
const KEYS = ['images', 'src', 'id', 'label', 'selected', 'mode', 'cols', 'view', 'zoom', 'panx', 'pany', 'caption', 'notes', 'map', 'provider', 'lat', 'lng',
  'sliderState', 'leftId', 'clip', 'overlayState', 'changeState', 'method', 'threshold', 'minSize', 'annotation', 'preferenceOnly', '__proto__', 'constructor', 'polluted'];

function randomValue(r, depth = 0) {
  const k = r();
  if (k < 0.22) return NASTY_STRINGS[Math.floor(r() * NASTY_STRINGS.length)];
  if (k < 0.42) return NASTY_NUMBERS[Math.floor(r() * NASTY_NUMBERS.length)];
  if (k < 0.5) return r() < 0.5;
  if (k < 0.56) return null;
  if (depth > 3) return r();
  if (k < 0.74) return Array.from({ length: Math.floor(r() * 5) }, () => randomValue(r, depth + 1));
  return randomObject(r, depth + 1);
}
function randomObject(r, depth = 0) {
  const o = {};
  for (let i = 0, n = Math.floor(r() * 7); i < n; i++) {
    const key = KEYS[Math.floor(r() * KEYS.length)];
    Object.defineProperty(o, key, { value: randomValue(r, depth), enumerable: true, writable: true, configurable: true }); // also creates an own "__proto__"
  }
  return o;
}

const SAFE_SRC = /^(?:data:image\/(?:png|jpeg|webp|gif|avif|bmp);base64,[A-Za-z0-9+/]+=*|\/assets\/sites\/[a-z0-9-]+\/[a-z0-9_.-]+\.(?:webp|jpg|png))$/;
const between = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;

function assertSane(p) {
  expect(Object.keys(p).sort()).toEqual(['annotation', 'caption', 'changeState', 'cols', 'images', 'includeNotesExport', 'map', 'mode', 'notes', 'overlayState', 'preferenceOnly', 'sliderState', 'view'].sort());
  expect(MODES).toContain(p.mode);
  expect(between(p.cols, 1, 4)).toBe(true);
  expect(between(p.view.zoom, 1, 4) && between(p.view.panx, -1e5, 1e5) && between(p.view.pany, -1e5, 1e5)).toBe(true);
  expect(typeof p.caption).toBe('string'); expect(p.caption.length).toBeLessThanOrEqual(LIMITS.maxCaption);
  expect(typeof p.notes).toBe('string'); expect(p.notes.length).toBeLessThanOrEqual(LIMITS.maxNotes);
  expect(p.images.length).toBeLessThanOrEqual(LIMITS.maxImages);
  const ids = new Set();
  for (const im of p.images) {
    expect(im.src).toMatch(/^data:image\//); // untrusted mode: no site URLs
    expect(isSafeImageSrc(im.src)).toBe(true);
    expect(im.id === null || (Number.isInteger(im.id) && im.id > 0)).toBe(true);
    if (im.id !== null) { expect(ids.has(im.id)).toBe(false); ids.add(im.id); }
    expect(im.label.length).toBeLessThanOrEqual(LIMITS.maxLabel);
    expect(im.imageryDate.length).toBeLessThanOrEqual(LIMITS.maxDate);
  }
  if (p.annotation !== null) expect(isSafeImageSrc(p.annotation)).toBe(true);
  expect(between(p.sliderState.clip, 0.5, 99.5) && between(p.sliderState.clip2, 0.5, 99.5)).toBe(true);
  for (const v of [p.sliderState.leftView, p.sliderState.rightView, p.sliderState.thirdView]) expect(between(v.zoom, 1, 4)).toBe(true);
  expect(between(p.overlayState.density, 0, 100) && between(p.overlayState.thirdDensity, 0, 100)).toBe(true);
  expect(CHANGE_METHODS).toContain(p.changeState.method);
  expect(between(p.changeState.threshold, 5, 90) && between(p.changeState.minSize, 1, 80)).toBe(true);
  if (p.map) {
    expect(p.map.provider === null || PROVIDERS.includes(p.map.provider)).toBe(true);
    for (const [k, min, max] of [['lat', -85, 85], ['lng', -180, 180], ['zoom', 2, 22]]) expect(p.map[k] === null || between(p.map[k], min, max), k).toBe(true);
  }
}

describe('fuzz: sanitizeProject', () => {
  it('never throws anything but "invalid project", and always returns a sane project otherwise', () => {
    const r = rng(1234);
    let accepted = 0;
    for (let i = 0; i < 4000; i++) {
      const raw = randomObject(r);
      if (r() < 0.5) Object.defineProperty(raw, 'images', { value: Array.from({ length: Math.floor(r() * 6) }, () => randomObject(r, 2)), enumerable: true, writable: true, configurable: true });
      let result;
      try { result = sanitizeProject(raw); } catch (e) { expect(e.message).toBe('invalid project'); continue; }
      accepted++;
      assertSane(result);
    }
    expect(accepted).toBeGreaterThan(500); // the generator really exercises the accepting path
    expect(({}).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
  });

  it('does not let a project file pollute prototypes through JSON.parse', () => {
    const text = '{"images":[],"__proto__":{"polluted":true},"sliderState":{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}}';
    parseProjectText(text);
    expect(({}).polluted).toBeUndefined();
  });
});

describe('fuzz: parseProjectText on mutated files', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const base = JSON.stringify({ version: 1, mode: 'slider', images: [{ id: 1, src: PNG, label: 'a' }, { id: 2, src: PNG, label: 'b' }], map: { provider: 'esri', lat: 1, lng: 2, zoom: 5 }, sliderState: { leftId: 1, rightId: 2, clip: 40 } });

  it('rejects or sanitises every mutation, never crashes', () => {
    const r = rng(99);
    const junk = ['"', '\\', '{', '}', '[', ']', ',', ':', 'null', '1e999', '\u0000', '<script>', '__proto__'];
    for (let i = 0; i < 3000; i++) {
      let text = base;
      for (let m = 0, n = 1 + Math.floor(r() * 4); m < n; m++) {
        const at = Math.floor(r() * text.length), op = r();
        if (op < 0.4) text = text.slice(0, at) + junk[Math.floor(r() * junk.length)] + text.slice(at + 1);
        else if (op < 0.7) text = text.slice(0, at) + text.slice(at + 1 + Math.floor(r() * 8));
        else if (op < 0.85) text = text.slice(0, at);
        else text = text.slice(0, at) + text.slice(Math.floor(r() * text.length));
      }
      try { assertSane(parseProjectText(text)); } catch (e) { if (!/^(invalid project|project too large)$/.test(e.message)) throw e; }
    }
  });

  it('refuses oversized files before parsing', () => {
    expect(() => parseProjectText('x'.repeat(LIMITS.maxFileBytes + 1))).toThrow('project too large');
    expect(() => parseProjectText(42)).toThrow('project too large');
  });
});

describe('fuzz: isSafeImageSrc', () => {
  // Near-miss generator: start from a plausible source and damage it in one or two places,
  // so the interesting boundary cases (SVG, odd MIME parameters, injected quotes) are hit often.
  const MIMES = ['png', 'jpeg', 'webp', 'gif', 'avif', 'bmp', 'svg+xml', 'svg', 'x-icon', 'tiff', 'png;charset=utf-8', 'png;foo=bar', 'PNG', 'html', 'jpeg ', '*'];
  const PREFIX = ['data:image/', 'data:', 'DATA:image/', 'data:text/', 'data:application/', 'image/', ' data:image/', 'blob:https://x/', 'http://x/', '//x/', '/assets/sites/an-ses/', '/assets/sites/', '/assets/sites/../', '/assets/sites//x/'];
  const ENC = [';base64,', ';BASE64,', ';base64;', ',', ';utf8,', ';base64, ', ';base64,\n', ';base64,%'];
  const PAYLOAD = ['AAAA', 'AA==', 'A', '', 'AAA=', 'AA=A', 'AAAA\n', 'AAAA"', "AAAA'", 'AAAA<', 'AAAA)', 'A A', 'AAAA\\', '🙂', '%41', '<svg onload=alert(1)>', 'frame-1.webp', 'frame-1.svg', 'x.webp?x', 'x.webp#', 'x.WEBP', '../x.webp'];
  const DAMAGE = ['"', "'", '<', '>', '(', ')', ' ', '\n', '\t', '\u0000', '..', '\\', ';', '&'];
  const VALID = ['data:image/png;base64,iVBORw0KGgo=', 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', 'data:image/webp;base64,UklGRg==', '/assets/sites/an-ses/frame-1.webp', '/assets/sites/boeng-trakoun/thumb.webp', '/assets/sites/x/a_b-c.9.jpg'];
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  it('only ever approves plain raster data URLs and bundled site images', () => {
    const r = rng(7);
    let approved = 0;
    for (let i = 0; i < 60000; i++) {
      let s = r() < 0.5
        ? pick(r, VALID)
        : pick(r, PREFIX) + (r() < 0.7 ? pick(r, MIMES) + pick(r, ENC) : '') + pick(r, PAYLOAD) + (r() < 0.3 ? pick(r, PAYLOAD) : '');
      if (r() < 0.4) { const at = Math.floor(r() * (s.length + 1)); s = s.slice(0, at) + pick(r, DAMAGE) + s.slice(at); }
      for (const opts of [{}, { allowSiteUrls: true }]) {
        if (!isSafeImageSrc(s, opts)) continue;
        approved++;
        expect(s, JSON.stringify(s)).toMatch(SAFE_SRC);
        expect(/["'<>()\s\\]/.test(s), JSON.stringify(s)).toBe(false);
        expect(s.split('/').some((segment) => segment === '.' || segment === '..'), JSON.stringify(s)).toBe(false); // no path traversal
        if (s.startsWith('data:')) expect(/svg|html/i.test(s.split(',')[0]), JSON.stringify(s)).toBe(false); // only raster MIME types
        if (!opts.allowSiteUrls) expect(s.startsWith('data:image/')).toBe(true);
      }
    }
    expect(approved).toBeGreaterThan(1000); // the generator reaches the accepting path
  });

  it('rejects non-strings', () => {
    for (const v of [null, undefined, 1, {}, [], ['data:image/png;base64,AAAA'], { toString: () => 'data:image/png;base64,AAAA' }]) expect(isSafeImageSrc(v)).toBe(false);
  });
});

describe('fuzz: dataUrlToBlob', () => {
  it('decodes random bytes exactly', () => {
    const r = rng(5);
    for (let i = 0; i < 300; i++) {
      const bytes = Uint8Array.from({ length: Math.floor(r() * 3000) }, () => Math.floor(r() * 256));
      const blob = dataUrlToBlob('data:image/png;base64,' + Buffer.from(bytes).toString('base64'));
      expect(blob.size).toBe(bytes.length);
      expect(blob.type).toBe('image/png');
    }
  });
  it('throws (instead of hanging or returning garbage) on malformed base64', () => {
    for (const bad of ['data:image/png;base64,@@@@', 'data:image/png;base64,AAA', 'data:image/png;base64,A', 'data:image/png;base64,%%%']) {
      let out = null;
      try { out = dataUrlToBlob(bad); } catch (e) { expect(e).toBeInstanceOf(Error); }
      if (out) expect(out.size).toBeLessThanOrEqual(3);
    }
  });
});

describe('fuzz: parseSlug', () => {
  it('never throws and only returns finite, in-range coordinates', () => {
    const r = rng(42);
    const parts = ['/p/', '1', '-', '.', ',', 'e', '9', '0', 'NaN', 'Infinity', ' ', '%', '/', 'a', '\u0000', '14.388783', '104.965518', '180', '91'];
    for (let i = 0; i < 20000; i++) {
      const s = Array.from({ length: Math.floor(r() * 9) }, () => parts[Math.floor(r() * parts.length)]).join('');
      const out = parseSlug(s);
      if (out === null) continue;
      expect(between(out.lat, -90, 90) && between(out.lng, -180, 180)).toBe(true);
    }
  });
});
