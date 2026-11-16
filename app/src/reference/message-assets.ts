import { Context, Effect, Layer, Schema } from 'effect'
import { FetchHttpClient, HttpClient, HttpClientResponse } from 'effect/http'
import { MessageFile } from '@foldkit-visuals/fluid/input-message'
import type { createInputMessageFileRegistry } from '@foldkit-visuals/fluid/input-message'
import portrait from '../../../lib/assets/micka.png'
import receipt from '../assets/Receipt-2581-4039-8265.pdf?url'
import notes from '../assets/design-notes.pdf?url'
export class MessageAssetUnavailable extends Schema.TaggedError<MessageAssetUnavailable>()(
  'MessageAssetUnavailable',
  { message: Schema.String },
) {}
export class MessageAssets extends Context.Service<
  MessageAssets,
  {
    readonly load: Effect.Effect<
      {
        readonly attachments: ReadonlyArray<MessageFile>
        readonly queue: ReadonlyArray<MessageFile>
      },
      MessageAssetUnavailable
    >
  }
>()('Showcase/MessageAssets') {}
export const messageAssetsLayer = (files: ReturnType<typeof createInputMessageFileRegistry>) =>
  Layer.effect(
    MessageAssets,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const asset = Effect.fn('Showcase.loadMessageAsset')(function* (url: string, name: string) {
        const response = yield* client
          .get(url)
          .pipe(Effect.flatMap(HttpClientResponse.filterStatusOk))
        const bytes = yield* response.arrayBuffer
        return files.retain(
          new File([bytes], name, {
            type: response.headers['content-type'] ?? 'application/octet-stream',
            lastModified: 0,
          }),
        )
      })
      const load = Effect.all(
        [
          asset(portrait, 'micka.png'),
          asset(receipt, 'Receipt-2581-4039-8265.pdf'),
          asset(portrait, 'photo.png'),
          asset(notes, 'design-notes.pdf'),
        ],
        { concurrency: 4 },
      ).pipe(
        Effect.map((loaded) => ({ attachments: loaded.slice(0, 2), queue: loaded.slice(2) })),
        Effect.mapError(
          () =>
            new MessageAssetUnavailable({
              message: 'The documentation image or PDF could not be loaded.',
            }),
        ),
      )
      return MessageAssets.of({ load })
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer))
