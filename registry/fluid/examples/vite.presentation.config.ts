import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/postcss'
import { foldkit } from '@foldkit/vite-plugin'
export default defineConfig({
  plugins: [
    foldkit(),
    {
      name: 'presentation-native-runtime-audit',
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
        if (forbidden.length > 0) this.error(`Non-native runtime modules: ${forbidden.join(', ')}`)
        this.emitFile({
          type: 'asset',
          fileName: 'native-runtime-audit.json',
          source: JSON.stringify(
            { moduleCount: modules.length, forbiddenRuntimeModules: forbidden, modules },
            null,
            2,
          ),
        })
      },
    },
  ],
  server: { host: '127.0.0.1', port: 4531, strictPort: true },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    outDir: process.env.FLUID_PRESENTATION_OUT_DIR ?? 'dist/presentation',
    rollupOptions: { input: ['presentation.html', 'presentation-hydration.html'] },
  },
})
