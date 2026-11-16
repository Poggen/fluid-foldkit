import { checkedDependencyPatch } from './policy/dependency-patch-policy.ts'
import { checkedTailwindStyles } from './policy/tailwind-check.ts'
import { checkedScopedViewOverrides } from './policy/scoped-view-policy.ts'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { root, families } from './registry/config.ts'
import { moduleReferences } from './registry/graph.ts'

checkedDependencyPatch(root)
checkedScopedViewOverrides()
checkedTailwindStyles(root)
const failures: string[] = []
const check = (valid: boolean, message: string) => {
  if (!valid) failures.push(message)
}
const rootManifest = readFileSync(path.join(root, 'package.json'), 'utf8')
check(rootManifest.includes('"packageManager": "bun@1.4.2"'), 'Use the pinned Bun package manager')
check(!existsSync(path.join(root, 'pnpm-lock.yaml')), 'Bun owns the workspace lockfile')
check(
  rootManifest.includes('"@yielded/effect-tsrs": "0.2.3"') &&
    rootManifest.includes('"tsrs": "0.20.1-ts7.1.0-beta"'),
  'Keep the qualified native Effect and TypeScript checkers',
)
check(rootManifest.includes('"@effect/tsgo": "0.67.0"'), 'Keep the qualified Effect lint toolchain')
const walk = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(path.join(directory, entry.name))
      : [path.join(directory, entry.name)],
  )
for (const directory of [
  ...families.map((family) => path.join(root, 'registry', family, 'src')),
  path.join(root, 'app/src'),
]) {
  for (const file of walk(directory)) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts') || file.endsWith('.bun-fixture.ts'))
      continue
    const text = readFileSync(file, 'utf8')
    check(
      !text.includes('/Users/') && !text.includes('.codex/orchestrate'),
      `Machine-specific path: ${path.relative(root, file)}`,
    )
    for (const reference of moduleReferences(file, text)) {
      check(
        !/^(?:react|react-dom|@radix-ui\/react-|@base-ui\/react)(?:$|\/)/u.test(reference.value),
        `React runtime import: ${file}: ${reference.value}`,
      )
      check(
        !/(?:node_modules\/|foldkit\/src\/|effect\/src\/|\.patch$)/u.test(reference.value),
        `Private SDK import: ${file}: ${reference.value}`,
      )
      check(
        !file.includes('/registry/') || !reference.value.includes('app/'),
        `Library imports application: ${file}: ${reference.value}`,
      )
    }
  }
}
if (failures.length) throw new Error(failures.join('\n'))
console.log('Native library, dependency and portability boundaries pass')
