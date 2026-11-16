import { afterEach, expect, test } from 'vitest'
// @effect-diagnostics-next-line nodeBuiltinImport:off -- This fixture executes the standalone Node runner in an isolated process to verify exit status and cleanup.
import { spawnSync } from 'node:child_process'
// @effect-diagnostics-next-line nodeBuiltinImport:off -- Native fixture setup and byte-for-byte restoration checks stay outside the runner being tested.
import fs from 'node:fs'
import os from 'node:os'
// @effect-diagnostics-next-line nodeBuiltinImport:off -- The isolated executable fixture uses host-native paths and PATH delimiters.
import path from 'node:path'

const fixtures: Array<string> = []
afterEach(() => {
  for (const fixture of fixtures.splice(0)) fs.rmSync(fixture, { recursive: true, force: true })
})

const runHmr = (scenario: string) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'foldkit-hmr-runner-'))
  fixtures.push(fixture)
  const scripts = path.join(fixture, 'scripts')
  const bin = path.join(fixture, 'bin')
  const entry = path.join(fixture, 'src/pie-ring-entry.ts')
  const receipt = path.join(fixture, 'receipt')
  fs.mkdirSync(scripts)
  fs.mkdirSync(bin)
  fs.mkdirSync(path.dirname(entry))
  const original = 'const state = `2 rows ${2}`\n'
  fs.writeFileSync(entry, original)
  fs.copyFileSync(
    new URL('../examples/scripts/pie-ring-hmr.mjs', import.meta.url),
    path.join(scripts, 'pie-ring-hmr.mjs'),
  )
  fs.writeFileSync(
    path.join(bin, 'agent-browser'),
    `#!${process.execPath}
const fs = require('node:fs');
const code = process.argv.at(-1);
const scenario = process.env.FOLDKIT_HMR_SCENARIO;
const changed = fs.readFileSync(process.env.FOLDKIT_HMR_ENTRY, 'utf8').includes(' HMR rows');
if (code === 'errors') {
  console.log(JSON.stringify({ success: true, data: { errors: scenario === 'page-errors' ? ['TypeError: HMR boundary crashed'] : [] }, error: null }));
} else if (code.includes('origin:performance.timeOrigin')) {
  console.log(JSON.stringify({ origin: scenario === 'reload' && changed ? 2 : 1, text: changed ? '2 HMR rows 2' : '2 rows 2', paths: 2 }));
} else if (code.includes('HMR visible marker absent') && scenario === 'change-failure') {
  console.error('HMR marker did not arrive'); process.exitCode = 1;
} else if (code.includes('frames++>300') && !changed && scenario === 'restore-failure') {
  console.error('Restored marker did not arrive'); process.exitCode = 1;
}
`,
    { mode: 0o755 },
  )
  const result = spawnSync(process.execPath, [path.join(scripts, 'pie-ring-hmr.mjs'), receipt], {
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      FOLDKIT_HMR_SCENARIO: scenario,
      FOLDKIT_HMR_ENTRY: entry,
    },
    encoding: 'utf8',
    timeout: 10000,
  })
  expect(fs.readFileSync(entry, 'utf8')).toBe(original)
  return {
    status: result.status,
    receipt: JSON.parse(fs.readFileSync(path.join(receipt, 'result.json'), 'utf8')),
  }
}

test('HMR runner accepts an in-document update and restored source', () => {
  const result = runHmr('success')
  expect(result.status).toBe(0)
  expect(result.receipt.restored.text).toBe('2 rows 2')
})

for (const scenario of ['change-failure', 'reload', 'restore-failure']) {
  test(`HMR runner fails ${scenario} and restores the original source`, () => {
    const result = runHmr(scenario)
    expect(result.status).toBe(1)
    expect(result.receipt.error ?? result.receipt.cleanupError).toBeTruthy()
  })
}

test('HMR runner fails when a successful CLI response contains a page error', () => {
  const result = runHmr('page-errors')
  expect(result.status).toBe(1)
  expect(result.receipt.errors).toEqual(['TypeError: HMR boundary crashed'])
  expect(result.receipt.browserError).toContain('1 page error')
})
