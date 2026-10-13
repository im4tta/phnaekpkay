import { describe, it, expect } from 'vitest';
import { parseSlug, siteSlug, fmtCoord, findSiteBySlug } from '../../src/lib/slug.js';

const SITES = [{ lat: 14.388783, lng: 104.965518, name: 'An Ses' }, { lat: -12.5, lng: 30, name: 'South' }];

describe('parseSlug', () => {
  it('reads coordinates from a share link', () => {
    expect(parseSlug('/p/14.388783,104.965518')).toEqual({ lat: 14.388783, lng: 104.965518 });
    expect(parseSlug('/p/-12.5,30')).toEqual({ lat: -12.5, lng: 30 });
  });

  it('rejects anything else', () => {
    for (const bad of ['/', '/p/', '/p/1', '/p/1,2,3', '/p/a,b', '/p/,', '/p/ , ', '/p/NaN,1', '/p/Infinity,1', '/p/91,0', '/p/0,181', '/p/1,2/', '/q/1,2',
      '/p/' + '9'.repeat(80) + ',1', '/p/1e999,1', '/p/<script>,1', null, undefined, 42, {}]) {
      expect(parseSlug(bad), String(bad)).toBeNull();
    }
  });
});

describe('site links', () => {
  it('round-trips through siteSlug', () => {
    for (const s of SITES) expect(findSiteBySlug(SITES, siteSlug(s))).toBe(s);
  });
  it('trims long decimals and finds nothing for unknown places', () => {
    expect(fmtCoord(14.3887830000001)).toBe('14.388783');
    expect(findSiteBySlug(SITES, '/p/1,2')).toBeNull();
    expect(findSiteBySlug(SITES, '/nope')).toBeNull();
  });
});
