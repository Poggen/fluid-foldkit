import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    maxWorkers: Number(process.env.VITEST_MAX_WORKERS ?? 1),
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
  },
})
