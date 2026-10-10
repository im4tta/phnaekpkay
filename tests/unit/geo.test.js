import { describe, it, expect } from 'vitest';
import { lon2tileX, lat2tileY, tileX2lon, tileY2lat, wrapTileX } from '../../src/lib/geo.js';

describe('tile maths', () => {
  it('maps the origin to the middle of the world at z0', () => {
    expect(lon2tileX(0, 0)).toBeCloseTo(0.5);
    expect(lat2tileY(0, 0)).toBeCloseTo(0.5);
  });
  it('round-trips coordinates', () => {
    for (const [lat, lng, z] of [[11.5625, 104.916, 14], [-33.9, 18.4, 10], [14.3887, 104.9655, 17]]) {
      expect(tileX2lon(lon2tileX(lng, z), z)).toBeCloseTo(lng, 9);
      expect(tileY2lat(lat2tileY(lat, z), z)).toBeCloseTo(lat, 9);
    }
  });
  it('wraps tile columns around the antimeridian', () => {
    expect(wrapTileX(-1, 3)).toBe(7);
    expect(wrapTileX(8, 3)).toBe(0);
    expect(wrapTileX(3, 3)).toBe(3);
  });
});
