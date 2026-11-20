import { expect, test } from 'bun:test'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const repository = path.resolve(import.meta.dirname, '../..')
const sdk = path.join(repository, 'registry/ramka/sdk')
const version = '0.170.0-canary.54f8bcd443b4'
const dependency = `foldkit@${version}`
const run = (root: string) =>
  Bun.spawnSync(['bun', 'scripts/install-ramka-sdk.mjs'], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  })
const fixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ramka-sdk-setup-'))
  mkdirSync(path.join(root, 'scripts'))
  mkdirSync(path.join(root, 'patches'))
  copyFileSync(
    path.join(sdk, 'install-ramka-sdk.mjs'),
    path.join(root, 'scripts/install-ramka-sdk.mjs'),
  )
  for (const file of ['foldkit-ramka-54f8.patch', 'foldkit-ramka-54f8.json'])
    copyFileSync(path.join(sdk, file), path.join(root, 'patches', file))
  return root
}
const manifest = {
  name: 'ramka-sdk-installer-contract',
  private: true,
  type: 'module',
  packageManager: 'bun@1.4.2',
  dependencies: { foldkit: version, effect: '4.1.2', '@effect/platform-browser': '4.1.2' },
  scripts: { custom: 'printf keep' },
  custom: { preserve: ['nested', 7] },
}

test('explicit SDK setup preserves caller configuration, refuses conflicts, and is idempotent', () => {
  const root = fixture()
  try {
    const conflicting = {
      ...manifest,
      patchedDependencies: { [dependency]: 'patches/custom.patch' },
    }
    writeFileSync(path.join(root, 'patches/custom.patch'), 'user-owned custom patch')
    const original = JSON.stringify(conflicting, null, 4) + '\n'
    writeFileSync(path.join(root, 'package.json'), original)
    const refused = run(root)
    expect(refused.exitCode).not.toBe(0)
    expect(refused.stderr.toString()).toContain('Conflicting Foldkit patch')
    expect(readFileSync(path.join(root, 'package.json'), 'utf8')).toBe(original)
    expect(existsSync(path.join(root, 'bun.lock'))).toBe(false)

    const legacy = readFileSync(
      path.join(repository, 'scripts/registry/fixtures/foldkit-legacy-54f8.patch'),
    )
    writeFileSync(path.join(root, 'patches/legacy.patch'), legacy)
    writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify(
        { ...manifest, patchedDependencies: { [dependency]: 'patches/legacy.patch' } },
        null,
        2,
      ) + '\n',
    )
    const installed = run(root)
    expect(installed.exitCode, installed.stderr.toString() + installed.stdout.toString()).toBe(0)
    const configured = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
    expect(configured).toEqual({
      ...manifest,
      patchedDependencies: { [dependency]: 'patches/foldkit-ramka-54f8.patch' },
    })
    expect(readFileSync(path.join(root, 'patches/legacy.patch'))).toEqual(legacy)
    const packageBytes = readFileSync(path.join(root, 'package.json'), 'utf8')
    const lockBytes = readFileSync(path.join(root, 'bun.lock'), 'utf8')
    const repeated = run(root)
    expect(repeated.exitCode, repeated.stderr.toString()).toBe(0)
    expect(repeated.stdout.toString()).toContain('already configured and verified')
    expect(readFileSync(path.join(root, 'package.json'), 'utf8')).toBe(packageBytes)
    expect(readFileSync(path.join(root, 'bun.lock'), 'utf8')).toBe(lockBytes)

    writeFileSync(path.join(root, 'patches/foldkit-ramka-54f8.patch'), 'tampered')
    const corrupt = run(root)
    expect(corrupt.exitCode).not.toBe(0)
    expect(corrupt.stderr.toString()).toContain('SHA-256 mismatch')
    expect(readFileSync(path.join(root, 'package.json'), 'utf8')).toBe(packageBytes)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
