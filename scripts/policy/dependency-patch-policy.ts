import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { Schema } from 'effect'

const reviewedPatch = {
  version: '0.170.0-canary.54f8bcd443b4',
  dependency: 'foldkit@0.170.0-canary.54f8bcd443b4',
  file: 'patches/foldkit@0.170.0-canary.54f8bcd443b4.patch',
  sha256: '24d36d7159e88ccca9cd0a9e4b4959e5043cccb976da741dec49dd230f8e1b0f',
  installed: [
    {
      file: 'dist/runtime/compositionRuntime.js',
      sha256: 'c59acf445e86a60708ab966f6617bb9354ae4f2890f0f51e6db0186b0abc4e77',
    },
    {
      file: 'dist/runtime/subscriptionFibers.js',
      sha256: '66578e153e3f079b77855d9598835fdca411cf2c0baf2fbcb9b6e23190cda7b9',
    },
    {
      file: 'dist/render/commit.js',
      sha256: 'ce2bc9d121e7f8ddd0ea22171ced25a19e188132847d95b14ab3cbe426627fef',
    },
    {
      file: 'dist/render/commit.d.ts',
      sha256: 'c3ae127a8932f8efdc1f0652055db10ec49cf6e4955cdefdc75cc0adedae8b62',
    },
    {
      file: 'dist/render/render.js',
      sha256: '72064482c055f4d27f0dcd213d4e6477b650b17a9e66facef3886ca3a53eb241',
    },
    {
      file: 'dist/render/render.d.ts',
      sha256: '06cfacb13e3b3da6f13298e64af4d2620d3656dbbc15c3543b747cc6a90b9760',
    },
    {
      file: 'dist/render/public.js',
      sha256: '6966a4dcbeb8793cf3134414b071f5393232f408fdf7e0fdf441d09d72c32068',
    },
    {
      file: 'dist/render/public.d.ts',
      sha256: '8523046e4d881f231b8ae67ff68bdaa3c48cf046d02c7bb5ac2754d4fb3ae4cb',
    },
    {
      file: 'dist/render/index.js',
      sha256: 'f83efcfaff8533c21b5ab33353d7f8cfcbb7cd1931443c2ebbc7762e38cf5c24',
    },
    {
      file: 'dist/render/index.d.ts',
      sha256: 'f2d396ab741abcf0aafc909e6fa3b56b1220003d4d4e06f5431b8d675f913e08',
    },
    {
      file: 'dist/runtime/renderer.js',
      sha256: '21a74ba9c97e016caf9f5d1f94a41be5c905aef007190dbaa3983ce6a9e96e78',
    },
  ],
}
const Manifest = Schema.Struct({
  dependencies: Schema.Record(Schema.String, Schema.String),
  patchedDependencies: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
})
const InstalledManifest = Schema.Struct({ version: Schema.String })

export const checkedDependencyPatch: (root: string) => void = (root: string) => {
  const manifest = Schema.decodeUnknownSync(Manifest)(
    JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')),
  )
  if (manifest.dependencies.foldkit !== reviewedPatch.version)
    throw new Error('The carried Foldkit patch requires its reviewed SDK version')
  const patches = Object.entries(manifest.patchedDependencies ?? {})
  if (
    patches.length !== 1 ||
    patches[0]?.[0] !== reviewedPatch.dependency ||
    patches[0]?.[1] !== reviewedPatch.file
  )
    throw new Error('patchedDependencies must contain only the reviewed Foldkit patch')

  const directory = path.join(root, 'patches')
  if (!lstatSync(directory).isDirectory())
    throw new Error('The patches directory must be a regular directory')
  const files = readdirSync(directory, { withFileTypes: true })
  if (
    files.length !== 1 ||
    files[0]?.name !== path.basename(reviewedPatch.file) ||
    !files[0]?.isFile()
  )
    throw new Error('The patches directory must contain only the reviewed Foldkit patch file')
  const digest = (file: string) =>
    createHash('sha256')
      .update(readFileSync(path.join(root, file)))
      .digest('hex')
  if (digest(reviewedPatch.file) !== reviewedPatch.sha256)
    throw new Error('The carried Foldkit patch bytes differ from the reviewed patch')

  const installed = Schema.decodeUnknownSync(InstalledManifest)(
    JSON.parse(readFileSync(path.join(root, 'node_modules/foldkit/package.json'), 'utf8')),
  )
  if (installed.version !== reviewedPatch.version)
    throw new Error('The installed Foldkit SDK version differs from the reviewed patch version')
  for (const file of reviewedPatch.installed) {
    if (digest(`node_modules/foldkit/${file.file}`) !== file.sha256)
      throw new Error(`The installed Foldkit ${file.file} does not match the reviewed patch`)
  }
}
