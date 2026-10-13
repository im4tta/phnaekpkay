/* Characterisation suite: the user-visible flows that cross several modules. It passed on the
   single-file app before it was split into modules and must keep passing after any refactor. */
import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { watchPage, expectNoProblems, openAnSes, openDrawer, loadProject, makePng } from './helpers.js';

const press = (page, id) => page.evaluate((i) => document.getElementById(i).click(), id);

async function download(page, id) {
  const [file] = await Promise.all([page.waitForEvent('download'), press(page, id)]);
  return { name: file.suggestedFilename(), bytes: await fs.readFile(await file.path()) };
}

const PNG_MAGIC = '89504e470d0a1a0a';

test.describe('flows', () => {
  test('Save image produces a real PNG in every view that can be exported', async ({ page }) => {
    const watcher = await watchPage(page);
    await openAnSes(page);
    for (const [button, stage] of [['modeSliderBtn', '#sliderStage'], ['modeOverlayBtn', '#overlayStage'], ['modeGridBtn', '#gridStage'], ['modeChangeBtn', '#changeStage']]) {
      await press(page, button);
      await expect(page.locator(stage)).toBeVisible();
      const file = await download(page, 'exportBtn');
      expect(file.name, button).toMatch(/\.png$/);
      expect(file.bytes.subarray(0, 8).toString('hex'), button).toBe(PNG_MAGIC);
      expect(file.bytes.length, button).toBeGreaterThan(3000);
    }
    await expectNoProblems(page, watcher);
  });

  test('a project survives Save → fresh page → Load', async ({ page }) => {
    const watcher = await watchPage(page);
    await openAnSes(page);
    await openDrawer(page);
    await page.click('#addTabPhotos').catch(() => {});
    await page.locator('#captionInput').fill('Flow test caption');
    await page.locator('#notesInput').fill('Notes that must come back');
    await press(page, 'modeOverlayBtn');
    const file = await download(page, 'saveProjectBtn');
    expect(file.name).toMatch(/\.json$/);
    const saved = JSON.parse(file.bytes.toString('utf8'));
    expect(saved.images).toHaveLength(2);
    expect(saved.mode).toBe('overlay');
    expect(JSON.stringify(saved)).not.toMatch(/mapboxToken|sentinelId|placesApiKey/);

    await page.goto('/');
    await loadProject(page, saved);
    await expect(page.locator('#imageList .img-row')).toHaveCount(2);
    await expect(page.locator('#captionInput')).toHaveValue('Flow test caption');
    await expect(page.locator('#notesInput')).toHaveValue('Notes that must come back');
    await expect(page.locator('#sliderStage')).toBeVisible();
    await expectNoProblems(page, watcher);
  });

  test('drawing on the view leaves ink, and Clear removes it', async ({ page }) => {
    await openAnSes(page);
    await press(page, 'drawToggleBtn');
    const canvas = page.locator('#annotationCanvas');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4, { steps: 8 });
    await page.mouse.up();
    const ink = () => page.evaluate(() => {
      const c = document.getElementById('annotationCanvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
      return n;
    });
    expect(await ink()).toBeGreaterThan(50);
    await press(page, 'clearDrawingBtn');
    expect(await ink()).toBe(0);
  });

  test('renaming a frame sticks, and adding a third photo grows the list', async ({ page }) => {
    const watcher = await watchPage(page);
    await openAnSes(page);
    await openDrawer(page);
    const first = page.locator('#imageList .img-row input[type=text]').first();
    await first.fill('Renamed frame');
    await press(page, 'modeGridBtn');
    await press(page, 'modeSliderBtn');
    await expect(page.locator('#imageList .img-row input[type=text]').first()).toHaveValue('Renamed frame');
    const png = Buffer.from((await makePng(page, '#3a6b2f')).split(',')[1], 'base64');
    await page.setInputFiles('#fileInput', { name: 'third_2024-05-01.png', mimeType: 'image/png', buffer: png });
    await expect(page.locator('#imageList .img-row')).toHaveCount(3);
    await expectNoProblems(page, watcher);
  });

  test('All view: the column choice changes the layout (desktop)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'phones cap the column count');
    await openAnSes(page);
    const png = Buffer.from((await makePng(page, '#3a6b2f')).split(',')[1], 'base64');
    await page.setInputFiles('#fileInput', { name: 'third.png', mimeType: 'image/png', buffer: png });
    await expect(page.locator('#imageList .img-row')).toHaveCount(3);
    await press(page, 'modeGridBtn');
    const columns = () => page.locator('#gridStage').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    await page.locator('#colsSelect [data-cols="3"]').click();
    await expect.poll(columns).toBe(3);
    await page.locator('#colsSelect [data-cols="2"]').click();
    await expect.poll(columns).toBe(2);
  });

  test('zoom, reset and the blend density control update their readouts', async ({ page }) => {
    const watcher = await watchPage(page);
    await openAnSes(page);
    await page.evaluate(() => { const r = document.getElementById('zoomRange'); r.value = '2'; r.dispatchEvent(new Event('input', { bubbles: true })); });
    await expect(page.locator('#zoomReadout')).toHaveText('2.00x');
    await press(page, 'resetViewBtn');
    await expect(page.locator('#zoomReadout')).toHaveText('1.00x');
    await press(page, 'modeOverlayBtn');
    await page.evaluate(() => { const r = document.getElementById('densityRange'); r.value = '80'; r.dispatchEvent(new Event('input', { bubbles: true })); });
    await expect(page.locator('#densityReadout')).toHaveText('80%');
    await expectNoProblems(page, watcher);
  });

  test('Changes: switching the comparison method re-renders without errors', async ({ page }) => {
    const watcher = await watchPage(page);
    await openAnSes(page);
    await press(page, 'modeChangeBtn');
    await expect(page.locator('#changeStats')).toBeVisible();
    for (const method of ['luma', 'ndvi', 'rgb']) {
      await page.evaluate((m) => document.querySelector(`#changeMethodChips [data-method="${m}"]`).click(), method);
      await expect(page.locator(`#changeMethodChips [data-method="${method}"]`)).toHaveClass(/active/);
      await expect(page.locator('#changedAreaStat')).not.toHaveText('--');
    }
    await expectNoProblems(page, watcher);
  });

  test('"See all" lists the field sites and opening one loads it', async ({ page }) => {
    const watcher = await watchPage(page);
    await page.goto('/');
    await page.click('#startSeeAllBtn');
    await expect(page.locator('#locationsModal')).toBeVisible();
    await expect(page.locator('#locationsGrid .site-card, #locationsGrid button').first()).toBeVisible();
    await page.click('#locationsCloseBtn');
    await expect(page.locator('#locationsModal')).toBeHidden();
    await page.click('#startSeeAllBtn');
    await page.locator('#locationsGrid .locations-card', { has: page.getByRole('heading', { name: 'An Ses' }) }).locator('.locations-open').click();
    await expect(page.locator('#imageList .img-row')).toHaveCount(2);
    await expect(page).toHaveURL(/\/p\/14\.388783,104\.965518$/);
    await expectNoProblems(page, watcher);
  });

  test('the report is a standalone HTML file', async ({ page }) => {
    await openAnSes(page);
    const file = await download(page, 'exportReportBtn');
    expect(file.name).toBe('phnaek-pkay-report.html');
    const html = file.bytes.toString('utf8');
    expect(html).toContain('<title>Phnaek Pkay report</title>');
    expect(html).not.toMatch(/<script/i);
  });
});
