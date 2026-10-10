import { defineConfig, devices } from '@playwright/test';

const port = 4318;
// Locally the sandbox ships a Chromium build; CI installs one with `npx playwright install chromium`.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, launchOptions: { executablePath, args: ['--no-sandbox'] } },
  webServer: { command: `node tools/serve-dist.mjs --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
  projects: [
    { name: 'phone', use: { ...devices['iPhone 14'], defaultBrowserType: 'chromium' } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
});
