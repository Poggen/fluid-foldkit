import { defineConfig } from 'vite'
import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/postcss'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  plugins: [foldkit({ devToolsMcpPort: false })],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
})
