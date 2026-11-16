import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Schema } from 'effect'

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
  env: { ...process.env, REGISTRY_ORIGIN: origin },
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
    { src: '/(.*)', dest: '/render' },
  ],
})
console.log(`Vercel output ready; registry origin ${origin}`)
