/* Pixel-difference change detection.
   Inputs are two equally sized RGBA buffers (e.g. canvas ImageData.data).
   Pure and DOM-free so it can be unit-tested and moved to a worker. */

export const METHODS = ['rgb', 'luma', 'ndvi'];

function pixelDelta(method, ai, bi, i) {
  const ar = ai[i], ag = ai[i + 1], ab = ai[i + 2];
  const br = bi[i], bg = bi[i + 1], bb = bi[i + 2];
  if (method === 'luma') return Math.abs(ar * 0.299 + ag * 0.587 + ab * 0.114 - (br * 0.299 + bg * 0.587 + bb * 0.114));
  if (method === 'ndvi') return Math.abs((ag - ar) / (ag + ar + 1) - (bg - br) / (bg + br + 1)) * 255;
  return (Math.abs(ar - br) + Math.abs(ag - bg) + Math.abs(ab - bb)) / 3;
}

/**
 * @param {Uint8ClampedArray} a  RGBA of the "before" frame
 * @param {Uint8ClampedArray} b  RGBA of the "after" frame
 * @param {number} width
 * @param {number} height
 * @param {{method?: string, threshold?: number, minSize?: number}} options
 *        threshold is 0-100 (% of the 0-255 range); regions smaller than minSize pixels are dropped.
 * @returns {{keep: Uint8Array, regionSizes: number[], changedPixels: number, changedPct: number}}
 */
export function detectChanges(a, b, width, height, { method = 'rgb', threshold = 30, minSize = 12 } = {}) {
  const total = width * height;
  const limit = (threshold / 100) * 255;
  const mask = new Uint8Array(total);
  for (let p = 0; p < total; p++) {
    if (pixelDelta(method, a, b, p * 4) >= limit) mask[p] = 1;
  }

  const visited = new Uint8Array(total);
  const keep = new Uint8Array(total);
  const regionSizes = [];
  const stack = new Int32Array(total);
  const component = new Int32Array(total);
  let changedPixels = 0;

  for (let start = 0; start < total; start++) {
    if (!mask[start] || visited[start]) continue;
    let sp = 0;
    let size = 0;
    stack[sp++] = start;
    visited[start] = 1;
    while (sp > 0) {
      const q = stack[--sp];
      component[size++] = q;
      const x = q % width;
      // 4-connected neighbours: left, right, up, down
      if (x > 0 && mask[q - 1] && !visited[q - 1]) { visited[q - 1] = 1; stack[sp++] = q - 1; }
      if (x < width - 1 && mask[q + 1] && !visited[q + 1]) { visited[q + 1] = 1; stack[sp++] = q + 1; }
      if (q >= width && mask[q - width] && !visited[q - width]) { visited[q - width] = 1; stack[sp++] = q - width; }
      if (q < total - width && mask[q + width] && !visited[q + width]) { visited[q + width] = 1; stack[sp++] = q + width; }
    }
    if (size >= minSize) {
      regionSizes.push(size);
      changedPixels += size;
      for (let i = 0; i < size; i++) keep[component[i]] = 1;
    }
  }
  return { keep, regionSizes, changedPixels, changedPct: total ? (changedPixels / total) * 100 : 0 };
}

/** Plain-language reliability hint for a changed-area percentage. */
export function reliabilityOf(changedPct) {
  if (changedPct < 1) return 'high';
  if (changedPct < 18) return 'review';
  return 'low';
}
