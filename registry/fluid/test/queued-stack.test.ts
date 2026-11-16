import { it } from '@effect/vitest'
import { Effect, Layer, Stream } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { QueuedStackBlock, QueuedStackFrames, layer } from '../src/queued-stack.js'
import { FileThumbnailResourcesServerLayer } from '../src/file-thumbnail-resources.js'
import { InputMessageQueueBlock, layer as QueueLayer } from '../src/input-message-queue.js'
import { InputMessageQueueNative } from '../src/input-message-queue-native.js'

const first = {
  id: 'first',
  text: 'First',
  files: [{ id: 'preview', name: 'preview.png', type: 'image/png', size: 10, lastModified: 0 }],
}

const second = { id: 'second', text: 'Second', files: [] }

const subject = {
  block: QueuedStackBlock,
  layer: layer.pipe(
    Layer.provide(
      Layer.merge(
        FileThumbnailResourcesServerLayer,
        Layer.succeed(QueuedStackFrames, { next: Effect.void }),
      ),
    ),
  ),
}

const queueSubject = {
  block: InputMessageQueueBlock,
  layer: QueueLayer.pipe(
    Layer.provide(Layer.succeed(InputMessageQueueNative, { observe: () => Stream.never })),
  ),
}

it.effect(
  'retains thumbnails through whole-stack exit and rejects an interrupted exit completion',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'stack', queue: [first, second] }),
      Story.inMessage(QueuedStackBlock.InMessage.RequestedConfigure({ queue: [], compact: false })),
      Story.model((model) => {
        expect(model.rootPresent).toBe(false)
        expect(model.rootVisible).toBe(true)
        expect(model.slots.map((slot) => slot.item.id)).toEqual(['first', 'second'])
        expect(Object.keys(model.thumbnails)).toHaveLength(1)
      }),
      Story.inMessage(
        QueuedStackBlock.InMessage.RequestedConfigure({ queue: [first], compact: false }),
      ),
      Story.message(QueuedStackBlock.Message.CompletedRoot({ generation: 1 })),
      Story.model((model) => {
        expect(model.rootPresent).toBe(true)
        expect(model.rootVisible).toBe(true)
        expect(Object.keys(model.thumbnails)).toHaveLength(1)
      }),
      Story.inMessage(QueuedStackBlock.InMessage.RequestedConfigure({ queue: [], compact: false })),
      Story.message(QueuedStackBlock.Message.CompletedRoot({ generation: 3 })),
      Story.model((model) => {
        expect(model.rootVisible).toBe(false)
        expect(model.slots).toEqual([])
        expect(model.thumbnails).toEqual({})
      }),
    ),
)

it.effect(
  'inline removal retains already-exiting rows and a revived row rejects old completion',
  () =>
    Story.story(
      queueSubject,
      Story.init({ id: 'queue', items: [first, second] }),
      Story.inMessage(
        InputMessageQueueBlock.InMessage.RequestedConfigure({
          items: [second],
          animateNew: true,
          reset: false,
        }),
      ),
      Story.inMessage(
        InputMessageQueueBlock.InMessage.RequestedConfigure({
          items: [],
          animateNew: true,
          reset: false,
        }),
      ),
      Story.model((model) => {
        expect(model.slots.map((slot) => slot.item.id)).toEqual(['first', 'second'])
        expect(model.slots.every((slot) => !slot.present)).toBe(true)
      }),
      Story.inMessage(
        InputMessageQueueBlock.InMessage.RequestedConfigure({
          items: [first],
          animateNew: true,
          reset: false,
        }),
      ),
      Story.message(InputMessageQueueBlock.Message.CompletedExit({ id: 'first', generation: 1 })),
      Story.model((model) => {
        expect(model.slots.find((slot) => slot.item.id === 'first')?.present).toBe(true)
        expect(model.reorder.ids).toEqual(['first'])
      }),
    ),
)

it.effect('keeps inline keyboard order pending until parent acceptance', () =>
  Story.story(
    queueSubject,
    Story.init({ id: 'controlled-queue', items: [first, second] }),
    Story.message(InputMessageQueueBlock.Message.RequestedMove({ id: 'first', direction: 1 })),
    Story.expectOutMessage(
      InputMessageQueueBlock.OutMessage.OrderRequested({ ids: ['second', 'first'] }),
    ),
    Story.model((model) => {
      expect(model.reorder.ids).toEqual(['first', 'second'])
      expect(model.slots.map((slot) => slot.item.id)).toEqual(['first', 'second'])
    }),
    Story.inMessage(
      InputMessageQueueBlock.InMessage.RequestedConfigure({
        items: [second, first],
        animateNew: true,
        reset: false,
      }),
    ),
    Story.model((model) => {
      expect(model.reorder.ids).toEqual(['second', 'first'])
      expect(model.slots.map((slot) => slot.item.id)).toEqual(['second', 'first'])
    }),
  ),
)

for (const intent of ['edit', 'remove']) {
  it.effect(`does not retire a refused inline ${intent} request`, () =>
    Story.story(
      queueSubject,
      Story.init({ id: 'refused-removal', items: [first, second] }),
      Story.message(
        intent === 'edit'
          ? InputMessageQueueBlock.Message.RequestedEdit({ id: 'first' })
          : InputMessageQueueBlock.Message.RequestedRemove({ id: 'first' }),
      ),
      Story.model((model) => {
        expect(model.reorder.ids).toEqual(['first', 'second'])
        expect(model.slots.every((slot) => slot.present && slot.generation === 0)).toBe(true)
      }),
      Story.inMessage(
        InputMessageQueueBlock.InMessage.RequestedConfigure({
          items: [second],
          animateNew: true,
          reset: false,
        }),
      ),
      Story.model((model) => {
        expect(model.reorder.ids).toEqual(['second'])
        expect(model.slots.find((slot) => slot.item.id === 'first')?.present).toBe(false)
        expect(model.slots.find((slot) => slot.item.id === 'first')?.generation).toBe(1)
      }),
    ),
  )
}
