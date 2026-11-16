import { afterEach, expect, test } from 'vitest'
// @effect-diagnostics-next-line nodeBuiltinImport:off -- This fixture executes the standalone Node checker and shell runners to verify their real exit status.
import { spawnSync } from 'node:child_process'
// @effect-diagnostics-next-line nodeBuiltinImport:off -- Isolated executable setup and exact receipt checks use native files outside the checker under test.
import fs from 'node:fs'
import os from 'node:os'
// @effect-diagnostics-next-line nodeBuiltinImport:off -- Executable fixtures require host-native paths and PATH delimiters.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtures: Array<string> = []
const root = fileURLToPath(new URL('../../../', import.meta.url))
afterEach(() => {
  for (const fixture of fixtures.splice(0)) fs.rmSync(fixture, { recursive: true, force: true })
})

const fixture = (response: string, code = 0) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'foldkit-browser-errors-'))
  fixtures.push(directory)
  fs.writeFileSync(
    path.join(directory, 'agent-browser'),
    `#!${process.execPath}
if (process.argv.includes('errors')) {
  process.stdout.write(${JSON.stringify(response)});
  process.exitCode = ${code};
}
`,
    { mode: 0o755 },
  )
  return {
    directory,
    env: { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}` },
  }
}

test('browser check accepts an empty error envelope and retains its exact receipt', () => {
  const response = '{"success":true,"data":{"errors":[]},"error":null}\n'
  const host = fixture(response)
  const receipt = path.join(host.directory, 'receipt.json')
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/browser-errors.mjs'), 'test', receipt],
    {
      env: host.env,
      encoding: 'utf8',
    },
  )
  expect(result.status).toBe(0)
  expect(result.stdout).toBe(response)
  expect(fs.readFileSync(receipt, 'utf8')).toBe(response)
})

for (const { name, response } of [
  {
    name: 'page error',
    response: '{"success":true,"data":{"errors":["RangeError: chart value invalid"]},"error":null}',
  },
  { name: 'malformed JSON', response: 'not json' },
  {
    name: 'failed command envelope',
    response: '{"success":false,"data":{"errors":[]},"error":"Disconnected"}',
  },
  { name: 'missing errors', response: '{"success":true,"data":{},"error":null}' },
]) {
  test(`browser check rejects ${name} and preserves the response`, () => {
    const host = fixture(response)
    const receipt = path.join(host.directory, 'receipt.json')
    const result = spawnSync(
      process.execPath,
      [path.join(root, 'scripts/browser-errors.mjs'), 'test', receipt],
      {
        env: host.env,
        encoding: 'utf8',
      },
    )
    expect(result.status).toBe(1)
    expect(fs.readFileSync(receipt, 'utf8')).toBe(response)
    expect(result.stderr).toContain(response)
  })
}

test('browser check propagates a failing browser process', () => {
  const host = fixture('', 7)
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/browser-errors.mjs'), 'test'],
    {
      env: host.env,
      encoding: 'utf8',
    },
  )
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('Command failed')
})

for (const name of [
  'ask-hover',
  'breadcrumb-controls',
  'field-labels',
  'tabs-selection',
  'textarea',
]) {
  test(`${name} shell check rejects page errors after successful interactions`, () => {
    const host = fixture(
      '{"success":true,"data":{"errors":["RangeError: chart value invalid"]},"error":null}',
    )
    const result = spawnSync(
      'sh',
      [path.join(root, `registry/fluid/examples/tests/${name}.sh`), 'http://fixture.invalid'],
      {
        env: host.env,
        encoding: 'utf8',
      },
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Browser reported page errors')
  })
}
