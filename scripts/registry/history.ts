import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Schema } from 'effect'
import { families } from '../../lib/registry-families'

export const restoreRegistryArchive = (
  output: string,
  release: string,
  archive: Uint8Array<ArrayBuffer>,
  sha256: string,
) => {
  if (createHash('sha256').update(archive).digest('hex') !== sha256)
    throw new Error(`Registry archive checksum mismatch: ${release}`)
  const files = Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.String))(
    JSON.parse(new TextDecoder().decode(Bun.gunzipSync(archive))),
  )
  const entries = Object.entries(files)
  if (entries.length === 0) throw new Error(`Registry archive is empty: ${release}`)
  for (const [file] of entries) {
    const parts = file.split('/')
    if (
      parts.length !== 4 ||
      parts[0] !== 'r' ||
      !families.some((family) => family === parts[1]) ||
      parts[2] !== release ||
      !/^[a-z0-9-]+\.json$/.test(parts[3] ?? '')
    )
      throw new Error(`Unexpected registry archive path: ${file}`)
  }
  for (const [file, content] of entries) {
    const target = path.join(output, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
}
