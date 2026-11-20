import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { Schema } from 'effect'
import { release } from '../../lib/registry-release.ts'

export { release }

export const root = fileURLToPath(new URL('../..', import.meta.url))
export const outputRoot = process.env.REGISTRY_OUTPUT ?? path.join(root, 'public')
export const origin = process.env.REGISTRY_ORIGIN ?? 'http://127.0.0.1:5280'
export { families, namespaces } from '../../lib/registry-families.ts'
import { families, type Family } from '../../lib/registry-families.ts'
export type { Family } from '../../lib/registry-families.ts'
export const frameworkPackages = new Set([
  'foldkit',
  '@foldkit/ui',
  'effect',
  '@effect/platform-browser',
])
const Manifest = Schema.Struct({
  name: Schema.String,
  exports: Schema.Record(Schema.String, Schema.String),
  dependencies: Schema.Record(Schema.String, Schema.String),
  devDependencies: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  peerDependencies: Schema.Record(Schema.String, Schema.String),
})
export const manifest = (family: Family) =>
  Schema.decodeUnknownSync(Manifest)(
    JSON.parse(readFileSync(path.join(root, 'registry', family, 'package.json'), 'utf8')),
  )
export const isolatedDependencies = new Set(
  families.flatMap((family) =>
    Object.entries(manifest(family).dependencies)
      .filter(([name, version]) =>
        families.some((other) => {
          const otherVersion = manifest(other).dependencies[name]
          return otherVersion !== undefined && otherVersion !== version
        }),
      )
      .map(([name]) => name),
  ),
)
export const registryUrl = (family: Family, name: string) =>
  `${origin}/r/${family}/${release}/${name}.json`
export const itemName = (entry: string) =>
  entry === '.' ? 'all' : entry.slice(2).replaceAll('/', '-').replaceAll('.', '-')
