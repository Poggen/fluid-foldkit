import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const version = '0.170.0-canary.54f8bcd443b4'
const patchSha256 = '24d36d7159e88ccca9cd0a9e4b4959e5043cccb976da741dec49dd230f8e1b0f'
const legacySha256 = '031056e7d30a370fe8860c3f519564bae60c9c949b5021e29398663808d06436'
const root = fileURLToPath(new URL('..', import.meta.url))
const manifestFile = path.join(root, 'package.json')
const specificationFile = path.join(root, 'patches/foldkit-ramka-54f8.json')
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const inside = (directory, relative) => {
  if (typeof relative !== 'string') throw new Error('Expected a relative patch path')
  const target = path.resolve(directory, relative)
  const location = path.relative(directory, target)
  if (location.startsWith('..') || path.isAbsolute(location))
    throw new Error('Patch files must stay inside the project root')
  return target
}

const verifyInstalled = (specification) => {
  const sdk = path.join(root, 'node_modules/foldkit')
  if (!existsSync(path.join(sdk, 'package.json'))) return false
  if (readJson(path.join(sdk, 'package.json')).version !== version) return false
  for (const [relative, expected] of Object.entries(specification.installedFiles)) {
    const file = inside(sdk, relative)
    if (!existsSync(file) || digest(file) !== expected) return false
  }
  if (!readFileSync(inside(sdk, specification.publicDeclaration), 'utf8').includes('flushSync'))
    return false
  const capability = spawnSync(
    process.execPath,
    [
      '--eval',
      "import { Render } from 'foldkit'; import { Effect } from 'effect'; if (!Effect.isEffect(Render.flushSync)) process.exit(1)",
    ],
    { cwd: root, stdio: 'pipe' },
  )
  if (capability.error) throw capability.error
  return capability.status === 0
}

const main = async () => {
  if (!process.versions.bun)
    throw new Error('Run this setup with Bun: bun scripts/install-ramka-sdk.mjs')
  const specification = readJson(specificationFile)
  const dependency = `foldkit@${version}`
  if (
    specification.schemaVersion !== 1 ||
    specification.package !== 'foldkit' ||
    specification.version !== version ||
    specification.dependency !== dependency ||
    specification.sha256 !== patchSha256 ||
    specification.legacySha256 !== legacySha256 ||
    !record(specification.installedFiles) ||
    Object.keys(specification.installedFiles).length === 0 ||
    !Object.values(specification.installedFiles).every(
      (value) => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value),
    )
  )
    throw new Error('Invalid reviewed Ramka SDK patch specification')
  const patchFile = inside(root, specification.target)
  if (digest(patchFile) !== specification.sha256)
    throw new Error('Ramka SDK patch SHA-256 mismatch')
  const original = readFileSync(manifestFile, 'utf8')
  const manifest = JSON.parse(original)
  if (!record(manifest)) throw new Error('Expected a package.json object')
  if (
    manifest.packageManager !== undefined &&
    (typeof manifest.packageManager !== 'string' || !manifest.packageManager.startsWith('bun@'))
  )
    throw new Error(
      'Ramka SDK setup supports Bun projects; it does not rewrite another package manager',
    )
  const sdkVersion = manifest.dependencies?.foldkit ?? manifest.devDependencies?.foldkit
  if (sdkVersion !== version)
    throw new Error(`Ramka SDK setup requires the exact foldkit ${version} dependency`)
  if (manifest.patchedDependencies !== undefined && !record(manifest.patchedDependencies))
    throw new Error('Expected patchedDependencies to be an object')
  const patches = manifest.patchedDependencies ?? {}
  const existing = patches[dependency]
  if (existing !== undefined) {
    const existingFile = inside(root, existing)
    if (!existsSync(existingFile))
      throw new Error('Existing Foldkit patch is missing; refusing to replace it')
    const current = digest(existingFile)
    if (current !== specification.sha256 && current !== specification.legacySha256)
      throw new Error('Conflicting Foldkit patch; merge and review it before installing Ramka')
  }
  const changed = existing !== specification.target
  if (!changed && verifyInstalled(specification)) {
    console.log(`Ramka SDK patch already configured and verified (${specification.sha256})`)
    return
  }
  if (changed)
    writeFileSync(
      manifestFile,
      JSON.stringify(
        { ...manifest, patchedDependencies: { ...patches, [dependency]: specification.target } },
        null,
        2,
      ) + '\n',
    )
  const install = spawnSync(process.execPath, ['install'], { cwd: root, stdio: 'inherit' })
  if (install.error) throw install.error
  if (install.status !== 0)
    throw new Error(
      'Bun install failed; the reviewed patch remains registered for the next install',
    )
  if (!verifyInstalled(specification))
    throw new Error('Installed Foldkit runtime/declarations do not match the reviewed Ramka patch')
  console.log(`Ramka SDK patch installed and verified (${specification.sha256})`)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
