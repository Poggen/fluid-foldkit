import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/postcss'
import { defineConfig } from 'vite'
import { browserBoundary } from './build-boundary.js'

export default defineConfig({
  plugins: [
    browserBoundary,
    foldkit({
      ssr: { clientEntry: '/src/entry.ts', serverEntry: '/src/entry.server.ts', build: true },
    }),
  ],
  css: { postcss: { plugins: [tailwindcss()] } },
  ssr: { noExternal: true },
  resolve: { dedupe: ['effect', '@effect/platform-browser', 'foldkit', '@foldkit/ui'] },
  publicDir: '../public',
  server: { port: 5280, strictPort: true },
})
