import { defineConfig } from '@playwright/test'

// End-to-end (browser) tests. They drive the real web app against the real API and database, so
// before running: start MongoDB, seed it (`cd apps/api && npm run db:reset`), then start the API
// (http://localhost:3000) and the web app (http://localhost:5173). See tests/e2e/README.md.
//
// Uses an installed browser (Edge by default) so no browser download is needed. Override with
// PLAYWRIGHT_CHANNEL=chrome, or set PLAYWRIGHT_CHANNEL= (empty) after `npx playwright install chromium`.
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(channel ? { channel } : {}),
  },
  outputDir: 'test-results',
})
