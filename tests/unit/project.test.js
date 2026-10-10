import { describe, it, expect } from 'vitest';
import { sanitizeProject, parseProjectText, isSafeImageSrc, LIMITS } from '../../src/lib/project.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('isSafeImageSrc', () => {
  it('accepts raster data URLs only', () => {
    expect(isSafeImageSrc(PNG)).toBe(true);
    expect(isSafeImageSrc('data:image/svg+xml;base64,PHN2Zy8+')).toBe(false);
    expect(isSafeImageSrc('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
    expect(isSafeImageSrc('javascript:alert(1)')).toBe(false);
    expect(isSafeImageSrc('https://evil.example/a.png')).toBe(false);
    expect(isSafeImageSrc('data:image/png;base64,AAA" onerror="x')).toBe(false);
    expect(isSafeImageSrc(42)).toBe(false);
  });
  it('allows bundled site URLs only when trusted', () => {
    expect(isSafeImageSrc('/assets/sites/an-ses/frame-1.webp')).toBe(false);
    expect(isSafeImageSrc('/assets/sites/an-ses/frame-1.webp', { allowSiteUrls: true })).toBe(true);
    expect(isSafeImageSrc('/assets/sites/../../etc/passwd', { allowSiteUrls: true })).toBe(false);
    expect(isSafeImageSrc('//evil.example/assets/sites/a/b.webp', { allowSiteUrls: true })).toBe(false);
  });
});

describe('sanitizeProject', () => {
  it('rejects things that are not projects', () => {
    for (const bad of [null, undefined, 5, 'x', [], {}, { images: 'no' }]) expect(() => sanitizeProject(bad)).toThrow('invalid project');
  });

  it('accepts preference-only projects without images', () => {
    expect(sanitizeProject({ preferenceOnly: true }).images).toEqual([]);
  });

  it('keeps valid images, drops unsafe ones and reassigns duplicate ids', () => {
    const p = sanitizeProject({
      images: [
        { id: 3, src: PNG, label: 'a', selected: false },
        { id: 3, src: PNG, label: 'dup' },
        { id: 'x', src: PNG },
        { id: 4, src: 'javascript:alert(1)' },
        null,
      ],
    });
    expect(p.images.map((i) => i.id)).toEqual([3, null, null]);
    expect(p.images[0].selected).toBe(false);
    expect(p.images[1].selected).toBe(true);
  });

  it('caps the number of images and text lengths', () => {
    const images = Array.from({ length: LIMITS.maxImages + 20 }, (_, i) => ({ id: i + 1, src: PNG, label: 'x'.repeat(1000) }));
    const p = sanitizeProject({ images, caption: 'c'.repeat(5000), notes: 'n'.repeat(99999) });
    expect(p.images).toHaveLength(LIMITS.maxImages);
    expect(p.images[0].label).toHaveLength(LIMITS.maxLabel);
    expect(p.caption).toHaveLength(LIMITS.maxCaption);
    expect(p.notes).toHaveLength(LIMITS.maxNotes);
  });

  it('whitelists and clamps state', () => {
    const p = sanitizeProject({
      images: [], preferenceOnly: true, mode: 'hacked', cols: 99,
      view: { zoom: 1e9, panx: 'x', pany: null },
      map: { provider: 'evil', lat: 500, lng: 'NaN', zoom: 1e6, sentinelLayer: '<script>', sentinelDate: '2025-13-99x', nasaLayer: 'x', nasaDate: '2025-01-02', sentinelCloud: -5, sentinelSharpness: 9999 },
      sliderState: { leftId: '7', clip: 1000, three: 'yes', evil: 1, leftView: { zoom: 0 } },
      overlayState: { density: -50 }, changeState: { method: 'x', threshold: 1e6, minSize: 0 },
    });
    expect(p.mode).toBe('slider');
    expect(p.cols).toBe(4);
    expect(p.view).toEqual({ zoom: 4, panx: 0, pany: 0 });
    expect(p.map.provider).toBeNull();
    expect(p.map.lat).toBe(85);
    expect(p.map.lng).toBeNull();
    expect(p.map.zoom).toBe(22);
    expect(p.map.sentinelLayer).toBe('TRUE_COLOR');
    expect(p.map.sentinelDate).toBe('');
    expect(p.map.nasaLayer).toBeNull();
    expect(p.map.nasaDate).toBe('2025-01-02');
    expect(p.map.sentinelCloud).toBe(0);
    expect(p.map.sentinelSharpness).toBe(80);
    expect(p.sliderState).toMatchObject({ leftId: 7, clip: 99.5, three: false });
    expect(p.sliderState.evil).toBeUndefined();
    expect(p.sliderState.leftView.zoom).toBe(1);
    expect(p.overlayState.density).toBe(0);
    expect(p.changeState).toMatchObject({ method: 'rgb', threshold: 90, minSize: 1 });
  });

  it('does not let __proto__ keys pollute anything', () => {
    const text = '{"images":[],"preferenceOnly":true,"sliderState":{"__proto__":{"polluted":true}},"__proto__":{"polluted":true}}';
    sanitizeProject(JSON.parse(text));
    expect({}.polluted).toBeUndefined();
  });

  it('only allows annotation images that are safe', () => {
    expect(sanitizeProject({ images: [], preferenceOnly: true, annotation: PNG }).annotation).toBe(PNG);
    expect(sanitizeProject({ images: [], preferenceOnly: true, annotation: 'javascript:1' }).annotation).toBeNull();
  });
});

describe('parseProjectText', () => {
  it('parses valid JSON and rejects garbage and oversized input', () => {
    expect(parseProjectText('{"images":[]}').images).toEqual([]);
    expect(() => parseProjectText('{nope')).toThrow('invalid project');
    expect(() => parseProjectText('x'.repeat(LIMITS.maxFileBytes + 1))).toThrow('too large');
  });
});
