import path from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import {
  baselineRoot,
  sourceRoot,
  materializeSource,
  workspaceRoot,
} from './source-baseline/source-reference.mjs'

const source = materializeSource()
const originalShowcase = path.join(sourceRoot, 'showcase')
const originalUi = path.join(originalShowcase, 'repos/bklit-ui/packages/ui/src')
const requireOriginal = createRequire(path.join(originalShowcase, 'package.json'))
export default {
  root: baselineRoot,
  publicDir: path.resolve(baselineRoot, '../public'),
  cacheDir: path.join(
    baselineRoot,
    `node_modules/.vite-original-${createHash('sha256').update(baselineRoot).digest('hex').slice(0, 12)}`,
  ),
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: '@charts-source', replacement: source },
      { find: '@original-charts', replacement: path.join(originalUi, 'charts') },
      {
        find: '@original-motion',
        replacement: path.resolve(
          path.dirname(requireOriginal.resolve('motion/package.json')),
          requireOriginal('motion/package.json').exports['./react'].import,
        ),
      },
      { find: '@original-globals', replacement: path.join(originalShowcase, 'app/globals.css') },
      { find: '@/lib/utils', replacement: path.join(originalUi, 'lib/utils.ts') },
    ],
  },
  css: {
    postcss: { plugins: [requireOriginal('@tailwindcss/postcss')({ base: originalShowcase })] },
  },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        [
          'index',
          'line-area',
          'area-control',
          'brush',
          'cartesian-control',
          'bar',
          'tooltip-box',
          'composed',
          'candlestick',
          'scatter',
          'pie-ring',
          'radar-funnel',
          'hierarchy-geo',
          'stat-flow',
        ].map((name) => [name, path.join(baselineRoot, `${name}.html`)]),
      ),
    },
  },
  server: { fs: { allow: [workspaceRoot, originalShowcase, path.resolve(source, '..')] } },
}
