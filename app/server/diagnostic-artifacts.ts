import { Effect, FileSystem, Path, Schema } from 'effect'
import { Server } from 'foldkit/experimental'

// The build manifest omits these values; fail closed if the generated entry changes shape.
export const readDiagnosticArtifacts = (directory: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const filename = path.join(directory, 'server', 'fetch.js')
    const source = yield* fs.readFileString(filename)
    const assetMatches = [...source.matchAll(/var assets = (\{[\s\S]*?\n\});/gu)]
    const assetsText = assetMatches.at(-1)?.[1]
    const buildText = /var injectedBuildId = ("[^"\n]+");/u.exec(source)?.[1]
    if (assetsText === undefined || buildText === undefined)
      return yield* Effect.fail(
        new Error('Cannot read assets/build identity from generated fetch.js'),
      )
    const assets = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Server.DocumentAssets))(
      assetsText,
    )
    const buildId = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.String))(
      buildText,
    )
    if (
      !buildId ||
      ![assets.entryScript, ...assets.stylesheets, ...assets.modulePreloads].every(
        (value) => value.startsWith('/assets/') && !value.includes('..'),
      )
    )
      return yield* Effect.fail(new Error('Unexpected generated build identity or asset URL'))
    return {
      assets,
      buildId,
      sourceArtifact: filename,
      sourceSha256: new Bun.CryptoHasher('sha256').update(source).digest('hex'),
      clientDirectory: path.resolve(directory, 'client'),
    }
  })
