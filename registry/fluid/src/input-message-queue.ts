import { modifyFields } from 'foldkit/struct'
import type { DocumentTooltipOccurrenceViewInputs } from './tooltip-native-public.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Array, Data, Layer, Option, Result, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { QueuedMessage, inputMessageRemoveTooltipKey } from './input-message-domain.js'
import { fontWeights } from './lib/font-weight.js'
import type { InputMessageQueueKey as ObservedQueueKey } from './input-message-queue-native.js'
import { InputMessageQueueNative } from './input-message-queue-native.js'
import { InputMessageQueueRow, inputMessageQueueLabel } from './input-message-parts.js'
import { ReorderBlock, layer as ReorderLayer, reorderItemAttributes } from './reorder.js'
import type { ReorderConfig, ReorderScope, ReorderViewInputs } from './reorder.js'
import type { Presentation } from './presentation.js'

const Slot = Schema.Struct({
  item: QueuedMessage,
  index: Schema.Natural,
  total: Schema.Natural,
  present: Schema.Boolean,
  initial: Schema.Boolean,
  generation: Schema.Natural,
})

const Model = Schema.Struct({
  id: Schema.String,
  slots: Schema.Array(Slot),
  reorder: ReorderBlock.Model,
})

const Message = defineMessageUnion({
  RequestedEdit: { id: Schema.String },
  RequestedRemove: { id: Schema.String },
  RequestedMove: { id: Schema.String, direction: Schema.Literals([-1, 1]) },
  CompletedExit: { id: Schema.String, generation: Schema.Natural },
})

export const InMessage = defineInMessageUnion({
  RequestedConfigure: {
    animateNew: Schema.Boolean,
    reset: Schema.Boolean,
    items: Schema.Array(QueuedMessage),
  },
})

const OutMessage = defineMessageUnion({
  Retired: { id: Schema.String },
  EditRequested: { id: Schema.String },
  RemoveRequested: { id: Schema.String },
  OrderRequested: { ids: Schema.Array(Schema.String) },
})

const { OnCustomEvent } =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

export const InputMessageQueueKey = Symbol('FluidInputMessageQueue')

const effects = Block.makeEffectsContract<never, InputMessageQueueNative>()

export const InputMessageQueueBlock = Block.make('InputMessageQueue', {
  key: InputMessageQueueKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({ id: Schema.String, items: Schema.Array(QueuedMessage) }),
  ]),
  InMessage,
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<InputMessageQueueViewInputs>() },
  Model,
  Message,
  OutMessage,
})

type RowRequest = ReturnType<
  typeof Message.RequestedEdit | typeof Message.RequestedRemove | typeof Message.RequestedMove
>

const ObserveRow = InputMessageQueueBlock.makeMountStream('ObserveRow', {
  args: { id: Schema.String },
  messages: [Message.RequestedEdit, Message.RequestedRemove, Message.RequestedMove],
  *handler() {
    const native = yield* InputMessageQueueNative

    return ({ element, viewStateChanges, id }) =>
      native.observe(element, viewStateChanges).pipe(
        Stream.filterMap<ObservedQueueKey, RowRequest, void>(({ key, alt }) => {
          if (key === 'Enter' || key === 'F2') {
            return Result.succeed(Message.RequestedEdit({ id })) satisfies Result.Result<
              RowRequest,
              void
            >
          }

          if (key === 'Delete' || key === 'Backspace') {
            return Result.succeed(Message.RequestedRemove({ id })) satisfies Result.Result<
              RowRequest,
              void
            >
          }

          if (alt && (key === 'ArrowUp' || key === 'ArrowDown')) {
            return Result.succeed(
              Message.RequestedMove({ id, direction: key === 'ArrowUp' ? -1 : 1 }),
            ) satisfies Result.Result<RowRequest, void>
          }

          return Result.failVoid satisfies Result.Result<RowRequest, void>
        }),
      )
  },
})

export interface InputMessageQueueConfig {
  readonly id: string
  readonly items: ReadonlyArray<QueuedMessage>
}

const Reorder = InputMessageQueueBlock.makeRequiredFieldBinding(ReorderBlock, {
  field: 'reorder',
  init: {
    contextToArgs: (config: InputMessageQueueConfig) =>
      [{ id: config.id, ids: config.items.map((item) => item.id), axis: 'y' }] satisfies [
        ReorderConfig,
      ],
  },
}).withOutMessagePolicy({
  fold: InputMessageQueueBlock.makeOutMessageFold(ReorderBlock, {
    OrderRequested: ({ ids }) =>
      InputMessageQueueBlock.makeStep((model) => ({
        model,
        outMessage: OutMessage.OrderRequested({ ids }),
      })),
  }),
})

const InputMessageQueueComposition = InputMessageQueueBlock.makeComposition({
  bindings: [Reorder],
  mounts: [ObserveRow],
})

const init = InputMessageQueueComposition.makeInit((config: InputMessageQueueConfig) => ({
  model: {
    id: config.id,
    slots: config.items.map((item, index) => ({
      item,
      index,
      total: config.items.length,
      present: true,
      initial: false,
      generation: 0,
    })),
  },
  childInitContext: config,
}))

