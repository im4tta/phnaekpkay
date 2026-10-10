import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/* Self-hosted onnxruntime-web (WASM-only build). Served from /vendor/ort/ so the
   app has no third-party script origin. Only needed by the optional AI-enhance
   worker, which loads it on demand. */
const ORT_DIR = path.resolve('node_modules/onnxruntime-web/dist');
const ORT_FILES = {
  'ort.wasm.min.js': 'text/javascript; charset=utf-8',
  'ort-wasm-simd-threaded.mjs': 'text/javascript; charset=utf-8',
  'ort-wasm-simd-threaded.wasm': 'application/wasm',
};

function ortVendor() {
  let outDir;
  return {
    name: 'phnaek-ort-vendor',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use('/vendor/ort/', (req, res, next) => {
        const name = path.basename(decodeURIComponent((req.url || '').split('?')[0]));
        if (!Object.hasOwn(ORT_FILES, name)) return next();
        res.setHeader('Content-Type', ORT_FILES[name]);
        fs.createReadStream(path.join(ORT_DIR, name)).pipe(res);
      });
    },
    closeBundle() {
      const target = path.join(outDir, 'vendor', 'ort');
      fs.mkdirSync(target, { recursive: true });
      for (const name of Object.keys(ORT_FILES)) fs.copyFileSync(path.join(ORT_DIR, name), path.join(target, name));
    },
  };
}


/* Inject the content-hashed app shell into the service worker so offline support and
   cache invalidation follow every deploy automatically. */
function serviceWorkerManifest() {
  let outDir;
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  return {
    name: 'phnaek-sw-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const rel = (f) => '/' + path.relative(outDir, f).split(path.sep).join('/');
      const shell = walk(path.join(outDir, 'static'))
        .map(rel)
        .filter((u) => /\.(js|css)$/.test(u) || /(inter|jetbrains-mono)-latin-[^/]*\.woff2$/.test(u));
      const urls = ['/', '/manifest.webmanifest', '/assets/phnaek-pkay.svg', '/assets/icons/icon-192.png', '/assets/icons/icon-512.png', '/assets/sites/index.json', ...shell].sort();
      const hash = crypto.createHash('sha1');
      for (const u of urls) {
        hash.update(u);
        const file = path.join(outDir, u === '/' ? 'index.html' : u);
        if (fs.existsSync(file)) hash.update(fs.readFileSync(file));
      }
      const swPath = path.join(outDir, 'sw.js');
      const sw = fs.readFileSync(swPath, 'utf8')
        .replace("/*__SW_VERSION__*/'dev'", JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace('/*__SW_PRECACHE__*/[]', JSON.stringify(urls));
      fs.writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  plugins: [ortVendor(), serviceWorkerManifest()],
  build: { target: 'es2020', sourcemap: false, assetsDir: 'static' },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
