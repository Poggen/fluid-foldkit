import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Schema } from 'effect'
import { retainShowcaseAssets } from './retain-showcase-assets'
import { restoreRegistryArchive } from './registry/history'

const root = fileURLToPath(new URL('..', import.meta.url))
const hostname =
  process.env.VERCEL_ENV === 'production'
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : process.env.VERCEL_URL
const configuredOrigin =
  process.env.REGISTRY_ORIGIN ?? (hostname ? `https://${hostname}` : undefined)
if (configuredOrigin === undefined)
  throw new Error('Set REGISTRY_ORIGIN when building outside Vercel.')
const url = new URL(configuredOrigin)
if (
  !['http:', 'https:'].includes(url.protocol) ||
  url.username ||
  url.password ||
  url.pathname !== '/' ||
  url.search ||
  url.hash
)
  throw new Error('REGISTRY_ORIGIN must be an HTTP(S) origin without a path or credentials.')
const origin = url.origin

const build = Bun.spawnSync(['bun', 'run', 'build'], {
  cwd: root,
  env: { ...process.env, REGISTRY_ORIGIN: origin, VITE_VERCEL_ANALYTICS: '1' },
  stdout: 'inherit',
  stderr: 'inherit',
})
if (build.exitCode !== 0) throw new Error('Showcase build failed.')

const output = path.join(root, '.vercel/output')
const server = path.join(root, 'app/dist/server')
const functionDirectory = path.join(output, 'functions/render.func')
const manifest = Schema.decodeUnknownSync(Schema.Struct({ serverEntry: Schema.String }))(
  JSON.parse(readFileSync(path.join(server, 'foldkit.build.json'), 'utf8')),
)
rmSync(output, { recursive: true, force: true })
mkdirSync(functionDirectory, { recursive: true })
cpSync(path.join(root, 'app/dist/client'), path.join(output, 'static'), { recursive: true })
for (const [version, sha256] of Object.entries({
  '0.1.0-preview.0': '673c465c89670a9c89d37b83e238eb5bca547ac0228e3e3f1e9c0eb65c345f35',
  '0.1.0-preview.1': '7381c188004608fa8944009879849291d642bb656e3f25da0e8142e1b93f7913',
  '0.1.0-preview.2': '373de3698a7c6139f36ac95ec02ebe30be5f382bdbacbbe1f13be6939f15092d',
  '0.1.0-preview.3': '03157b7031e19488a544e522c918686dc8740fb6ebabbc03e29434357b4c6103',
  '0.1.0-preview.4': '9d6ee02463feb76de6ade7a62bfd51d3374492088d2385667741f41b5bb2fa0b',
})) {
  const archive = await fetch(
    `https://github.com/Poggen/fluid-foldkit/releases/download/registry-${version}/registry-${version}.json.gz`,
  )
  if (!archive.ok) throw new Error(`Registry ${version} archive request failed: ${archive.status}`)
  restoreRegistryArchive(
    path.join(output, 'static'),
    version,
    new Uint8Array(await archive.arrayBuffer()),
    sha256,
  )
}

cpSync(path.join(server, manifest.serverEntry), path.join(functionDirectory, manifest.serverEntry))
if (existsSync(path.join(server, 'assets')))
  cpSync(path.join(server, 'assets'), path.join(functionDirectory, 'assets'), { recursive: true })

const writeJson = (file: string, value: unknown) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
writeJson(path.join(functionDirectory, 'package.json'), { type: 'module' })
writeJson(path.join(functionDirectory, '.vc-config.json'), {
  runtime: 'nodejs24.x',
  handler: manifest.serverEntry,
  launcherType: 'Nodejs',
  supportsResponseStreaming: true,
})
const retainedAssetOrigin =
  process.env.VERCEL_ENV === 'production'
    ? await retainShowcaseAssets(path.join(output, 'static/assets'))
    : undefined
writeJson(path.join(output, 'config.json'), {
  version: 3,
  routes: [
    {
      src: '/(?:assets|fluid/assets|charts/assets)/(.*)',
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    {
      src: '/r/(.*)',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
      continue: true,
    },
    { handle: 'filesystem' },
    ...(retainedAssetOrigin
      ? [{ src: '/assets/(.+)', dest: `${retainedAssetOrigin}/assets/$1` }]
      : []),
    { src: '/(.*)', dest: '/render' },
  ],
})
console.log(`Vercel output ready; registry origin ${origin}`)
