import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const baselineRoot = import.meta.dirname
export const workspaceRoot = path.resolve(baselineRoot, '../../../..')
const input = process.env.CHARTS_SOURCE_ROOT
assert(input, 'CHARTS_SOURCE_ROOT must name the clean pinned Bklit Git checkout')
export const sourceRoot = path.resolve(input)
export const migratedRoot = path.join(sourceRoot, 'showcase/migrated')
const inventory = JSON.parse(
  readFileSync(path.join(workspaceRoot, 'registry/charts/inventory/upstream.json'), 'utf8'),
)
const git = (...args) =>
  execFileSync('git', ['-C', sourceRoot, ...args], { encoding: 'utf8' }).trim()
assert.equal(git('remote', 'get-url', 'origin'), inventory.cloneVerification.origin)
assert.equal(git('rev-parse', 'HEAD'), inventory.cloneVerification.head)
assert.equal(git('status', '--porcelain'), '')
assert.equal(inventory.sourceFiles.length, 322)
assert.equal(inventory.sourceAssets.length, 4)
for (const file of [...inventory.sourceFiles, ...inventory.sourceAssets]) {
  const actual = createHash('sha256')
    .update(readFileSync(path.join(migratedRoot, file.file)))
    .digest('hex')
  assert.equal(actual, file.sha256, `Pinned source hash mismatch: ${file.file}`)
}
export const materializeSource = () => {
  const cache = path.resolve(
    realpathSync(path.join(baselineRoot, 'node_modules')),
    '..',
    `source-${inventory.source.commit}`,
  )
  for (const file of [...inventory.sourceFiles, ...inventory.sourceAssets]) {
    const target = path.join(cache, file.file)
    mkdirSync(path.dirname(target), { recursive: true })
    if (
      !existsSync(target) ||
      createHash('sha256').update(readFileSync(target)).digest('hex') !== file.sha256
    )
      copyFileSync(path.join(migratedRoot, file.file), target)
  }
  return cache
}
export const sourceFile = (relative) => pathToFileURL(path.join(materializeSource(), relative)).href
if (import.meta.main)
  console.log(`Verified pinned Bklit origin/HEAD and 322 source plus 4 asset hashes: ${sourceRoot}`)
