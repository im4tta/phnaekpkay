/* Share links for bundled field sites look like /p/<lat>,<lng>. The path comes from the
   address bar, so it is treated as untrusted input: only two finite numbers are accepted. */

export function fmtCoord(value) {
  return Number(Number(value).toFixed(6)).toString();
}

export function siteSlug(site) {
  return '/p/' + fmtCoord(site.lat) + ',' + fmtCoord(site.lng);
}

/** Parse "/p/<lat>,<lng>" into coordinates, or null when it is not a valid share link. */
export function parseSlug(pathname) {
  if (typeof pathname !== 'string' || pathname.length > 64) return null;
  const m = pathname.match(/^\/p\/([^/]+)$/);
  if (!m) return null;
  const parts = m[1].split(',');
  if (parts.length !== 2) return null;
  const [rawLat, rawLng] = parts;
  if (rawLat.trim() === '' || rawLng.trim() === '') return null;
  const lat = Number(rawLat), lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Find the bundled site a share link points at (within about 10 cm). */
export function findSiteBySlug(sites, pathname) {
  const point = parseSlug(pathname);
  if (!point) return null;
  return sites.find((s) => Math.abs(s.lat - point.lat) < 1e-6 && Math.abs(s.lng - point.lng) < 1e-6) || null;
}
