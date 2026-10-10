import { h, setChildren } from '../lib/dom.js';

/** Horizontal rail of bundled field sites on the start screen. */
export function renderSiteRail(rail, sites, { photosLabel, onOpen }) {
  setChildren(
    rail,
    sites.map((site) =>
      h(
        'button',
        { type: 'button', class: 'site-card', onclick: () => onOpen(site) },
        h('img', { src: site.thumb, alt: '', loading: 'lazy', decoding: 'async', width: 480, height: 300 }),
        h('span', { class: 'site-meta' }, h('strong', null, site.name), h('span', { class: 'site-sub' }, `${site.lat.toFixed(3)}°N · ${photosLabel(site.frames)}`)),
      ),
    ),
  );
}
