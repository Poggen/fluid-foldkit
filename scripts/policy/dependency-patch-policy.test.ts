import { expect, test } from 'bun:test'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { checkedDependencyPatch } from './dependency-patch-policy.ts'

const repository = path.resolve(import.meta.dirname, '../..')
const version = '0.170.0-canary.54f8bcd443b4'
const dependency = `foldkit@${version}`
const patch = `patches/${dependency}.patch`
const runtimeFiles = [
  'node_modules/foldkit/dist/runtime/compositionRuntime.js',
  'node_modules/foldkit/dist/runtime/subscriptionFibers.js',
]
const makeFixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'foldkit-patch-policy-'))
  for (const file of [patch, ...runtimeFiles]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    copyFileSync(path.join(repository, file), path.join(root, file))
  }
  writeFileSync(path.join(root, 'node_modules/foldkit/package.json'), JSON.stringify({ version }))
  return root
}
type Manifest = {
  dependencies: { foldkit: string }
  patchedDependencies?: Record<string, string>
}
type Case = {
  name: string
  mutate?: (root: string, manifest: Manifest) => void
  error?: RegExp
}
const cases: readonly Case[] = [
  { name: 'accepts the reviewed patch and installed SDK bytes' },
  {
    name: 'rejects missing patch enrollment',
    mutate: (_root, manifest) => {
      delete manifest.patchedDependencies
    },
    error: /patchedDependencies/u,
  },
  {
    name: 'rejects an extra dependency patch',
    mutate: (_root, manifest) => {
      manifest.patchedDependencies = { [dependency]: patch, 'effect@4.1.2': 'patches/effect.patch' }
    },
    error: /patchedDependencies/u,
  },
  {
    name: 'rejects a different patch path',
    mutate: (_root, manifest) => {
      manifest.patchedDependencies = { [dependency]: '../other.patch' }
    },
    error: /patchedDependencies/u,
  },
  {
    name: 'rejects a patch enrolled for another SDK version',
    mutate: (_root, manifest) => {
      manifest.patchedDependencies = { 'foldkit@0.171.0': patch }
    },
    error: /patchedDependencies/u,
  },
  {
    name: 'rejects SDK dependency upgrades until the patch is reviewed',
    mutate: (_root, manifest) => {
      manifest.dependencies.foldkit = '0.171.0'
    },
    error: /reviewed SDK version/u,
  },
  {
    name: 'rejects a missing patches directory',
    mutate: (root) => {
      rmSync(path.join(root, 'patches'), { recursive: true })
    },
    error: /ENOENT.*patches/u,
  },
  {
    name: 'rejects a missing reviewed patch file',
    mutate: (root) => {
      rmSync(path.join(root, patch))
    },
    error: /only the reviewed Foldkit patch file/u,
  },
  {
    name: 'rejects additional files in the patches directory',
    mutate: (root) => {
      writeFileSync(path.join(root, 'patches/other.patch'), '')
    },
    error: /only the reviewed Foldkit patch file/u,
  },
  {
    name: 'rejects an unreviewed patch edit',
    mutate: (root) => {
      writeFileSync(path.join(root, patch), 'unreviewed diff')
    },
    error: /patch bytes differ/u,
  },
  {
    name: 'rejects an installed SDK upgrade even with the root manifest pinned',
    mutate: (root) => {
      writeFileSync(
        path.join(root, 'node_modules/foldkit/package.json'),
        JSON.stringify({ version: '0.171.0' }),
      )
    },
    error: /installed Foldkit SDK version/u,
  },
  ...runtimeFiles.flatMap(
    (file) =>
      [
        {
          name: `rejects unapplied or modified ${path.basename(file)}`,
          mutate: (root) => {
            writeFileSync(path.join(root, file), 'export {}')
          },
          error: /does not match the reviewed patch/u,
        },
        {
          name: `rejects missing ${path.basename(file)}`,
          mutate: (root) => {
            rmSync(path.join(root, file))
          },
          error: /ENOENT.*runtime/u,
        },
      ] satisfies readonly Case[],
  ),
]

for (const scenario of cases) {
  test(scenario.name, () => {
    const root = makeFixture()
    try {
      const manifest: Manifest = {
        dependencies: { foldkit: version },
        patchedDependencies: { [dependency]: patch },
      }
      scenario.mutate?.(root, manifest)
      writeFileSync(path.join(root, 'package.json'), JSON.stringify(manifest))
      if (scenario.error === undefined) expect(() => checkedDependencyPatch(root)).not.toThrow()
      else expect(() => checkedDependencyPatch(root)).toThrow(scenario.error)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
}
