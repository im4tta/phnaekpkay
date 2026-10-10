#!/usr/bin/env node
/* Generates every icon and iOS splash image from one master design.
   Usage: PW_CHROMIUM_PATH=/path/to/chrome node tools/make-icons.mjs
   Output (committed): public/apple-touch-icon*.png, public/favicon.ico,
   public/assets/phnaek-pkay.svg, public/assets/icons/*, public/assets/splash/*

   Why these files exist (iPhone "blank icon" fixes):
   - iOS reads <link rel="apple-touch-icon">, not the web manifest, for the Home Screen icon.
   - The PNG must be opaque (no alpha) and square; iOS applies the rounded mask itself.
   - Safari also probes /apple-touch-icon.png at the site root when the tag is missing or unreachable. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = (...p) => path.join(root, 'public', ...p);
fs.mkdirSync(out('assets', 'icons'), { recursive: true });
fs.mkdirSync(out('assets', 'splash'), { recursive: true });

/** Master mark: a split-circle (before | after) with a handle, orbit arc and satellite dot. */
function mark(idSuffix = '') {
  const id = idSuffix;
  return `<clipPath id="c${id}"><circle cx="90" cy="90" r="42"/></clipPath>
<g clip-path="url(#c${id})"><rect x="40" y="40" width="50" height="100" fill="#8ea15c"/><rect x="90" y="40" width="60" height="100" fill="#d3934f"/>
<path d="M48 70l22 10 20-14M48 112l26-8 16 18" stroke="#6f8147" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M94 62l24 14 20-8M94 118l22-12 24 10" stroke="#e8b078" stroke-width="5" fill="none" stroke-linecap="round"/></g>
<path d="M90 24A66 66 0 1 0 144 128" stroke="#eef0e4" stroke-width="7" fill="none" stroke-linecap="round"/>
<circle cx="132.4" cy="39.4" r="9" fill="#eef0e4"/>
<line x1="90" y1="42" x2="90" y2="138" stroke="#eef0e4" stroke-width="5"/>
<circle cx="90" cy="90" r="14" fill="#eef0e4"/><path d="M86 84l-6 6 6 6M94 84l6 6-6 6" stroke="#12140f" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const BG = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#232a18"/><stop offset="1" stop-color="#0c0e08"/></linearGradient></defs>';

/** Full-bleed opaque square (iOS / maskable). */
const squareSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">${BG}<rect width="180" height="180" fill="url(#g)"/>${mark()}</svg>`;
/** Rounded version with transparent corners (favicon, "any" purpose icons). */
const roundedSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">${BG}<rect width="180" height="180" rx="40" fill="url(#g)"/>${mark()}</svg>`;

fs.writeFileSync(out('assets', 'phnaek-pkay.svg'), roundedSvg() + '\n');

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });

async function renderSvg(svg, size, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  const buf = await page.screenshot({ omitBackground: transparent, type: 'png' });
  await page.close();
  return buf;
}

// ---- iOS Home Screen icons: opaque, full-bleed, several sizes ----
const apple = squareSvg();
for (const size of [120, 152, 167, 180]) fs.writeFileSync(out('assets', 'icons', `apple-touch-icon-${size}.png`), await renderSvg(apple, size));
const icon180 = await renderSvg(apple, 180);
fs.writeFileSync(out('apple-touch-icon.png'), icon180);
fs.writeFileSync(out('apple-touch-icon-precomposed.png'), icon180);

// ---- Android / desktop PWA icons ----
const rounded = roundedSvg();
for (const size of [192, 512]) {
  fs.writeFileSync(out('assets', 'icons', `icon-${size}.png`), await renderSvg(rounded, size, { transparent: true }));
  fs.writeFileSync(out('assets', 'icons', `icon-maskable-${size}.png`), await renderSvg(apple, size));
}
const fav = { 16: await renderSvg(rounded, 16, { transparent: true }), 32: await renderSvg(rounded, 32, { transparent: true }), 48: await renderSvg(rounded, 48, { transparent: true }) };
fs.writeFileSync(out('assets', 'icons', 'favicon-16.png'), fav[16]);
fs.writeFileSync(out('assets', 'icons', 'favicon-32.png'), fav[32]);

// ---- favicon.ico (PNG-in-ICO, 16/32/48) ----
function ico(entries) {
  const header = Buffer.alloc(6); header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dirs = [], bodies = [];
  for (const [size, png] of entries) {
    const d = Buffer.alloc(16);
    d.writeUInt8(size, 0); d.writeUInt8(size, 1); d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6);
    d.writeUInt32LE(png.length, 8); d.writeUInt32LE(offset, 12);
    dirs.push(d); bodies.push(png); offset += png.length;
  }
  return Buffer.concat([header, ...dirs, ...bodies]);
}
fs.writeFileSync(out('favicon.ico'), ico(Object.entries(fav).map(([s, b]) => [Number(s), b])));

// ---- iOS launch screens (portrait) ----
const SPLASH = [ // [css width, css height, device pixel ratio]
  [440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3],
  [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
];
const interFont = fs.readFileSync(path.join(root, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')).toString('base64');
const manifest = [];
for (const [w, h, dpr] of SPLASH) {
  const W = w * dpr, H = h * dpr, icon = Math.round(Math.min(W, H) * 0.24);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<style>@font-face{font-family:I;src:url(data:font/woff2;base64,${interFont});font-weight:100 900}
html,body{margin:0;width:${W}px;height:${H}px;background:#12140f}
body{background:radial-gradient(70% 38% at 50% 44%,rgba(142,161,92,.22),transparent 70%),#12140f;color:#eef0e4;font-family:I,sans-serif;position:relative}
.c{position:absolute;left:0;right:0;top:${Math.round(H * 0.4)}px;text-align:center}
.i{width:${icon}px;height:${icon}px;margin:0 auto;border-radius:${Math.round(icon * 0.2237)}px;overflow:hidden;box-shadow:0 ${icon * 0.12}px ${icon * 0.4}px rgba(0,0,0,.55)}
.i svg{display:block;width:100%;height:100%}
h1{font-size:${Math.round(icon * 0.26)}px;font-weight:700;letter-spacing:-.02em;margin:${Math.round(icon * 0.22)}px 0 0}
p{font-size:${Math.round(icon * 0.14)}px;color:#a7ad97;margin:${Math.round(icon * 0.06)}px 0 0}</style>
<div class="c"><div class="i">${squareSvg()}</div><h1>Phnaek Pkay</h1><p>Satellite imagery, side by side</p></div>`);
  const name = `splash-${W}x${H}.png`;
  fs.writeFileSync(out('assets', 'splash', name), await page.screenshot({ type: 'png' }));
  await page.close();
  manifest.push({ w, h, dpr, name });
}
fs.writeFileSync(path.join(root, 'tools', 'splash-links.html'), manifest.map(({ w, h, dpr, name }) =>
  `<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" href="/assets/splash/${name}">`).join('\n') + '\n');
await browser.close();
console.log('icons + splash written; paste tools/splash-links.html into index.html <head> if the size list changed');
