import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/postcss'
const upstream = process.env.FLUID_SOURCE_ROOT
if (!upstream)
  throw new Error(
    'Set FLUID_SOURCE_ROOT to the pinned original Fluid checkout for source comparisons',
  )
export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../../../receipts/fluid-color-scroll-complete/vite-source-cache',
  publicDir: upstream + '/public',
  resolve: {
    alias: [
      { find: '@', replacement: upstream },
      { find: /^react$/, replacement: upstream + '/node_modules/react/index.js' },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: upstream + '/node_modules/react/jsx-dev-runtime.js',
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: upstream + '/node_modules/react/jsx-runtime.js',
      },
      { find: /^react-dom\/client$/, replacement: upstream + '/node_modules/react-dom/client.js' },
    ],
  },
  esbuild: { jsx: 'automatic' },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: {
    host: '127.0.0.1',
    port: 4562,
    strictPort: true,
    fs: { allow: [upstream, new URL('../../../../../', import.meta.url).pathname] },
  },
})
