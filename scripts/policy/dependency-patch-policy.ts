import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { Schema } from 'effect'

const reviewedPatch = {
  version: '0.170.0-canary.54f8bcd443b4',
  dependency: 'foldkit@0.170.0-canary.54f8bcd443b4',
  file: 'patches/foldkit@0.170.0-canary.54f8bcd443b4.patch',
  sha256: '031056e7d30a370fe8860c3f519564bae60c9c949b5021e29398663808d06436',
  installed: [
    {
      file: 'dist/runtime/compositionRuntime.js',
      sha256: 'c59acf445e86a60708ab966f6617bb9354ae4f2890f0f51e6db0186b0abc4e77',
    },
    {
      file: 'dist/runtime/subscriptionFibers.js',
      sha256: '66578e153e3f079b77855d9598835fdca411cf2c0baf2fbcb9b6e23190cda7b9',
    },
  ],
}
const Manifest = Schema.Struct({
  dependencies: Schema.Record(Schema.String, Schema.String),
  patchedDependencies: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
})
const InstalledManifest = Schema.Struct({ version: Schema.String })

export const checkedDependencyPatch = (root: string): void => {
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
