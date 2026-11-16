import { makeInitIfMissingStep } from 'foldkit/binding'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Data, Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { Attribute, TaggedAttribute } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { FileThumbnailBlock, layer as FileThumbnailLayer } from './file-thumbnail.js'
import type { FileThumbnailResources, FileThumbnailConfig } from './file-thumbnail.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { QueuedMessage } from './input-message-domain.js'
import {
  observeQueuedStack,
  QueuedStackFrames,
  stackObservationFields,
} from './queued-stack-observer.js'
import {
  stackConfigurationFields,
  QUEUE_CARD_H,
  QUEUE_CARD_H_COMPACT,
  stackCardHeight,
  stackExpanded,
  stackFields,
  stackFileKey,
} from './queued-stack-state.js'
import type { StackState } from './queued-stack-state.js'
import { queuedStackPaint } from './queued-stack-view.js'
import type { QueuedStackViewInputs } from './queued-stack-view.js'

const Model = Schema.Struct({
  ...stackFields,
  thumbnails: Schema.Record(Schema.String, FileThumbnailBlock.Model),
})

type Model = typeof Model.Type

const Message = defineMessageUnion({
  ...stackObservationFields,
  Hovered: { hovered: Schema.Boolean },
  Tapped: {},
  Collapsed: {},
  RequestedEdit: { id: Schema.String },
  RequestedRemove: { id: Schema.String },
  CompletedRoot: { generation: Schema.Natural },
  CompletedCard: { id: Schema.String, generation: Schema.Natural },
  CompletedCount: { generation: Schema.Natural },
  CompletedBumpFrame: { generation: Schema.Natural },
})

export const InMessage = defineInMessageUnion({
  RequestedConfigure: {
    queue: Schema.Array(QueuedMessage),
    compact: Schema.Boolean,
    bottom: Schema.optionalKey(Schema.Finite),
  },
  RequestedCollapse: {},
})

const OutMessage = defineMessageUnion({
  PresentationChanged: {},
  QueueChanged: { queue: Schema.Array(QueuedMessage) },
  EditRequested: { item: QueuedMessage },
  RemoveRequested: { item: QueuedMessage },
})

export const QueuedStackKey = Symbol('FluidQueuedStack')

const effects = Block.makeEffectsContract<never, QueuedStackFrames | FileThumbnailResources>()

export const QueuedStackBlock = Block.make('QueuedStack', {
  key: QueuedStackKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      queue: Schema.Array(QueuedMessage),
      compact: Schema.optionalKey(Schema.Boolean),
      bottom: Schema.optionalKey(Schema.Finite),
    }),
  ]),
  InMessage,
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<QueuedStackViewInputs>() },
  inMessageOutputs: { RequestedCollapse: { outMessage: OutMessage.PresentationChanged } },
  Model,
  Message,
  OutMessage,
})

const Observe = QueuedStackBlock.makeMountStream('ObserveQueuedStack', {
  messages: [
    Message.ObservedTouch,
    Message.PointerStarted,
    Message.PointerMoved,
    Message.PointerEnded,
  ],
  *handler() {
    return ({ element, viewStateChanges }) => observeQueuedStack(element, viewStateChanges)
  },
})

// A zero-duration reset followed by the next paint reproduces controls.set(-7), then start(0).
const QueuedStackBumpFrame = QueuedStackBlock.makeCommand('QueuedStackBumpFrame', {
  args: { generation: Schema.Natural },
  messages: [Message.CompletedBumpFrame],
  *handler() {
    const frames = yield* QueuedStackFrames

    return ({ generation }) =>
      frames.next.pipe(Effect.as(Message.CompletedBumpFrame({ generation })))
  },
})

const Thumbnail = QueuedStackBlock.makeRecordBinding(FileThumbnailBlock, {
  field: 'thumbnails',
})

const initializeThumbnail = (options: {
  readonly key: string
  readonly args: [FileThumbnailConfig]
}) => makeInitIfMissingStep(Thumbnail, options)

const QueuedStackComposition = QueuedStackBlock.makeComposition({
  bindings: [Thumbnail],
  mounts: [Observe],
})

export interface QueuedStackConfig {
  readonly id: string
  readonly queue: ReadonlyArray<typeof QueuedMessage.Type>
  readonly compact?: boolean
  readonly bottom?: number
}

