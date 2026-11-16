import { Effect, Layer, Result } from 'effect'
import { AsyncData, Story } from 'foldkit'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { MessageAssetUnavailable, MessageAssets } from './message-assets'
import { AuthoredMessagesBlock } from './authored-message-definition'
import { MessageAssetsQuery } from './message-assets-query'
import { layer } from './authored-messages'

const subject = { block: AuthoredMessagesBlock, layer }
const file = { id: 'asset-1', name: 'notes.pdf', type: 'application/pdf', size: 4, lastModified: 0 }
const files = { attachments: [file], queue: [{ ...file, id: 'asset-2' }] }
const loaded = MessageAssetsQuery.Message.CompletedFetch({
  generation: 1,
  result: Result.succeed(files),
})
const failedLoad = MessageAssetsQuery.Message.CompletedFetch({
  generation: 1,
  result: Result.fail('Attachments unavailable'),
})

it.effect(
  'dispatches one load across repeated mounts and preserves seeded conversation state',
  () =>
    Story.story(
      subject,
      Story.init(),
      Story.message(AuthoredMessagesBlock.Message.Mounted()),
      Story.Command.expectExact(MessageAssetsQuery.Fetch({ generation: 1 })),
      Story.message(AuthoredMessagesBlock.Message.Mounted()),
      Story.Command.expectExact(MessageAssetsQuery.Fetch({ generation: 1 })),
      Story.Command.resolve(MessageAssetsQuery.Fetch, loaded),
      Story.model((model) => {
        expect(AsyncData.isSuccess(MessageAssetsQuery.read(model.assetsQuery))).toBe(true)
        expect(model.turns.some((turn) => turn.seeded)).toBe(true)
        expect(model.composers.queued?.queue).toHaveLength(3)
        expect(model.composers.attachments?.files).toEqual(files.attachments)
        expect(model.composers.queued?.queue[0]?.files).toEqual(files.queue)
      }),
      Story.message(AuthoredMessagesBlock.Message.Mounted()),
      Story.Command.expectNone(),
    ),
)

it.effect('maps the asset provider success and failure into load completion messages', () =>
  Effect.gen(function* () {
    const success = yield* MessageAssetsQuery.Fetch({ generation: 1 }).effect.pipe(
      Effect.provide(
        MessageAssetsQuery.EffectsLayer.pipe(
          Layer.provide(Layer.succeed(MessageAssets, { load: Effect.succeed(files) })),
        ),
      ),
    )
    expect(success).toMatchObject(loaded)

    const failure = yield* MessageAssetsQuery.Fetch({ generation: 1 }).effect.pipe(
      Effect.provide(
        MessageAssetsQuery.EffectsLayer.pipe(
          Layer.provide(
            Layer.succeed(MessageAssets, {
              load: Effect.fail(
                new MessageAssetUnavailable({ message: 'Attachments unavailable' }),
              ),
            }),
          ),
        ),
      ),
    )
    expect(failure).toMatchObject(failedLoad)
  }),
)

it.effect('failed attachment loading clears pending state and allows retry on the next mount', () =>
  Effect.gen(function* () {
    const failed = yield* Story.story(
      subject,
      Story.init(),
      Story.message(AuthoredMessagesBlock.Message.Mounted()),
      Story.Command.expectExact(MessageAssetsQuery.Fetch({ generation: 1 })),
      Story.Command.resolve(MessageAssetsQuery.Fetch, failedLoad),
      Story.model((model) => {
        expect(AsyncData.isFailure(MessageAssetsQuery.read(model.assetsQuery))).toBe(true)
        expect(AsyncData.isPending(MessageAssetsQuery.read(model.assetsQuery))).toBe(false)
      }),
      Story.Command.expectNone(),
    )
    yield* Story.story(
      subject,
      Story.given(failed),
      Story.message(AuthoredMessagesBlock.Message.Mounted()),
      Story.Command.expectExact(MessageAssetsQuery.Fetch({ generation: 2 })),
      Story.Command.resolve(
        MessageAssetsQuery.Fetch,
        MessageAssetsQuery.Message.CompletedFetch({ generation: 2, result: Result.succeed(files) }),
      ),
      Story.model((model) =>
        expect(AsyncData.isSuccess(MessageAssetsQuery.read(model.assetsQuery))).toBe(true),
      ),
      Story.Command.expectNone(),
    )
  }),
)
