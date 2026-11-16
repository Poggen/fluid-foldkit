import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { commandMenuCode } from '../../app/src/playground/configs/command-menu-code.ts'
import { defaults } from '../../app/src/playground/configs/command-menu.ts'
import { manifest, root } from './config.ts'

export const writeCommandMenuConsumers = (directory: string, mode: 'package' | 'registry') => {
  const generated = path.join(directory, 'src/generated-command-menu')
  mkdirSync(generated, { recursive: true })
  const exports = manifest('fluid').exports
  const imports: string[] = []
  const checks: string[] = []
  let index = 0
  for (const tabs of [false, true]) {
    for (const filters of [false, true]) {
      for (const compact of [false, true]) {
        let source = commandMenuCode({
          ...defaults,
          tabs,
          filters,
          appearance: { size: compact ? 'compact' : 'default' },
        })
        if (mode === 'registry') {
          source = source.replace(
            /@foldkit-visuals\/fluid\/([^'"\s]+)/gu,
            (_match, entry: string) => {
              const target = exports[`./${entry}`]
              if (target === undefined || !target.startsWith('./src/'))
                throw new Error(`No registry entry for ${entry}`)
              return `@/ui/fluid/${target.slice('./src/'.length).replace(/\.ts$/u, '.js')}`
            },
          )
        }
        writeFileSync(path.join(generated, `case-${index}.ts`), source)
        imports.push(
          `import { Page as Page${index}, layer as layer${index} } from './case-${index}.js'`,
        )
        checks.push(
          `verify((await Effect.runPromise(renderToString({ block: Page${index}, layer: layer${index} }, {}, { isHydratable: false }))).html, ${tabs}, ${filters}, ${compact})`,
        )
        index += 1
      }
    }
  }
  const driver = path.join(generated, 'verify.ts')
  writeFileSync(
    driver,
    `/// <reference types="node" />
import { strict as assert } from 'node:assert'
import { Effect } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
${imports.join('\n')}
const verify = (html: string, tabs: boolean, filters: boolean, compact: boolean) => {
  assert.equal((html.match(/data-slot="command-menu-tabs"/gu) ?? []).length, tabs ? 1 : 0)
  assert.equal((html.match(/data-slot="command-menu-filters"/gu) ?? []).length, filters ? 1 : 0)
  const controls = html.match(/<button\\b[^>]*role="combobox"[^>]*>/gu) ?? []
  assert.equal(controls.length, filters ? 2 : 0)
  for (const control of controls) {
    assert.match(control, /\\bh-7\\b/u)
    assert.match(control, /\\bpx-2\\.5\\b/u)
    assert.ok(control.includes('--fs-body-compact,12px'))
  }
  if (filters) {
    assert.ok(controls.some((control) => control.includes('aria-label="Filter commands"')))
    assert.ok(controls.some((control) => control.includes('aria-label="Sort commands"')))
    const wrapper = html.match(/<div\\b[^>]*data-slot="command-menu-filters"[^>]*>/u)?.[0]
    assert.ok(wrapper)
    assert.equal(wrapper.includes('flex-wrap'), !tabs)
    if (!tabs) assert.ok(wrapper.includes(compact ? 'px-2 pb-1.5' : 'px-2.5 pb-2'))
  }
}
${checks.join('\n')}
`,
  )
  return { driver, generated, cases: index }
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const verification = path.join(root, '.verification')
  mkdirSync(verification, { recursive: true })
  const directory = mkdtempSync(path.join(verification, 'command-menu-generated-'))
  const packageScope = path.join(directory, 'node_modules/@foldkit-visuals')
  mkdirSync(packageScope, { recursive: true })
  symlinkSync(path.join(root, 'registry/fluid'), path.join(packageScope, 'fluid'), 'dir')
  const { driver } = writeCommandMenuConsumers(directory, 'package')
  writeFileSync(
    path.join(directory, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: path.join(root, 'tsconfig.base.json'),
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
  )
  for (const command of [
    [
      path.join(root, 'node_modules/.bin/tsrs'),
      '--noEmit',
      '-p',
      path.join(directory, 'tsconfig.json'),
    ],
    ['bun', driver],
  ]) {
    const result = Bun.spawnSync(command, { cwd: root, stdout: 'inherit', stderr: 'inherit' })
    if (result.exitCode !== 0)
      throw new Error(`Generated command consumer failed: ${command.join(' ')}`)
  }
}
