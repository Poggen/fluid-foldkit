import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Story } from 'foldkit'
import { Effect, Option } from 'effect'
import { Payload } from '../src/input-message-region.js'
import { InputMessageBlock, layer as InputMessageLayer } from '../src/input-message.js'
import { InputMessageFilesBlock, layer as FilesLayer } from '../src/input-message-files.js'

const first = { id: 'first', name: 'first.png', type: 'image/png', size: 10, lastModified: 1 }
const second = { id: 'second', name: 'second.png', type: 'image/png', size: 20, lastModified: 2 }
const composer = { block: InputMessageBlock, layer: InputMessageLayer }
const files = { block: InputMessageFilesBlock, layer: FilesLayer }

test.effect(
  'removing the final file retains its region payload and thumbnail until region retirement',
  () =>
    Story.story(
      composer,
      Story.init({
        id: 'composer',
        value: '',
        reduceMotion: false,
        supportsFiles: true,
        files: [first, second],
      }),
      Story.inMessage(InputMessageBlock.InMessage.RequestedRemoveFile({ index: 0 })),
      Story.model((model) => {
        expect(model.files.map((file) => file.id)).toEqual(['second'])
        expect(model.filesRegion.presence.phase).toBe('Present')
        expect(model.filesView.slots.find((slot) => slot.file.id === 'first')?.present).toBe(false)
      }),
      Story.inMessage(InputMessageBlock.InMessage.RequestedRemoveFile({ index: 0 })),
      Story.model((model) => {
        expect(model.files).toEqual([])
        expect(model.filesRegion.presence.phase).toBe('Exiting')
        expect(model.filesRegion.payload).toEqual(Payload.cases.Files.make({ items: [second] }))
        expect(model.filesView.thumbnails.second).toBeDefined()
      }),
      Story.Command.expectNone(),
    ),
)

test.effect(
  'file owner retirement releases thumbnail models and rejects a stale tile completion',
  () =>
    Effect.gen(function* retirement() {
      const retired = yield* Story.story(
        files,
        Story.init({ id: 'files', files: [first], size: 80, removable: true }),
        Story.message(InputMessageFilesBlock.Message.RequestedRemove({ id: first.id })),
        Story.inMessage(InputMessageFilesBlock.InMessage.RequestedReset()),
        Story.model((model) => {
          expect(model.slots).toEqual([])
          expect(model.thumbnails).toEqual({})
        }),
      )
      yield* Story.story(
        files,
        Story.given(retired),
        Story.message(
          InputMessageFilesBlock.Message.CompletedExit({ id: first.id, generation: 1 }),
        ),
        Story.model((model) => {
          expect(model).toEqual(retired)
        }),
        Story.Command.expectNone(),
      )
    }),
)

test.effect('removing the final queued message retains its row until outer retirement', () => {
  const firstMessage = { id: 'first', text: 'First queued message', files: [] }
  const secondMessage = { id: 'second', text: 'Second queued message', files: [] }
  return Story.story(
    composer,
    Story.init({
      id: 'composer',
      value: '',
      reduceMotion: false,
      status: 'streaming',
      supportsQueue: true,
      queue: [firstMessage, secondMessage],
    }),
    Story.inMessage(InputMessageBlock.InMessage.RequestedRemoveQueued({ id: 'first' })),
    Story.model((model) => {
      expect(model.queue.map((item) => item.id)).toEqual(['second'])
      expect(model.queueRegion.presence.phase).toBe('Present')
    }),
    Story.inMessage(InputMessageBlock.InMessage.RequestedRemoveQueued({ id: 'second' })),
    Story.model((model) => {
      expect(model.queue).toEqual([])
      expect(model.queueRegion.presence.phase).toBe('Exiting')
      expect(model.queueRegion.payload).toEqual(
        Payload.cases.Queue.make({ items: [secondMessage] }),
      )
      expect(model.queueView.slots.some((slot) => slot.item.id === 'second')).toBe(true)
    }),
    Story.Command.expectNone(),
  )
})

test.effect(
  'unchanged region measurements preserve layout owners while new heights update their targets',
  () =>
    Effect.gen(function* measurements() {
      const measured = yield* Story.story(
        composer,
        Story.init({
          id: 'measured',
          value: '',
          reduceMotion: false,
          supportsFiles: true,
          files: [first],
        }),
        Story.message(
          InputMessageBlock.Message.CapturedMeasure({
            filesHeight: 84,
            queueHeight: null,
            suggestionsHeight: null,
          }),
        ),
      )
      yield* Story.story(
        composer,
        Story.given(measured),
        Story.message(
          InputMessageBlock.Message.CapturedMeasure({
            filesHeight: 84,
            queueHeight: null,
            suggestionsHeight: null,
          }),
        ),
        Story.model((model) => {
          expect(model).toBe(measured)
        }),
        Story.message(
          InputMessageBlock.Message.CapturedMeasure({
            filesHeight: null,
            queueHeight: null,
            suggestionsHeight: null,
          }),
        ),
        Story.model((model) => {
          expect(model).toBe(measured)
        }),
        Story.message(
          InputMessageBlock.Message.CapturedMeasure({
            filesHeight: 112,
            queueHeight: null,
            suggestionsHeight: null,
          }),
        ),
        Story.model((model) => {
          expect(Option.getOrNull(model.filesHeight)).toBe(112)
          expect(Option.getOrNull(model.filesRegion.height)).toBe(112)
        }),
        Story.Command.expectNone(),
      )
    }),
)
