import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    css: { include: [/\/src\/styles\/thinking-indicator\.css(?:\?.*)?$/] },
    maxWorkers: Number(process.env.VITEST_MAX_WORKERS ?? 1),
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.bun-fixture.ts'],
    testTimeout: 30000,
  },
})
