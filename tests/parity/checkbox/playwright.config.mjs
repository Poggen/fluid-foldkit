import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../..', import.meta.url))
export default {
  testDir: `${root}/app/test`,
  testMatch: ['checkbox-state-parity.e2e.ts', 'checkbox-fixture.parity.ts'],
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5741', headless: true, channel: 'chrome' },
  webServer: [
    {
      command: 'bun run start',
      cwd: `${root}/app`,
      wait: { stdout: /Listening on http:\/\/.*:5741/u },
      env: { PORT: '5741', ORIGIN: 'http://127.0.0.1:5741' },
    },
    {
      command:
        'bunx --no-install vite preview tests/parity/checkbox --config tests/parity/checkbox/vite.config.mjs',
      cwd: root,
      url: 'http://127.0.0.1:5742',
    },
  ],
}
