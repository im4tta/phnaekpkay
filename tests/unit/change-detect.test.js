import { describe, it, expect } from 'vitest';
import { detectChanges, reliabilityOf } from '../../src/lib/change-detect.js';

function frame(w, h, rgb) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) data.set([...rgb, 255], p * 4);
  return data;
}
function paint(data, w, x0, y0, x1, y1, rgb) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data.set([...rgb, 255], (y * w + x) * 4);
}

describe('detectChanges', () => {
  const W = 40, H = 30;

  it('reports nothing for identical frames', () => {
    const a = frame(W, H, [80, 120, 60]);
    const r = detectChanges(a, a.slice(), W, H);
    expect(r.regionSizes).toEqual([]);
    expect(r.changedPct).toBe(0);
  });

  it('finds separate changed regions and their sizes', () => {
    const a = frame(W, H, [80, 120, 60]);
    const b = a.slice();
    paint(b, W, 2, 2, 7, 7, [250, 250, 250]);   // 5x5 = 25 px
    paint(b, W, 20, 10, 30, 20, [0, 0, 0]);       // 10x10 = 100 px
    const r = detectChanges(a, b, W, H, { threshold: 30, minSize: 4 });
    expect(r.regionSizes.sort((x, y) => x - y)).toEqual([25, 100]);
    expect(r.changedPixels).toBe(125);
    expect(r.changedPct).toBeCloseTo((125 / (W * H)) * 100);
  });

  it('drops regions smaller than minSize', () => {
    const a = frame(W, H, [80, 120, 60]);
    const b = a.slice();
    paint(b, W, 5, 5, 7, 7, [255, 255, 255]); // 4 px
    expect(detectChanges(a, b, W, H, { minSize: 5 }).regionSizes).toEqual([]);
    expect(detectChanges(a, b, W, H, { minSize: 4 }).regionSizes).toEqual([4]);
  });

  it('does not connect regions across row boundaries', () => {
    const a = frame(W, H, [0, 0, 0]);
    const b = a.slice();
    paint(b, W, W - 1, 3, W, 4, [255, 255, 255]); // last pixel of row 3
    paint(b, W, 0, 4, 1, 5, [255, 255, 255]);     // first pixel of row 4 (adjacent in memory only)
    expect(detectChanges(a, b, W, H, { minSize: 1 }).regionSizes.sort()).toEqual([1, 1]);
  });

  it('a higher threshold ignores subtle differences', () => {
    const a = frame(W, H, [100, 100, 100]);
    const b = frame(W, H, [110, 110, 110]);
    expect(detectChanges(a, b, W, H, { threshold: 3 }).changedPct).toBe(100);
    expect(detectChanges(a, b, W, H, { threshold: 30 }).changedPct).toBe(0);
  });

  it('supports brightness and vegetation methods', () => {
    const a = frame(W, H, [60, 140, 60]); // green
    const b = frame(W, H, [160, 60, 60]); // reddish
    expect(detectChanges(a, b, W, H, { method: 'luma', threshold: 5 }).changedPct).toBe(100);
    expect(detectChanges(a, b, W, H, { method: 'ndvi', threshold: 10 }).changedPct).toBe(100);
  });
});

describe('reliabilityOf', () => {
  it('buckets by changed area', () => {
    expect(reliabilityOf(0.2)).toBe('high');
    expect(reliabilityOf(5)).toBe('review');
    expect(reliabilityOf(40)).toBe('low');
  });
});
