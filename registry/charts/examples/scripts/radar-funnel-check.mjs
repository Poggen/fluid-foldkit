import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const output = process.argv[2]
if (!output || !path.isAbsolute(output)) throw Error('Absolute receipt directory required')
fs.mkdirSync(output, { recursive: true })
const bun = process.env.BUN_BIN ?? 'bun'
const root = path.resolve(import.meta.dirname, '../../../..')
const checks = [
  ['typecheck', [bun, 'run', 'typecheck']],
  ['lint', [bun, 'run', 'lint']],
  [
    'format',
    [
      'node_modules/.bin/oxfmt',
      '--check',
      'registry/charts/src/radar',
      'registry/charts/src/funnel',
      'registry/charts/examples/src/radar-funnel-entry.ts',
      'registry/charts/examples/scripts/radar-funnel-check.mjs',
      'registry/charts/examples/source-baseline/radar-funnel.jsx',
      'registry/charts/examples/radar-funnel.html',
      'registry/charts/examples/source-baseline/radar-funnel.html',
    ],
  ],
  ['tests', [bun, 'run', '--cwd', 'registry/charts', 'test']],
  ['architecture', [bun, 'run', 'guardrails']],
]
const results = []
for (const [name, command] of checks) {
  const result = spawnSync(command[0], command.slice(1), { cwd: root, encoding: 'utf8' })
  fs.writeFileSync(path.join(output, `${name}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}`)
  results.push({ name, command, exitCode: result.status, pass: result.status === 0 })
  fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(results, null, 2))
  if (result.status !== 0) process.exit(result.status ?? 1)
}
