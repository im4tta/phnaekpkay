import { test, expect } from '@playwright/test';

test.describe('installable PWA', () => {
  test('iOS icon is reachable, opaque PNG, at the tagged and root URLs', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.$$eval('link[rel="apple-touch-icon"]', (links) => links.map((l) => l.getAttribute('href')));
    expect(hrefs).toEqual(expect.arrayContaining(['/apple-touch-icon.png', '/assets/icons/apple-touch-icon-180.png']));
    for (const href of [...hrefs, '/apple-touch-icon-precomposed.png', '/favicon.ico']) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
      expect(res.headers()['content-type'], href).toMatch(/image\//);
    }
    const png = await (await request.get('/apple-touch-icon.png')).body();
    expect(png.readUInt32BE(16)).toBe(180); // width
    expect(png.readUInt32BE(20)).toBe(180); // height
    expect(png[25]).toBe(2); // colour type 2 = RGB without alpha: iOS needs an opaque icon
  });

  test('manifest is valid and every icon and splash image it or the page references exists', async ({ page, request }) => {
    await page.goto('/');
    const res = await request.get('/manifest.webmanifest');
    expect(res.headers()['content-type']).toContain('manifest+json');
    const manifest = await res.json();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512')).toBe(true);
    const urls = [
      ...manifest.icons.map((i) => i.src),
      ...(await page.$$eval('link[rel="apple-touch-startup-image"]', (l) => l.map((x) => x.getAttribute('href')))),
    ];
    expect(urls.length).toBeGreaterThan(10);
    for (const url of urls) expect((await request.get(url)).status(), url).toBe(200);
  });

  test('service worker precaches the shell and the app still loads offline', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).length)).toBeGreaterThan(0);
    const cached = await page.evaluate(async () => {
      const [name] = await caches.keys();
      return (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname);
    });
    expect(cached).toContain('/');
    expect(cached.some((p) => p.startsWith('/static/') && p.endsWith('.js'))).toBe(true);
    await page.reload(); // make sure the page is controlled by the worker
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#brandHome')).toBeVisible();
    await context.setOffline(false);
  });
});
