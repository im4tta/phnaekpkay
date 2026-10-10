// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderPicker, nextPair } from '../../src/components/picker.js';
import { renderSiteRail } from '../../src/components/start.js';
import { isIos, isSnoozed } from '../../src/lib/install-help.js';

const frames = [
  { id: 1, label: 'google · latest · captured Aug 11, 2026, 10:22 AM', thumb: 'data:image/jpeg;base64,AA==' },
  { id: 2, label: '<img src=x onerror=alert(1)>', src: '/assets/sites/a/frame-1.webp' },
  { id: 3, label: 'Third', thumb: 'data:image/jpeg;base64,BB==' },
];

describe('renderPicker', () => {
  it('marks the two chosen photos, escapes labels and calls back on tap', () => {
    const row = document.createElement('div');
    const onPick = vi.fn(), onAdd = vi.fn();
    renderPicker(row, { frames, aId: 1, bId: 2, aLabel: 'Before', bLabel: 'After', addLabel: 'Add photo', onPick, onAdd });
    const picks = row.querySelectorAll('.pick:not(.add)');
    expect(picks).toHaveLength(3);
    expect(picks[0].classList.contains('is-a')).toBe(true);
    expect(picks[0].querySelector('.pick-badge').textContent).toBe('Before');
    expect(picks[1].classList.contains('is-b')).toBe(true);
    expect(picks[2].querySelector('.pick-badge')).toBeNull();
    expect(picks[0].querySelector('.pick-label').textContent).toBe('Google · latest');
    expect(row.querySelectorAll('img[src="x"]')).toHaveLength(0);
    expect(picks[1].querySelector('.pick-label').textContent).toContain('<img');
    picks[2].click();
    expect(onPick).toHaveBeenCalledWith(3);
    row.querySelector('.pick.add').click();
    expect(onAdd).toHaveBeenCalled();
  });

  it('shows a combined badge when both slots hold the same photo', () => {
    const row = document.createElement('div');
    renderPicker(row, { frames, aId: 1, bId: 1, aLabel: 'A', bLabel: 'B', addLabel: '+', onPick() {}, onAdd() {} });
    expect(row.querySelector('.pick-badge').textContent).toBe('A / B');
  });
});

describe('nextPair', () => {
  it('fills the chosen slot', () => {
    expect(nextPair({ aId: 1, bId: 2 }, 3, 'b')).toEqual({ aId: 1, bId: 3 });
    expect(nextPair({ aId: 1, bId: 2 }, 3, 'a')).toEqual({ aId: 3, bId: 2 });
  });
  it('swaps when the tapped photo is already in the other slot', () => {
    expect(nextPair({ aId: 1, bId: 2 }, 1, 'b')).toEqual({ aId: 2, bId: 1 });
    expect(nextPair({ aId: 1, bId: 2 }, 2, 'a')).toEqual({ aId: 2, bId: 1 });
  });
});

describe('renderSiteRail', () => {
  it('renders one card per site and opens it on click', () => {
    const rail = document.createElement('div');
    const onOpen = vi.fn();
    const sites = [{ slug: 'an-ses', name: '<b>An Ses</b>', lat: 14.388, lng: 104.9, thumb: '/assets/sites/an-ses/thumb.webp', frames: 2 }];
    renderSiteRail(rail, sites, { photosLabel: (n) => `${n} photos`, onOpen });
    expect(rail.querySelectorAll('.site-card')).toHaveLength(1);
    expect(rail.querySelector('b')).toBeNull();
    expect(rail.textContent).toContain('2 photos');
    rail.querySelector('.site-card').click();
    expect(onOpen).toHaveBeenCalledWith(sites[0]);
  });
});

describe('install help helpers', () => {
  it('detects iOS including iPadOS desktop mode', () => {
    expect(isIos({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
    expect(isIos({ userAgent: 'Mozilla/5.0 (Linux; Android 14)', platform: 'Linux armv8l', maxTouchPoints: 5 })).toBe(false);
  });
  it('snoozes for 30 days', () => {
    const store = new Map();
    const storage = { getItem: (k) => store.get(k) ?? null };
    expect(isSnoozed(storage)).toBe(false);
    store.set('phnaek-pkay-install-dismissed', String(Date.now() - 5 * 24 * 3600 * 1000));
    expect(isSnoozed(storage)).toBe(true);
    store.set('phnaek-pkay-install-dismissed', String(Date.now() - 40 * 24 * 3600 * 1000));
    expect(isSnoozed(storage)).toBe(false);
  });
});
