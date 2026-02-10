import { defineConfig } from '@playwright/test'

/**
 * Playwright E2E test configuration for Chester Business Scorecard.
 *
 * Uses Chromium only for simplicity. Screenshots captured on failure.
 * The dev server is started automatically via webServer config.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  timeout: 30_000,

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
