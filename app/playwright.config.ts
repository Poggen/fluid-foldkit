import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './test',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  outputDir: '../.verification/showcase-results',
  reporter: [['list'], ['json', { outputFile: '../.verification/showcase-tests.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5382',
    viewport: { width: 1440, height: 1000 },
    headless: true,
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'bun run start',
    // Node listens before Effect attaches the request handler. Probe after assembly.
    wait: { stdout: /Listening on http:\/\/.*:5382/u },
    env: { PORT: '5382', ORIGIN: 'http://127.0.0.1:5382' },
    reuseExistingServer: false,
    timeout: 45000,
  },
})
