import { expect } from '@playwright/test';

/** Record CSP violations, page errors and console errors for the current page. */
export async function watchPage(page) {
  const problems = [];
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  page.on('pageerror', (err) => problems.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Imagery providers are third-party hosts; unreachable ones are not app errors.
    if (/Failed to load resource|net::ERR_|status of 4\d\d|status of 5\d\d/.test(text)) return;
    problems.push('console: ' + text);
  });
  return {
    problems,
    async cspViolations() { return page.evaluate(() => window.__csp || []); },
  };
}

/** A tiny but valid PNG data URL generated in the browser. */
export async function makePng(page, color, w = 64, h = 40) {
  return page.evaluate(([c, ww, hh]) => {
    const canvas = document.createElement('canvas');
    canvas.width = ww; canvas.height = hh;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = c; ctx.fillRect(0, 0, ww, hh);
    ctx.fillStyle = '#fff'; ctx.fillRect(ww / 4, hh / 4, ww / 2, hh / 2);
    return canvas.toDataURL('image/png');
  }, [color, w, h]);
}

export async function loadProject(page, project) {
  await page.setInputFiles('#projectInput', { name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
}

export async function expectNoProblems(page, watcher) {
  expect(await watcher.cspViolations()).toEqual([]);
  expect(watcher.problems).toEqual([]);
}
