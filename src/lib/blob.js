/* Conversions between base64 data URLs and Blobs. Frames live in memory as Blobs
   (no 33% base64 overhead, no multi-megabyte strings in the DOM). */

const CHUNK = 1 << 20;

/** Decode a base64 data URL into a Blob without going through fetch(). */
export function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(5, comma); // "image/png;base64"
  const type = header.split(';')[0] || 'application/octet-stream';
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += CHUNK) {
    const end = Math.min(binary.length, i + CHUNK);
    for (let j = i; j < end; j++) bytes[j] = binary.charCodeAt(j);
  }
  return new Blob([bytes], { type });
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), type, quality);
    } catch (err) {
      reject(err); // tainted canvas throws synchronously
    }
  });
}
