import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Schema } from 'effect'

const root = path.resolve(import.meta.dirname, '../..')
const Report = Schema.Struct({
  diagnostics: Schema.Array(Schema.Struct({ code: Schema.String })),
})
const probes = [
  ['app/src/probe.ts', 'export let value = 0', 'module-state'],
  ['lib/probe.ts', 'export let value = 0', 'module-state'],
  ['registry/fluid/src/probe.ts', 'export let value = 0', 'module-state'],
  ['registry/charts/src/probe.ts', 'export let value = 0', 'module-state'],
  ['registry/fluid/src/probe.ts', 'export const value = 0', 'valid'],
  ['registry/fluid/examples/src/probe.ts', 'export let value = 0', 'valid'],
  ['registry/charts/examples/src/probe.ts', 'export let value = 0', 'valid'],
  ['registry/fluid/src/probe.ts', "export * from 'node:fs'", 'server'],
  ['registry/charts/examples/src/probe.ts', "export * from 'node:fs'", 'server'],
  ['registry/charts/src/probe.ts', "export * from 'foldkit/experimental/server'", 'valid'],
  ['registry/fluid/src/probe.ts', "export * from '../../../app/src/application'", 'application'],
  ['registry/charts/src/probe.ts', "export * from '@foldkit-visuals/showcase'", 'application'],
] as const

const codes = {
  'module-state': 'rat-stack-patterns(no-module-level-mutable-state)',
  server: 'rat-stack-boundaries(no-browser-server-imports)',
  application: 'rat-stack-boundaries(no-cross-layer-imports)',
}

test('source boundaries enforce the relocated runtime scopes through Oxlint', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foldkit-source-boundaries-'))
  const files: string[] = []
  try {
    const config = path.join(directory, 'oxlint.json')
    writeFileSync(
      config,
      JSON.stringify({
        categories: { correctness: 'off' },
        jsPlugins: [
          { name: 'rat-stack-patterns', specifier: path.join(root, 'scripts/lint/patterns.ts') },
          {
            name: 'rat-stack-boundaries',
            specifier: path.join(root, 'scripts/lint/boundaries.ts'),
          },
        ],
        rules: {
          'rat-stack-patterns/no-module-level-mutable-state': 'error',
          'rat-stack-boundaries/no-browser-server-imports': 'error',
          'rat-stack-boundaries/no-cross-layer-imports': 'error',
        },
      }),
    )
    for (const [file, source, expected] of probes) {
      const fixture = path.join(
        root,
        path.dirname(file),
        `.__${path.basename(directory)}-${files.length}.ts`,
      )
      files.push(fixture)
      writeFileSync(fixture, source)
      const result = Bun.spawnSync(
        [
          path.join(root, 'node_modules/.bin/oxlint'),
          '--config',
          config,
          '--format',
          'json',
          '--no-ignore',
          fixture,
        ],
        { cwd: root },
      )
      expect(result.stderr.toString(), file).toBe('')
      const report = Schema.decodeUnknownSync(Report)(JSON.parse(result.stdout.toString()))
      if (expected === 'valid') {
        expect(result.exitCode, file).toBe(0)
        expect(report.diagnostics, file).toEqual([])
      } else {
        expect(result.exitCode, file).toBe(1)
        expect(
          report.diagnostics.map(({ code }) => code),
          file,
        ).toContain(codes[expected])
      }
    }
  } finally {
    for (const file of files) rmSync(file, { force: true })
    rmSync(directory, { recursive: true, force: true })
  }
})
