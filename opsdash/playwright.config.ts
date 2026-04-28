import { defineConfig } from '@playwright/test'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8093'
const username = process.env.PLAYWRIGHT_USER ?? 'admin'
const password = process.env.PLAYWRIGHT_PASS ?? 'admin'

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  use: {
    baseURL: baseUrl,
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      chromiumSandbox: false,
    },
    extraHTTPHeaders: {
      Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      'OCS-APIREQUEST': 'true',
    },
    video: 'off',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  timeout: 120000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
})