const update = InputMessageQueueComposition.makeUpdate({
  RequestedEdit: (model, { id }) => ({ model, outMessage: OutMessage.EditRequested({ id }) }),
  RequestedRemove: (model, { id }) => ({ model, outMessage: OutMessage.RemoveRequested({ id }) }),
  RequestedMove: (model, { id, direction }) => {
    const ids = [...model.reorder.ids]
    const index = ids.indexOf(id)
    const other = ids[index + direction]

    if (index === -1 || other === undefined) {
      return { model }
    }

    ids[index] = other
    ids[index + direction] = id

    return { model, outMessage: OutMessage.OrderRequested({ ids }) }
  },
  CompletedExit: (model, { id, generation }) => {
    const slot = model.slots.find((candidate) => candidate.item.id === id)

    return !slot || slot.present || slot.generation !== generation
      ? { model }
      : {
          model: modifyFields(model, {
            slots: Array.filter((candidate) => candidate.item.id !== id),
          }),
          outMessage: OutMessage.Retired({ id }),
        }
  },
})

const inMessageUpdate = InputMessageQueueComposition.makeInMessageUpdate({
  RequestedConfigure: InputMessageQueueBlock.makeStep(
    (_model, { items, animateNew, reset }: typeof InMessage.RequestedConfigure.Type) =>
      Update.combineSteps([
        InputMessageQueueBlock.makeFieldsStep(() => ({
          slots: (previous) => {
            const slots = items.map((item, index) => {
              const slot = reset
                ? undefined
                : previous.find((candidate) => candidate.item.id === item.id)

              return slot
                ? modifyFields(slot, {
                    index: () => index,
                    total: () => items.length,
                    initial: () => animateNew && slot.initial,
                    item: () => item,
                    present: () => true,
                    generation: () => (slot.present ? slot.generation : slot.generation + 1),
                  })
                : {
                    item,
                    index,
                    total: items.length,
                    present: true,
                    initial: animateNew,
                    generation: 0,
                  }
            })

            if (!reset) {
              for (const [index, slot] of previous.entries()) {
                if (!items.some((item) => item.id === slot.item.id)) {
                  slots.splice(
                    index,
                    0,
                    modifyFields(slot, {
                      present: () => false,
                      generation: () => (slot.present ? slot.generation + 1 : slot.generation),
                    }),
                  )
                }
              }
            }

            return slots
          },
        })),
        Reorder.requestConfigure({ ids: items.map((item) => item.id) }),
      ]),
  ),
})

export interface InputMessageQueueViewInputs extends Presentation {
  readonly getReorder: () => ReorderScope
  readonly isTouch: boolean
  readonly reduceMotion: boolean
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly retainedItems?: ReadonlyArray<QueuedMessage>
  readonly tooltip: (
    context: { readonly trigger: DocumentTooltipOccurrenceViewInputs['trigger'] },
    options: {
      readonly key: string
      readonly shapeClass: string
      readonly content: string
      readonly side: 'top'
    },
  ) => Html
}

const view = InputMessageQueueComposition.makeView.withInputs<InputMessageQueueViewInputs>(
  (model, inputs, h) => {
    const renderIds =
      inputs.retainedItems === undefined
        ? [...model.reorder.ids]
        : inputs.retainedItems.map((item) => item.id)

    for (const [index, slot] of model.slots.entries()) {
      if (!slot.present && !renderIds.includes(slot.item.id)) {
        renderIds.splice(index, 0, slot.item.id)
      }
    }

    const viewInputs: ReorderViewInputs = {
      className: 'flex flex-col gap-1 pb-1',
      getReorder: inputs.getReorder,
      renderIds,
      renderItem: (id, decorate) => {
        const slot = model.slots.find((candidate) => candidate.item.id === id)

        if (!slot) {
          throw new Error('InputMessage queue rendered an unknown retained identity')
        }

        const index = model.reorder.ids.indexOf(id)

        const completion: Attribute<typeof Message.Type> = OnCustomEvent({
          name: 'fluid-exit-complete',
          f: (event) =>
            event.currentTarget === event.target
              ? Option.some(Message.CompletedExit({ id, generation: slot.generation }))
              : Option.none(),
        })

        const remove = h.OnClick(Message.RequestedRemove({ id }), { propagation: 'Stop' })

        return InputMessageQueueRow(
          {
            ...inputs,
            tooltipKey: inputMessageRemoveTooltipKey(model.id, slot.item.id),
            item: slot.item,
            index: slot.present ? Math.max(0, index) : slot.index,
            total: slot.present ? model.reorder.ids.length : slot.total,
            present:
              slot.present ||
              inputs.retainedItems?.some((item) => item.id === slot.item.id) === true,
            initial: slot.initial,
            animate: decorate,
            attributes: [
              ...reorderItemAttributes('y', { fontVariationSettings: fontWeights.normal }),
              ...childAttributes([h.OnDoubleClick(Message.RequestedEdit({ id })), completion]),
            ],
            labelNode: h.span(
              [
                h.Class('min-w-0 flex-1 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1'),
                h.OnMount(ObserveRow({ id })),
              ],
              [inputMessageQueueLabel(slot.item)],
            ),
            removeAttributes: childAttributes([h.DataAttribute('im-stop-pointer', ''), remove]),
          },
          h,
        )
      },
    }

    return h.block(
      Reorder.embedView({
        slotId: model.reorder.id,
        model: model.reorder,
        viewInputs:
          inputs.attributes === undefined
            ? viewInputs
            : { ...viewInputs, attributes: inputs.attributes },
      }),
    )
  },
)

export const layer = InputMessageQueueBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: ObserveRow.layer,
}).pipe(Layer.provide(ReorderLayer))

export { createInputMessageQueueNativeLayer } from './input-message-queue-native.js'

export { QueuedMessage, inputMessageRemoveTooltipKey } from './input-message-domain.js'

export { InputMessageQueueNative } from './input-message-queue-native.js'

export { InputMessageQueueRow } from './input-message-parts.js'
