import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { restoreRegistryArchive } from './history'

const release = '0.1.0-preview.0'
const item = `r/charts/${release}/line.json`
const source = '{"name":"line","files":[]}\n'
const bundle = (files: unknown) => {
  const archive = Bun.gzipSync(JSON.stringify(files))
  return { archive, sha256: createHash('sha256').update(archive).digest('hex') }
}
const withinOutput = (check: (output: string) => void) => {
  const output = mkdtempSync(path.join(tmpdir(), 'registry-history-'))
  try {
    check(output)
  } finally {
    rmSync(output, { recursive: true, force: true })
  }
}

describe('published registry archives', () => {
  test('restores exact previous bytes under their versioned paths', () =>
    withinOutput((output) => {
      const { archive, sha256 } = bundle({ [item]: source })
      restoreRegistryArchive(output, release, archive, sha256)
      expect(readFileSync(path.join(output, item), 'utf8')).toBe(source)
    }))
  test('rejects changed archive bytes before writing any payload', () =>
    withinOutput((output) => {
      const original = bundle({ [item]: source })
      const changed = bundle({ [item]: '{"name":"different"}' })
      expect(() =>
        restoreRegistryArchive(output, release, changed.archive, original.sha256),
      ).toThrow('checksum mismatch')
      expect(existsSync(path.join(output, item))).toBe(false)
    }))
  test.each([
    '../outside.json',
    'r/charts/registry.json',
    'r/charts/other/line.json',
    `r/other/${release}/line.json`,
  ])('rejects %s without partially restoring earlier entries', (bad) =>
    withinOutput((output) => {
      const { archive, sha256 } = bundle({ [item]: source, [bad]: source })
      expect(() => restoreRegistryArchive(output, release, archive, sha256)).toThrow(
        'Unexpected registry archive path',
      )
      expect(existsSync(path.join(output, item))).toBe(false)
    }),
  )
})
