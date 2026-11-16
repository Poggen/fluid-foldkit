import { defineConfig } from 'vite'
import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/postcss'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  publicDir: fileURLToPath(new URL('../../../registry/fluid/examples/public', import.meta.url)),
  server: {
    proxy: {
      '/source': {
        target: process.env.ACCORDION_SOURCE_ORIGIN ?? 'http://127.0.0.1:4518',
        ws: true,
      },
    },
  },
  plugins: [
    foldkit(),
    {
      name: 'accordion-native-audit',
      generateBundle(_options, bundle) {
        const modules = [
          ...new Set(
            Object.values(bundle).flatMap((output) =>
              output.type === 'chunk' ? Object.keys(output.modules) : [],
            ),
          ),
        ].sort()
        const forbidden = modules.filter((id) =>
          /\/(?:react|react-dom|framer-motion)(?:\/|@)/.test(id),
        )
        if (forbidden.length) this.error('Non-native runtime modules: ' + forbidden.join(', '))
        this.emitFile({
          type: 'asset',
          fileName: 'native-runtime-audit.json',
          source: JSON.stringify({ forbiddenRuntimeModules: forbidden, modules }, null, 2),
        })
      },
    },
  ],
  resolve: {
    alias: {
      tailwindcss: fileURLToPath(import.meta.resolve('tailwindcss/index.css')),
    },
  },
  css: { postcss: { plugins: [tailwindcss()] } },
})
