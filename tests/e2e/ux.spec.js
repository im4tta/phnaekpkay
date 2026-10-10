import { test, expect } from '@playwright/test';
import { watchPage, makePng, loadProject, expectNoProblems, openAnSes, openDrawer } from './helpers.js';

test.describe('start screen', () => {
  test('first visit shows the friendly start screen, not a blocking popup', async ({ page }) => {
    const watcher = await watchPage(page);
    await page.goto('/');
    await expect(page.locator('#startTitle')).toHaveText('See what changed on the ground.');
    await expect(page.locator('#locationsModal')).toBeHidden();
    await expect(page.locator('#startAddBtn')).toBeVisible();
    await expect(page.locator('#siteRail .site-card')).toHaveCount(5);
    await expectNoProblems(page, watcher);
  });

  test('opening a field site loads its photos and switches to Compare', async ({ page }) => {
    const watcher = await watchPage(page);
    await page.goto('/');
    await page.locator('#siteRail .site-card', { hasText: 'An Ses' }).click();
    await expect(page.locator('#sliderStage')).toBeVisible();
    await expect(page.locator('#imageList .img-row')).toHaveCount(2);
    await expect(page).toHaveURL(/\/p\/14\.388783,104\.965518$/);
    await expectNoProblems(page, watcher);
  });

  test('field-site share links open directly into the site', async ({ page }) => {
    await openAnSes(page);
    await expect(page.locator('#leftLabelTag')).toContainText('An Ses');
  });
});

test.describe('compare view', () => {
  test('labels are short and do not overlap, and the picker changes the pair', async ({ page }) => {
    await openAnSes(page);
    const left = page.locator('#leftLabelTag');
    const right = page.locator('#rightLabelTag');
    await expect(left).toBeVisible();
    const a = await left.boundingBox();
    const b = await right.boundingBox();
    expect(a.x + a.width).toBeLessThanOrEqual(b.x);
    await expect(left).not.toContainText('captured');

    const picks = page.locator('#pickerRow .pick:not(.add)');
    await expect(picks).toHaveCount(2);
    await expect(picks.nth(0)).toHaveClass(/is-a/);
    await expect(picks.nth(1)).toHaveClass(/is-b/);
    await page.click('#swapBtn');
    await expect(picks.nth(0)).toHaveClass(/is-b/);
    await expect(picks.nth(1)).toHaveClass(/is-a/);
  });

  test('keyboard can move the divider', async ({ page }) => {
    await openAnSes(page);
    await page.locator('#divider').focus();
    const before = Number(await page.locator('#divider').getAttribute('aria-valuenow'));
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    expect(Number(await page.locator('#divider').getAttribute('aria-valuenow'))).toBeLessThan(before);
  });
});

test.describe('views', () => {
  test('Changes shows a plain-language summary and sensitivity changes the result', async ({ page }) => {
    await openAnSes(page);
    await page.click('#modeChangeBtn');
    await expect(page.locator('#changeStats')).toBeVisible();
    await expect(page.locator('#changeStats')).toContainText('of the area changed');
    const area = async () => parseFloat(await page.locator('#changedAreaStat').innerText());
    await page.locator('#changeSensitivity').fill('20'); // low sensitivity: only big changes
    await expect(page.locator('#changeThresholdReadout')).toHaveText('Low');
    const low = await area();
    await page.locator('#changeSensitivity').fill('85'); // high sensitivity: every small change
    await expect(page.locator('#changeThresholdReadout')).toHaveText('High');
    await expect.poll(area).toBeGreaterThan(low);
  });

  test('every view renders without errors', async ({ page }) => {
    const watcher = await watchPage(page);
    await openAnSes(page);
    for (const id of ['modeGridBtn', 'modeOverlayBtn', 'modeSequenceBtn', 'modeChangeBtn', 'modeSliderBtn']) {
      await page.click('#' + id);
      await page.waitForTimeout(250);
    }
    await expectNoProblems(page, watcher);
  });

  test('Play toggles between Play and Pause', async ({ page }) => {
    await openAnSes(page);
    await page.click('#modeSequenceBtn');
    await expect(page.locator('#playSeqLabel')).toHaveText('Play');
    await page.click('#playSeqBtn');
    await expect(page.locator('#playSeqLabel')).toHaveText('Pause');
    await page.click('#playSeqBtn');
    await expect(page.locator('#playSeqLabel')).toHaveText('Play');
  });
});