const init = QueuedStackComposition.makeInit((config: QueuedStackConfig) => ({
  model: {
    id: config.id,
    bottom: config.bottom ?? 0,
    queue: config.queue,
    slots: config.queue.map((item) => ({ item, present: true, initial: false, generation: 0 })),
    compact: config.compact ?? false,
    hovered: false,
    touch: false,
    tapExpanded: false,
    pointerDownId: null,
    draggingId: null,
    startY: 0,
    dragY: 0,
    exitSnapshot: null,
    rootVisible: config.queue.length > 0,
    rootPresent: config.queue.length > 0,
    rootGeneration: 0,
    countPaint: config.queue.length > 3 ? config.queue.length : null,
    countPresent: config.queue.length > 3,
    countGeneration: 0,
    bump: false,
    bumpGeneration: 0,
    thumbnails: {},
  },
  steps: config.queue.flatMap((item) =>
    item.files.slice(0, 3).map((file, index) =>
      initializeThumbnail({
        key: stackFileKey(item, index),
        args: [
          {
            id: `${config.id}-file-${encodeURIComponent(stackFileKey(item, index))}`,
            file,
            size: config.compact === true ? 24 : 28,
          },
        ],
      }),
    ),
  ),
}))

const pruneThumbnails = (model: Model, slots: StackState['slots']) =>
  Object.fromEntries(
    Object.entries(model.thumbnails).filter(([key]) =>
      slots.some(({ item }) =>
        item.files.slice(0, 3).some((_file, index) => stackFileKey(item, index) === key),
      ),
    ),
  )

const update = QueuedStackComposition.makeUpdate({
  ObservedTouch: (model, { touch }) => ({
    model: modifyFields(model, { touch: () => touch }),
    outMessage: OutMessage.PresentationChanged(),
  }),
  Hovered: (model, { hovered }) => ({
    model: modifyFields(model, { hovered: () => hovered }),
    outMessage: OutMessage.PresentationChanged(),
  }),
  Tapped: (model) => ({
    model:
      model.touch && !stackExpanded(model)
        ? modifyFields(model, { tapExpanded: () => true })
        : model,
    outMessage: OutMessage.PresentationChanged(),
  }),
  Collapsed: (model) => ({
    model: modifyFields(model, { tapExpanded: () => false }),
    outMessage: OutMessage.PresentationChanged(),
  }),
  PointerStarted: (model, { id, y }) => {
    const index = model.queue.findIndex((item) => item.id === id)

    return {
      model:
        index === -1 || !stackExpanded(model)
          ? model
          : modifyFields(model, {
              pointerDownId: () => id,
              startY: () => y,
              dragY: () => -index * (stackCardHeight(model) + 8),
            }),
      outMessage: OutMessage.PresentationChanged(),
    }
  },
  PointerMoved: (model, { y, bottom }) => {
    if (
      model.pointerDownId === null ||
      (model.draggingId === null && Math.abs(y - model.startY) < 4)
    ) {
      return { model }
    }

    const cardH = stackCardHeight(model)
    const index = model.queue.findIndex((item) => item.id === model.pointerDownId)

    const slot = Math.max(
      0,
      Math.min(model.queue.length - 1, Math.floor((bottom - y) / (cardH + 8))),
    )

    const queue = [...model.queue]
    const item = queue[index]

    if (item && index !== slot) {
      queue.splice(index, 1)
      queue.splice(slot, 0, item)
    }

    const moved = {
      model: modifyFields(model, {
        draggingId: () => model.pointerDownId,
        dragY: () =>
          Math.max(-(model.queue.length - 1) * (cardH + 8), Math.min(0, y - bottom + cardH / 2)),
      }),
    }

    return item && index !== slot
      ? { ...moved, outMessage: OutMessage.QueueChanged({ queue }) }
      : moved
  },
  PointerEnded: (model) => ({
    model: modifyFields(model, { pointerDownId: () => null, draggingId: () => null }),
    outMessage: OutMessage.PresentationChanged(),
  }),
  RequestedEdit: (model, { id }) => {
    const slot = model.slots.find((entry) => entry.item.id === id)

    return slot ? { model, outMessage: OutMessage.EditRequested({ item: slot.item }) } : { model }
  },
  RequestedRemove: (model, { id }) => {
    const slot = model.slots.find((entry) => entry.item.id === id)

    return slot ? { model, outMessage: OutMessage.RemoveRequested({ item: slot.item }) } : { model }
  },
  CompletedCount: (model, { generation }) => ({
    model:
      generation === model.countGeneration && !model.countPresent
        ? modifyFields(model, { countPaint: () => null })
        : model,
  }),
  CompletedBumpFrame: (model, { generation }) => ({
    model: generation === model.bumpGeneration ? modifyFields(model, { bump: () => false }) : model,
  }),
  CompletedRoot: (model, { generation }) =>
    generation === model.rootGeneration && !model.rootPresent
      ? {
          model: modifyFields(model, {
            exitSnapshot: () => null,
            rootVisible: () => false,
            slots: () => [],
            thumbnails: () => ({}),
            countPaint: () => null,
            countPresent: () => false,
          }),
          outMessage: OutMessage.PresentationChanged(),
        }
      : { model },
  CompletedCard: (model, { id, generation }) => {
    if (!model.rootPresent) {
      return { model }
    }

    const slots = model.slots.filter(
      (slot) => slot.item.id !== id || slot.present || slot.generation !== generation,
    )

    return slots.length === model.slots.length
      ? { model }
      : {
          model: modifyFields(model, {
            slots: () => slots,
            thumbnails: () => pruneThumbnails(model, slots),
          }),
          outMessage: OutMessage.PresentationChanged(),
        }
  },
})

