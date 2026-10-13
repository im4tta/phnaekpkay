import { test, expect } from '@playwright/test';
import { watchPage, makePng, loadProject, expectNoProblems, openDrawer } from './helpers.js';

test('app boots with the enforced CSP and no errors', async ({ page }) => {
  const watcher = await watchPage(page);
  const response = await page.goto('/');
  const csp = response.headers()['content-security-policy'];
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  await expect(page.locator('#sliderStage, #startScreen').first()).toBeAttached();
  await page.waitForTimeout(500);
  await expectNoProblems(page, watcher);
});

test('crafted project data cannot run script or inject markup', async ({ page }) => {
  const watcher = await watchPage(page);
  let dialogs = 0;
  page.on('dialog', async (d) => { dialogs++; await d.dismiss(); });
  await page.goto('/');
  const png = await makePng(page, '#336699');
  const evil = '"><img src=x onerror="window.__pwned=1;alert(1)"><svg onload="window.__pwned=1">';
  await loadProject(page, {
    version: 1, mode: 'grid', caption: evil, notes: evil,
    images: [
      { id: 1, src: png, label: evil, imageryDate: evil, selected: true },
      { id: 2, src: 'javascript:window.__pwned=1', label: 'bad scheme' },
      { id: 3, src: 'https://evil.example/x.png', label: 'remote image' },
      { id: 4, src: 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+', label: 'svg' },
    ],
    map: { provider: 'javascript:alert(1)', lat: 'NaN', lng: 1e99, sentinelLayer: '"><script>', sentinelDate: 'x', nasaLayer: 'evil' },
    sliderState: { leftId: '1; DROP', clip: 'x', __proto__: { polluted: true } },
  });
  await expect(page.locator('#imageList .img-row')).toHaveCount(1);
  await expect(page.locator('#imageList .img-row input[type=text]').first()).toHaveValue(evil);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await page.evaluate(() => ({}).polluted)).toBeUndefined();
  expect(dialogs).toBe(0);
  // markup from the label must never become elements
  expect(await page.locator('#imageList img[src="x"], #gridStage img[src="x"]').count()).toBe(0);
  await expectNoProblems(page, watcher);
});

test('API keys stay in sessionStorage and never reach localStorage, IndexedDB or exports', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.setItem('phnaek-pkay-preferences', JSON.stringify({ map: { mapboxToken: 'LEAK1', sentinelId: 'LEAK2', placesApiKey: 'LEAK3' } })); });
  await page.reload();
  await openDrawer(page);
  await page.click('#addTabSatellite');
  await page.selectOption('#providerSelect', 'mapbox');
  await page.fill('#mapboxToken', 'pk.SECRET_TOKEN_123');
  await page.selectOption('#providerSelect', 'google');
  await page.fill('#placesApiKey', 'SECRET_PLACES_456');
  const png = await makePng(page, '#884422');
  await loadProject(page, { version: 1, images: [{ id: 1, src: png, label: 'a' }] });
  await expect(page.locator('#imageList .img-row')).toHaveCount(1);
  await page.waitForTimeout(1600); // let the debounced autosave run
  await page.evaluate(() => new Promise((r) => { document.dispatchEvent(new Event('visibilitychange')); setTimeout(r, 400); }));

  const stored = await page.evaluate(async () => {
    const dump = { local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage) };
    const idb = await new Promise((resolve) => {
      const req = indexedDB.open('phnaek-pkay');
      req.onsuccess = () => {
        const tx = req.result.transaction('projects', 'readonly').objectStore('projects').getAll();
        tx.onsuccess = () => resolve(JSON.stringify(tx.result.map((r) => ({ ...r, byId: r.byId ? Object.keys(r.byId) : undefined, annotation: undefined }))));
        tx.onerror = () => resolve('');
      };
      req.onerror = () => resolve('');
    });
    return { ...dump, idb };
  });
  expect(stored.local).not.toMatch(/SECRET_|LEAK\d/);
  expect(stored.idb).not.toMatch(/SECRET_|LEAK\d/);
  expect(stored.session).toContain('SECRET_TOKEN_123');

  const [download] = await Promise.all([page.waitForEvent('download'), (async () => {
    await page.evaluate(() => document.getElementById('saveProjectBtn').click());
  })()]);
  const text = (await (await import('node:fs/promises')).readFile(await download.path(), 'utf8'));
  expect(text).not.toMatch(/SECRET_|LEAK\d/);
  expect(text).not.toMatch(/mapboxToken|sentinelId|placesApiKey/);
});

test('Trusted Types are enforced: no string becomes script except same-origin worker URLs', async ({ page }) => {
  const watcher = await watchPage(page);
  const response = await page.goto('/');
  const csp = response.headers()['content-security-policy'];
  expect(csp).toContain("require-trusted-types-for 'script'");
  expect(csp).toContain('trusted-types default');
  expect(csp).not.toMatch(/'unsafe-eval'/);
  const result = await page.evaluate(() => {
    const attempt = (fn) => { try { fn(); return 'allowed'; } catch (e) { return e.name; } };
    return {
      hasDefaultPolicy: Boolean(window.trustedTypes && window.trustedTypes.defaultPolicy),
      innerHTML: attempt(() => { document.createElement('div').innerHTML = '<img src=x onerror=alert(1)>'; }),
      scriptSrc: attempt(() => { document.createElement('script').src = 'https://evil.example/x.js'; }),
      scriptText: attempt(() => { document.createElement('script').text = 'window.__pwned = 1'; }),
      evilWorker: attempt(() => { new Worker('https://evil.example/x.js'); }),
      dataWorker: attempt(() => { new Worker('data:text/javascript,postMessage(1)'); }),
    };
  });
  expect(result.hasDefaultPolicy).toBe(true);
  expect(result.innerHTML).toBe('TypeError');
  expect(result.scriptSrc).toBe('TypeError');
  expect(result.scriptText).toBe('TypeError');
  expect(result.evilWorker).toBe('TypeError');
  expect(result.dataWorker).toBe('TypeError');
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  // the app itself never trips the policy while it runs (forget the violations caused on purpose above)
  await page.evaluate(() => { window.__csp = []; });
  await page.locator('.site-card').first().click();
  await expect(page.locator('#sliderStage')).toBeVisible();
  await page.waitForTimeout(400);
  expect((await watcher.cspViolations()).filter((v) => !/^img-src|^connect-src/.test(v))).toEqual([]);
});

test('the AI-enhance worker still starts under the CSP and Trusted Types', async ({ page }) => {
  const watcher = await watchPage(page);
  await page.goto('/');
  // A bogus model: the worker must start, load onnxruntime, and fail on the model, not on the policy.
  await page.setInputFiles('#upscaleModelInput', { name: 'bogus.onnx', mimeType: 'application/octet-stream', buffer: Buffer.alloc(64, 7) });
  const status = page.locator('#upscaleStatus');
  await expect(status).toContainText('Model could not load:', { timeout: 20_000 });
  await expect(status).not.toContainText('could not start');
  expect((await watcher.cspViolations()).filter((v) => !/^img-src|^connect-src/.test(v))).toEqual([]);
});

test('scripts, WASM and data files are same-origin only (Cross-Origin-Resource-Policy)', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const script = html.match(/\/static\/index-[\w-]+\.js/)[0];
  for (const path of [script, '/vendor/ort/ort.wasm.min.js', '/assets/sites/index.json']) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['cross-origin-resource-policy'], path).toBe('same-origin');
  }
  const doc = await request.get('/');
  expect(doc.headers()['cross-origin-opener-policy']).toBe('same-origin');
});
