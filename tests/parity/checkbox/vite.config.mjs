import { defineConfig } from 'vite'
import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/postcss'
export default defineConfig({
  plugins: [foldkit()],
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { host: '127.0.0.1', port: 5742, strictPort: true },
  preview: { host: '127.0.0.1', port: 5742, strictPort: true },
})