test.describe('photos', () => {
  test('uploaded photos appear, can be removed and the removal can be undone', async ({ page }) => {
    await page.goto('/');
    const png1 = await makePng(page, '#336699');
    const buf = Buffer.from(png1.split(',')[1], 'base64');
    await page.setInputFiles('#fileInput', [{ name: 'scene_2024-05-01.png', mimeType: 'image/png', buffer: buf }, { name: 'scene_2025-05-01.png', mimeType: 'image/png', buffer: buf }]);
    await expect(page.locator('#imageList .img-row')).toHaveCount(2);
    await expect(page.locator('#leftLabelTag')).toHaveText('2024-05-01');
    await openDrawer(page);
    await page.locator('#imageList [data-act=del]').first().click();
    await expect(page.locator('#imageList .img-row')).toHaveCount(1);
    await page.locator('.toast-action', { hasText: 'Undo' }).click();
    await expect(page.locator('#imageList .img-row')).toHaveCount(2);
  });

  test('unsupported files are skipped with a message', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles('#fileInput', [{ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') }]);
    await expect(page.locator('.toast-error')).toBeVisible();
    await expect(page.locator('#imageList .img-row')).toHaveCount(0);
  });

  test('the project is autosaved and offered under Continue', async ({ page }) => {
    await page.goto('/');
    const png = await makePng(page, '#aa5533');
    await loadProject(page, { version: 1, caption: 'My project', images: [{ id: 1, src: png, label: 'a' }, { id: 2, src: png, label: 'b' }] });
    await expect(page.locator('#imageList .img-row')).toHaveCount(2);
    await page.waitForTimeout(1600);
    await page.reload();
    await expect(page.locator('#continueSection')).toBeVisible();
    await expect(page.locator('#continueTitle')).toHaveText('My project');
    await page.click('#continueCard');
    await expect(page.locator('#imageList .img-row')).toHaveCount(2);
  });
});

test.describe('language', () => {
  test('switches to Khmer and back, and remembers the choice', async ({ page }) => {
    await page.goto('/');
    await page.click('#langBtn');
    await expect(page.locator('html')).toHaveAttribute('lang', 'km');
    await expect(page.locator('#modeSliderBtn .mode-lbl')).toHaveText('ប្រៀបធៀប');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'km');
    await page.click('#langBtn');
    await expect(page.locator('#modeSliderBtn .mode-lbl')).toHaveText('Compare');
  });
});

test.describe('theme', () => {
  test('dark and light themes both keep text readable', async ({ page }) => {
    await page.goto('/');
    const lum = (rgb) => { const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    for (const theme of ['dark', 'light']) {
      await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : ''); if (t !== 'light') document.documentElement.removeAttribute('data-theme'); }, theme);
      for (const sel of ['#startTitle', '.start-sub', '.privacy-note']) {
        const [fg, bg] = await page.$eval(sel, (el) => [getComputedStyle(el).color, getComputedStyle(document.body).backgroundColor]);
        expect(ratio(fg, bg), `${theme} ${sel}`).toBeGreaterThan(4.5);
      }
    }
  });
});

test.describe('full screen', () => {
  test('hides the app chrome so the photos fill the screen, and comes back', async ({ page }) => {
    await openAnSes(page);
    const stage = page.locator('#sliderStage');
    const before = await stage.boundingBox();
    await page.click('#moreBtn');
    await page.click('#immersiveBtn');
    await expect(page.locator('.topbar')).toBeHidden();
    await expect(page.locator('#dock')).toBeHidden();
    await expect(page.locator('#immersiveExit')).toBeVisible();
    await expect.poll(async () => (await stage.boundingBox()).height).toBeGreaterThan(before.height + 40);
    const left = await page.locator('#leftLabelTag').boundingBox();
    const right = await page.locator('#rightLabelTag').boundingBox();
    const exit = await page.locator('#immersiveExit').boundingBox();
    expect(left.x + left.width).toBeLessThanOrEqual(right.x); // labels do not overlap each other
    expect(right.x + right.width).toBeLessThanOrEqual(exit.x); // nor the exit button
    const box = exit;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await page.click('#immersiveExit');
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('#immersiveExit')).toBeHidden();
    await page.click('#moreBtn');
    await page.click('#immersiveBtn');
    await page.keyboard.press('Escape');
    await expect(page.locator('.topbar')).toBeVisible();
  });
});
