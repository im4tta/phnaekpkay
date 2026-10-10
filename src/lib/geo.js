/* Web-Mercator slippy-map tile maths. */

export const TILE = 256;

export function lon2tileX(lon, z) {
  return ((lon + 180) / 360) * Math.pow(2, z);
}

export function lat2tileY(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z);
}

export function tileX2lon(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180;
}

export function tileY2lat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** Wrap a tile x index into [0, 2^z). */
export function wrapTileX(x, z) {
  const n = Math.pow(2, z);
  return ((x % n) + n) % n;
}