const { OnCustomEvent } =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const inMessageUpdate = QueuedStackComposition.makeInMessageUpdate({
  RequestedConfigure: QueuedStackBlock.makeStep(
    (model, { queue, compact, bottom }: typeof InMessage.RequestedConfigure.Type) => {
      const next = modifyFields(model, stackConfigurationFields(model, queue, compact, bottom))
      const thumbnails = pruneThumbnails(model, next.slots)

      return Update.combineSteps([
        QueuedStackBlock.makeStep(() => ({
          model: modifyFields(next, { thumbnails: () => thumbnails }),
          commands:
            next.bumpGeneration === model.bumpGeneration
              ? []
              : [QueuedStackBumpFrame({ generation: next.bumpGeneration })],
        })),
        ...queue.flatMap((item) =>
          item.files.slice(0, 3).map((file, index) =>
            thumbnails[stackFileKey(item, index)]
              ? Thumbnail.requestConfigure(stackFileKey(item, index), {
                  file,
                  size: compact ? 24 : 28,
                })
              : initializeThumbnail({
                  key: stackFileKey(item, index),
                  args: [
                    {
                      id: `${model.id}-file-${encodeURIComponent(stackFileKey(item, index))}`,
                      file,
                      size: compact ? 24 : 28,
                    },
                  ],
                }),
          ),
        ),
      ])
    },
  ),
  RequestedCollapse: (model) => ({
    model: modifyFields(model, { tapExpanded: () => false }),
    outMessage: OutMessage.PresentationChanged(),
  }),
})

const view = QueuedStackComposition.makeView.withInputs<QueuedStackViewInputs>(
  (model, inputs, h) => {
    const completion = (
      name: string,
      message: typeof Message.Type,
    ): TaggedAttribute<typeof Message.Type> =>
      OnCustomEvent({
        name,
        f: (event) => (event.target === event.currentTarget ? Option.some(message) : Option.none()),
      })

    const actionBoundary = h.DataAttribute('queued-stack-action', '')
    const action = (message: typeof Message.Type) => h.OnClick(message, { propagation: 'Stop' })

    return h.div(
      [h.Class('contents'), h.OnMount(Observe())],
      [
        queuedStackPaint(
          model,
          inputs,
          {
            root: childAttributes([
              h.OnMouseEnter(Message.Hovered({ hovered: true })),
              h.OnMouseLeave(Message.Hovered({ hovered: false })),
              completion(
                `fluid-stack-root-${model.rootGeneration}`,
                Message.CompletedRoot({ generation: model.rootGeneration }),
              ),
            ]),
            count: childAttributes([
              completion(
                `fluid-stack-count-${model.countGeneration}`,
                Message.CompletedCount({ generation: model.countGeneration }),
              ),
            ]),
            card: (slot) =>
              childAttributes([
                h.OnClick(Message.Tapped()),
                h.OnDoubleClick(Message.RequestedEdit({ id: slot.item.id })),
                completion(
                  `fluid-stack-card-${slot.generation}`,
                  Message.CompletedCard({ id: slot.item.id, generation: slot.generation }),
                ),
              ]),
            edit: (id) => childAttributes([actionBoundary, action(Message.RequestedEdit({ id }))]),
            remove: (id) =>
              childAttributes([actionBoundary, action(Message.RequestedRemove({ id }))]),
            collapse: childAttributes([actionBoundary, action(Message.Collapsed())]),
            thumbnail: (item, index, radius) => {
              const key = stackFileKey(item, index)
              const thumbnail = model.thumbnails[key]

              if (!thumbnail) {
                throw new Error('QueuedStack thumbnail Binding is missing')
              }

              return h.block(
                Thumbnail.embedView({
                  key,
                  slotId: thumbnail.id,
                  model: thumbnail,
                  viewInputs: { context: createPresentationContext(inputs), radius },
                }),
              )
            },
          },
          h,
        ),
      ],
    )
  },
)

const implementation = {
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.merge(Observe.layer, QueuedStackBumpFrame.layer),
}

export const layer = QueuedStackBlock.makeLayer<typeof implementation>(implementation).pipe(
  Layer.provide(FileThumbnailLayer),
)

export { QUEUE_CARD_H, QUEUE_CARD_H_COMPACT, collapsedStackHeight } from './queued-stack-state.js'

export type { QueuedStackViewInputs } from './queued-stack-view.js'

export { QueuedStackFrames, createQueuedStackFramesLayer } from './queued-stack-observer.js'

export const queueCardHeight = (presentation: Presentation = {}) =>
  resolvePresentation(presentation).size.variant === 'compact' ? QUEUE_CARD_H_COMPACT : QUEUE_CARD_H

export { queuedStackTooltipDescriptors } from './queued-stack-view.js'
