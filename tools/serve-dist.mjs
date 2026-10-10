#!/usr/bin/env node
/* Static server for dist/ that applies the same headers and rewrites as vercel.json,
   so end-to-end tests (and `npm run serve:dist`) run under the production CSP.
   Usage: node tools/serve-dist.mjs [--build] [--port 4318] */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 4318;

if (args.includes('--build') && !args.includes('--port')) {
  execFileSync('npx', ['vite', 'build'], { cwd: root, stdio: 'inherit' });
  process.exit(0); // build-only mode (used before `playwright test`, which starts the server itself)
}
if (args.includes('--build')) execFileSync('npx', ['vite', 'build'], { cwd: root, stdio: 'inherit' });

const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const toRegExp = (source) => new RegExp('^' + source.replace(/[.+?^${}|[\]\\]/g, '\\$&').replace(/\(\.\*\)/g, '.*').replace(/:[a-z]+/g, '[^/]+') + '$');
const headerRules = (config.headers || []).map((r) => ({ re: toRegExp(r.source), headers: r.headers }));
const rewrites = (config.rewrites || []).map((r) => ({ re: toRegExp(r.source), destination: r.destination }));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  for (const rule of rewrites) if (rule.re.test(pathname)) pathname = rule.destination;
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.normalize(path.join(dist, pathname));
  if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }
  const headers = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' };
  for (const rule of headerRules) if (rule.re.test(new URL(req.url, 'http://x').pathname)) for (const h of rule.headers) headers[h.key] = h.value;
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`dist served on http://127.0.0.1:${port}`));
