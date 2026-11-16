import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const aliases = ['fluid', 'charts'].flatMap((name) => {
  const directory = new URL(`../registry/${name}/`, import.meta.url)
  const manifest = JSON.parse(readFileSync(new URL('package.json', directory), 'utf8'))
  return Object.entries(manifest.exports).map(([subpath, target]) => {
    const specifier = `@foldkit-visuals/${name}${subpath === '.' ? '' : subpath.slice(1)}`
    return {
      find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      replacement: fileURLToPath(new URL(String(target), directory)),
    }
  })
})

export default defineConfig({
  resolve: { alias: aliases, dedupe: ['effect', 'foldkit', '@foldkit/ui'] },
  test: {
    maxWorkers: Number(process.env.VITEST_MAX_WORKERS ?? 1),
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
  },
})
