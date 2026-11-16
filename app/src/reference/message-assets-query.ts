import { Effect, Schema } from 'effect'
import { Query } from 'foldkit/experimental'
import { MessageFile } from '@foldkit-visuals/fluid/input-message'
import { MessageAssets } from './message-assets'

export const AssetsData = Schema.Struct({
  attachments: Schema.Array(MessageFile),
  queue: Schema.Array(MessageFile),
})
export type AssetsData = typeof AssetsData.Type

export const MessageAssetsQuery = Query.define({
  name: 'AuthoredMessageAssets',
  data: AssetsData,
  error: Schema.String,
  notifyOnCompletion: true,
  handler: function* () {
    const assets = yield* MessageAssets
    return () => assets.load.pipe(Effect.mapError((error) => error.message))
  },
})

export const ComposerSamplesQuery = Query.define({
  name: 'InputMessageSamples',
  data: Schema.Array(MessageFile),
  error: Schema.String,
  notifyOnCompletion: true,
  handler: function* () {
    const assets = yield* MessageAssets
    return () =>
      assets.load.pipe(
        Effect.map(({ attachments }) => attachments),
        Effect.mapError((error) => error.message),
      )
  },
})
