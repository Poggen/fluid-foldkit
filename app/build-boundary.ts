import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
export const browserBoundary: Plugin = {
  name: 'native-showcase-browser-boundary',
  generateBundle() {
    if (this.environment.name !== 'client') return
    this.emitFile({
      type: 'asset',
      fileName: 'NOTICE.txt',
      source: readFileSync(new URL('../NOTICE', import.meta.url), 'utf8'),
    })
    const modules = [...this.getModuleIds()]
    const effectRoots = new Set<string>()
    for (const id of modules) {
      if (
        /\/(?:react|react-dom|framer-motion)(?:\/|@)/u.test(id) ||
        id.includes('/@base-ui/react/') ||
        id.includes('/@radix-ui/react-')
      )
        this.error(`Non-native runtime entered the browser: ${id}`)
      if (id.includes('/app/server/') || id.endsWith('/entry.server.ts'))
        this.error(`Server implementation entered the browser: ${id}`)
      const marker = '/node_modules/effect/'
      if (id.includes(marker)) effectRoots.add(id.slice(0, id.indexOf(marker)) + marker)
    }
    if (effectRoots.size !== 1)
      this.error(`Expected one browser Effect runtime, received ${effectRoots.size}`)
    this.emitFile({
      type: 'asset',
      fileName: 'native-runtime-audit.json',
      source: JSON.stringify(
        { moduleCount: modules.length, effectRoots: [...effectRoots], forbiddenRuntimeModules: [] },
        null,
        2,
      ),
    })
  },
}
