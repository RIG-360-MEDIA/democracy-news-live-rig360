// Playwright E2E (DNL program P05 T5). Runs against E2E_BASE_URL (default: a local `next start` on
// :3313 pointed at the box dev DB). Test accounts come from .env.test.local (never committed).
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3313',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
