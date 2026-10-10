import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

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

export default defineConfig({
  plugins: [ortVendor()],
  build: { target: 'es2020', sourcemap: false, assetsDir: 'static' },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
