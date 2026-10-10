import { test, expect } from '@playwright/test';
import { openAnSes, AN_SES } from './helpers.js';

test.describe('phone layout', () => {
  test.skip(({ viewport }) => !viewport || viewport.width > 500, 'phone only');

  test('no horizontal scrolling on any screen', async ({ page }) => {
    for (const path of ['/', AN_SES]) {
      await page.goto(path);
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test('every visible control is at least 44 px tall and text is at least 12 px', async ({ page }) => {
    await openAnSes(page);
    for (const mode of ['modeSliderBtn', 'modeOverlayBtn', 'modeSequenceBtn', 'modeChangeBtn', 'modeGridBtn']) {
      await page.click('#' + mode);
      await page.waitForTimeout(200);
      const bad = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('button, a[href], select, input:not([type=hidden]):not([type=checkbox]):not([type=file]), summary')) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || el.closest('[hidden], .sidebar.is-collapsed, [inert]')) continue;
          if (cs.position === 'fixed' || r.bottom < 0 || r.top > innerHeight) { /* still check */ }
          if (r.height < 43.5) out.push(`${el.tagName}#${el.id || el.className} h=${Math.round(r.height)}`);
        }
        for (const el of document.querySelectorAll('body *')) {
          if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || el.closest('[hidden], .sidebar.is-collapsed, [inert], svg, canvas')) continue;
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (px < 11.9) out.push(`text ${el.tagName}.${el.className} ${px}px`);
        }
        return out;
      });
      expect(bad, mode).toEqual([]);
    }
  });

  test('menu opens as a bottom sheet and closes with Escape', async ({ page }) => {
    await openAnSes(page);
    await page.click('#moreBtn');
    const sheet = page.locator('#topActions');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    const vh = page.viewportSize().height;
    expect(box.y + box.height).toBeGreaterThanOrEqual(vh - 1);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });

  test('drawer opens from the menu button and its tabs switch', async ({ page }) => {
    await page.goto('/');
    await page.click('#sidebarToggleBtn');
    await expect(page.locator('#sidebar')).toBeVisible();
    await page.click('#addTabSatellite');
    await expect(page.locator('#providerSelect')).toBeVisible();
    await page.click('#addTabPaste');
    await expect(page.locator('#pasteBtn')).toBeVisible();
  });

  test('the dock is a slim row by default so the photos get the screen, and expands on tap', async ({ page }) => {
    await openAnSes(page);
    const dock = page.locator('#dock');
    const compact = await dock.boundingBox();
    expect(compact.height).toBeLessThan(90);
    await expect(page.locator('#pickerRow')).toBeHidden();
    await page.click('#pickerToggle');
    await expect(page.locator('#pickerRow')).toBeVisible();
    expect((await dock.boundingBox()).height).toBeGreaterThan(compact.height + 60);
    await page.reload(); // the choice is remembered
    await expect(page.locator('#pickerRow')).toBeVisible();
  });
});
