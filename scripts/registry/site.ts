import { cpSync, mkdirSync, existsSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { families, root, origin } from './config.ts'

for (const family of families) {
  const directory = path.join(root, 'registry', family, 'examples')
  const result = Bun.spawnSync(['bunx', '--no-install', 'vite', 'build', '--base', `/${family}/`], {
    cwd: directory,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (result.exitCode !== 0) throw new Error(`${family} showcase build failed`)
  mkdirSync(path.join(root, 'public', family), { recursive: true })
  cpSync(path.join(directory, 'dist'), path.join(root, 'public', family), { recursive: true })
}
cpSync(path.join(root, 'app/src/assets/favicon.ico'), path.join(root, 'public/favicon.ico'))
const oldIndex = path.join(root, 'public/index.html')
if (existsSync(oldIndex)) unlinkSync(oldIndex)
const result = Bun.spawnSync(['bun', 'run', '--cwd', 'app', 'build'], {
  cwd: root,
  stdout: 'inherit',
  stderr: 'inherit',
})
if (result.exitCode !== 0) throw new Error('SSR showcase build failed')
console.log(`SSR showcase and ${families.length} registries ready at ${origin}`)
