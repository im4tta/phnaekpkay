/* Local project autosave in IndexedDB. Everything stays on this device.
   Frames are stored as Blobs (structured clone), so there is no base64 round-trip.
   Small, frequently changing state and large, rarely changing blobs live in
   separate records so a pan or zoom never rewrites megabytes of imagery. */

const DB_NAME = 'phnaek-pkay';
const STORE = 'projects';
const VERSION = 1;

function open(factory = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    if (!factory) return reject(new Error('IndexedDB unavailable'));
    const request = factory.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run(mode, fn, factory) {
  return open(factory).then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = fn(tx.objectStore(STORE));
        tx.oncomplete = () => { db.close(); resolve(request ? request.result : undefined); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
      }),
  );
}

/** Store `data` (an object) under `id`. */
export function putRecord(id, data, factory) {
  return run('readwrite', (store) => store.put({ ...data, id }), factory);
}

export function getRecord(id, factory) {
  return run('readonly', (store) => store.get(id), factory);
}

export function deleteRecord(id, factory) {
  return run('readwrite', (store) => store.delete(id), factory);
}
