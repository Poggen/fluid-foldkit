import sdkPatch from '../../registry/ramka/sdk/foldkit-ramka-54f8.json' with { type: 'json' }
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import {
  families,
  namespaces,
  root,
  outputRoot,
  release,
  origin,
  manifest,
  itemName,
  registryUrl,
} from './config.ts'
import { upstreams } from '../../lib/registry-families.ts'
import { buildReferences } from './reference.ts'
import { closure, dependencies, installedPath, installedContent } from './graph.ts'

export interface RegistryFile {
  readonly path: string
  readonly type: 'registry:file'
  readonly target: string
  readonly content: string
}
export interface RegistryItem {
  readonly $schema: string
  readonly name: string
  readonly type: 'registry:item'
  readonly title: string
  readonly description: string
  readonly registryDependencies: readonly string[]
  readonly dependencies: readonly string[]
  readonly files: readonly RegistryFile[]
  readonly docs?: string
  readonly meta: { readonly framework: string; readonly release: string; readonly upstream: string }
}
const write = (file: string, value: object) => {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}
export const buildRegistries = () => {
  const receipts: { family: string; item: string; files: number; sha256: string }[] = []
  for (const family of families) {
    const source = manifest(family)
    const output = path.join(outputRoot, 'r', family, release)
    const style = source.exports['./styles.css']
    if (!style) throw new Error(`${family} has no stylesheet export`)
    const styleGraph = closure(family, style)
    const foundation: RegistryFile[] = [...styleGraph.files].map(([file, content]) => ({
      path: path.relative(root, file),
      type: 'registry:file',
      target: installedPath(family, file),
      content,
    }))
    foundation.push({
      path: 'NOTICE',
      type: 'registry:file',
      target: `@ui/${family}/NOTICE`,
      content: readFileSync(path.join(root, 'NOTICE'), 'utf8'),
    })
    const items: RegistryItem[] = [
      {
        $schema: 'https://ui.shadcn.com/schema/registry-item.json',
        name: 'foundation',
        type: 'registry:item',
        title: `${family} styles and notices`,
        description: 'Shared stylesheet contract and original redistribution notices.',
        registryDependencies: [],
        dependencies: [],
        files: foundation,
        ...(family === 'ramka'
          ? {
              docs: 'Required SDK setup after source installation: bun scripts/install-ramka-sdk.mjs. This applies and verifies the bundled exact Foldkit patch; then import your installed ramka/parts.css and provide defaultEnvironmentLayer at the Program boundary.',
            }
          : {}),
        meta: {
          framework: 'foldkit',
          release,
          upstream: upstreams[family],
        },
      },
    ]
    if (family === 'ramka') {
      for (const [file, target] of [
        ['foldkit-ramka-54f8.patch', sdkPatch.target],
        ['foldkit-ramka-54f8.json', 'patches/foldkit-ramka-54f8.json'],
        ['install-ramka-sdk.mjs', 'scripts/install-ramka-sdk.mjs'],
        ['FOLDKIT-LICENSE', 'patches/foldkit-ramka-54f8.LICENSE'],
      ]) {
        if (file === undefined || target === undefined)
          throw new Error('Missing SDK patch distribution path')
        foundation.push({
          path: `registry/ramka/sdk/${file}`,
          type: 'registry:file',
          target: `~/${target}`,
          content: readFileSync(path.join(root, 'registry/ramka/sdk', file), 'utf8'),
        })
      }
      for (const notice of ['LICENSE', 'THIRD-PARTY-NOTICES.md', 'upstream-manifest.json']) {
        foundation.push({
          path: `registry/${family}/${notice}`,
          type: 'registry:file',
          target: `@ui/${family}/${notice}`,
          content: readFileSync(path.join(root, 'registry', family, notice), 'utf8'),
        })
      }
    }
    const names = new Map([['foundation', style]])
    for (const [entry, location] of Object.entries(source.exports)) {
      if (entry === './styles.css') continue
      const name = itemName(entry)
      if (names.get(name) === location) continue
      if (names.has(name)) throw new Error(`Duplicate registry item ${family}/${name}`)
      names.set(name, location)
      const graph = closure(family, location)
      const files: RegistryFile[] = [...graph.files]
        .filter(([file]) => !styleGraph.files.has(file))
        .map(([file, content]) => ({
          path: path.relative(root, file),
          type: 'registry:file',
          target: installedPath(family, file),
          content: installedContent(family, file, content),
        }))
      items.push({
        $schema: 'https://ui.shadcn.com/schema/registry-item.json',
        name,
        type: 'registry:item',
        title: `${family}: ${name}`,
        description: `Native Foldkit source for ${source.name}${entry === '.' ? '' : '/' + entry.slice(2)}. Requires the documented compatible Foldkit and Effect versions.`,
        registryDependencies: [registryUrl(family, 'foundation')],
        dependencies: dependencies(family, graph.external),
        files,
        meta: { framework: 'foldkit', release, upstream: items[0]?.meta.upstream ?? '' },
      })
    }
    for (const item of items) {
      write(path.join(output, item.name + '.json'), item)
      receipts.push({
        family,
        item: item.name,
        files: item.files.length,
        sha256: createHash('sha256').update(JSON.stringify(item)).digest('hex'),
      })
    }
    const catalogue = {
      $schema: 'https://ui.shadcn.com/schema/registry.json',
      name: namespaces[family].slice(1),
      homepage: origin,
      items: items.map(({ files, ...item }) => ({
        ...item,
        files: files.map(({ content: _content, ...file }) => file),
      })),
    }
    write(path.join(output, 'registry.json'), catalogue)
    write(path.join(outputRoot, 'r', family, 'registry.json'), catalogue)
    console.log(`${namespaces[family]}: ${items.length} items at /r/${family}/${release}/`)
  }
  write(path.join(outputRoot, 'registry-receipt.json'), {
    release,
    framework: { foldkit: '0.170.0-canary.54f8bcd443b4', effect: '4.1.2' },
    items: receipts,
  })
  buildReferences()
  return receipts
}
if (import.meta.main) buildRegistries()
