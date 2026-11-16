import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statfsSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { baselineRoot } from './source-reference.mjs'

assert.equal(execFileSync('bun', ['--version'], { encoding: 'utf8' }).trim(), '1.4.2')
const lock = readFileSync(path.join(baselineRoot, 'bun.lock'))
const key = createHash('sha256').update(lock).digest('hex')
const cache = path.join(tmpdir(), 'foldkit-visuals-original', key.slice(0, 16))
mkdirSync(cache, { recursive: true })
assert(
  !existsSync(path.join(cache, '..', 'package.json')),
  'Baseline cache must be outside another project',
)
const disk = statfsSync(cache)
assert(disk.bavail * disk.bsize > 2 * 1024 ** 3, 'Baseline setup requires over 2 GiB host free')
writeFileSync(
  path.join(cache, 'package.json'),
  readFileSync(path.join(baselineRoot, 'package.json')),
)
writeFileSync(path.join(cache, 'bun.lock'), lock)
const result = spawnSync(
  'bun',
  ['install', '--frozen-lockfile', '--ignore-scripts', '--backend=hardlink'],
  {
    cwd: cache,
    stdio: 'inherit',
    timeout: 60_000,
  },
)
assert.equal(
  result.status,
  0,
  `Isolated baseline install failed: ${result.error ?? result.signal ?? result.status}`,
)
assert.equal(
  createHash('sha256')
    .update(readFileSync(path.join(cache, 'bun.lock')))
    .digest('hex'),
  key,
)
const modules = path.join(baselineRoot, 'node_modules')
if (!existsSync(modules)) symlinkSync(path.join(cache, 'node_modules'), modules, 'dir')
assert.equal(realpathSync(modules), realpathSync(path.join(cache, 'node_modules')))
console.log(`Isolated original-renderer dependency lock verified: ${key}`)
console.log(`Baseline dependencies: ${cache}`)
