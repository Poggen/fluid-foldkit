import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { Schema } from 'effect'

export const root = fileURLToPath(new URL('../..', import.meta.url))
export const outputRoot = process.env.REGISTRY_OUTPUT ?? path.join(root, 'public')
export const release = '0.1.0-preview.0'
export const origin = process.env.REGISTRY_ORIGIN ?? 'http://127.0.0.1:5280'
export const families = ['fluid', 'charts'] as const
export type Family = (typeof families)[number]
export const namespaces = { fluid: '@fluid-foldkit', charts: '@bklit-foldkit' }
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
  Object.entries(manifest('fluid').dependencies)
    .filter(([name, version]) => {
      const other = manifest('charts').dependencies[name]
      return other !== undefined && other !== version
    })
    .map(([name]) => name),
)
export const registryUrl = (family: Family, name: string) =>
  `${origin}/r/${family}/${release}/${name}.json`
export const itemName = (entry: string) =>
  entry === '.' ? 'all' : entry.slice(2).replaceAll('/', '-').replaceAll('.', '-')
