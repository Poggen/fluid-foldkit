import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/postcss'
import { foldkit } from '@foldkit/vite-plugin'
export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../../receipts/fluid-color-scroll-complete/vite-native-cache',
  publicDir: '../public',
  plugins: [
    foldkit(),
    {
      name: 'native-audit',
      generateBundle(_opts, bundle) {
        const modules = [
          ...new Set(
            Object.values(bundle).flatMap((output) =>
              output.type === 'chunk' ? Object.keys(output.modules) : [],
            ),
          ),
        ]
        const forbidden = modules.filter((id) =>
          /\/(?:react|react-dom|framer-motion)(?:\/|@)/.test(id),
        )
        if (forbidden.length) this.error(`Non-native modules: ${forbidden.join(',')}`)
        this.emitFile({
          type: 'asset',
          fileName: 'native-audit.json',
          source: JSON.stringify({ count: modules.length, forbidden, modules }),
        })
      },
    },
  ],
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { host: '127.0.0.1', port: 4561, strictPort: true, fs: { allow: ['../../../..'] } },
  build: {
    outDir: '../../../receipts/fluid-color-scroll-completion/native-build',
    emptyOutDir: true,
  },
})
