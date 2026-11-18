import { makeInitIfMissingStep } from 'foldkit/binding'
import { modifyFields } from 'foldkit/struct'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { DocumentTooltipOccurrenceViewInputs } from './tooltip-native-public.js'
import { Array, Data, Layer, Option, Record as EffectRecord, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { FileThumbnailResources } from './file-thumbnail-resources.js'
import { FileThumbnailBlock, layer as FileThumbnailLayer } from './file-thumbnail.js'
import type { FileThumbnailConfig } from './file-thumbnail.js'
import { MessageFile, inputMessageRemoveTooltipKey } from './input-message-domain.js'
import { InputMessageFileTile } from './input-message-parts.js'
import type { MotionOptions } from './motion.js'
import type { Presentation } from './presentation.js'

const Slot = Schema.Struct({
  file: MessageFile,
  present: Schema.Boolean,
  initial: Schema.Boolean,
  generation: Schema.Natural,
})

const Model = Schema.Struct({
  id: Schema.String,
  removable: Schema.Boolean,
  size: Schema.Finite,
  slots: Schema.Array(Slot),
  thumbnails: Schema.Record(Schema.String, FileThumbnailBlock.Model),
})

const InMessage = defineInMessageUnion({
  RequestedConfigure: {
    removable: Schema.Boolean,
    animateNew: Schema.Boolean,
    files: Schema.Array(MessageFile),
    size: Schema.Finite,
  },
  RequestedReset: {},
})

const Message = defineMessageUnion({
  RequestedRemove: { id: Schema.String },
  CompletedExit: { id: Schema.String, generation: Schema.Natural },
})

const OutMessage = defineMessageUnion({
  Retired: { id: Schema.String },
  RemoveRequested: { id: Schema.String },
})

const { OnCustomEvent } =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

export const InputMessageFilesKey = Symbol('FluidInputMessageFiles')

const effects = Block.makeEffectsContract<never, FileThumbnailResources>()

export const InputMessageFilesBlock = Block.make('InputMessageFiles', {
  key: InputMessageFilesKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      files: Schema.Array(MessageFile),
      size: Schema.Finite,
      removable: Schema.Boolean,
    }),
  ]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<InputMessageFilesViewInputs>() },
  effects,
})

const Thumbnail = InputMessageFilesBlock.makeRecordBinding(FileThumbnailBlock, {
  field: 'thumbnails',
})

const initializeThumbnail = (options: {
  readonly key: string
  readonly args: [FileThumbnailConfig]
}) => makeInitIfMissingStep(Thumbnail, options)

const InputMessageFilesComposition = InputMessageFilesBlock.makeComposition({
  bindings: [Thumbnail],
})

export interface InputMessageFilesConfig {
  readonly id: string
  readonly files: ReadonlyArray<MessageFile>
  readonly size: number
  readonly removable: boolean
}

const init = InputMessageFilesComposition.makeInit((config: InputMessageFilesConfig) => ({
  model: {
    id: config.id,
    removable: config.removable,
    size: config.size,
    slots: config.files.map((file) => ({ file, present: true, initial: false, generation: 0 })),
    thumbnails: {},
  },
  steps: config.files.map((file) =>
    initializeThumbnail({
      key: file.id,
      args: [{ id: `${config.id}-thumb-${encodeURIComponent(file.id)}`, file, size: config.size }],
    }),
  ),
}))

const inMessageUpdate = InputMessageFilesComposition.makeInMessageUpdate({
  RequestedConfigure: InputMessageFilesBlock.makeStep(
    (model, { files, size, animateNew, removable }: typeof InMessage.RequestedConfigure.Type) =>
      Update.combineSteps([
        InputMessageFilesBlock.makeFieldsStep(() => ({
          size: () => size,
          removable: () => removable,
          slots: (previous) => {
            const slots = files.map((file) => {
              const previousSlot = previous.find((candidate) => candidate.file.id === file.id)

              return previousSlot
                ? modifyFields(previousSlot, {
                    initial: (initial) => animateNew && initial,
                    file: () => file,
                    present: () => true,
                    generation: (generation) =>
                      previousSlot.present ? generation : generation + 1,
                  })
                : { file, present: true, initial: animateNew, generation: 0 }
            })

            for (const [index, slot] of previous.entries()) {
              if (!files.some((file) => file.id === slot.file.id)) {
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

            return slots
          },
        })),
        ...files.map((file) =>
          model.thumbnails[file.id]
            ? Thumbnail.requestConfigure(file.id, { file, size })
            : initializeThumbnail({
                key: file.id,
                args: [{ id: `${model.id}-thumb-${encodeURIComponent(file.id)}`, file, size }],
              }),
        ),
      ]),
  ),
  RequestedReset: (model) => ({
    model: modifyFields(model, { slots: () => [], thumbnails: () => ({}) }),
  }),
})

const update = InputMessageFilesComposition.makeUpdate({
  RequestedRemove: (model, { id }) =>
    model.removable
      ? {
          model: modifyFields(model, {
            slots: Array.map((slot) =>
              slot.file.id === id && slot.present
                ? modifyFields(slot, {
                    present: () => false,
                    generation: (value) => value + 1,
                  })
                : slot,
            ),
          }),
          outMessage: OutMessage.RemoveRequested({ id }),
        }
      : { model },
  CompletedExit: (model, { id, generation }) => {
    const slot = model.slots.find((candidate) => candidate.file.id === id)

    if (!slot || slot.present || slot.generation !== generation) {
      return { model }
    }

    const thumbnails = EffectRecord.remove(model.thumbnails, id)

    return {
      model: modifyFields(model, {
        slots: (slots) => slots.filter((candidate) => candidate.file.id !== id),
        thumbnails: () => thumbnails,
      }),
      outMessage: OutMessage.Retired({ id }),
    }
  },
})

export interface InputMessageFilesViewInputs extends Presentation {
  readonly isTouch?: boolean
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly retainedFiles?: ReadonlyArray<MessageFile>
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

const view = InputMessageFilesComposition.makeView.withInputs<InputMessageFilesViewInputs>(
  (model, inputs, h) =>
    h.div(
      inputs.attributes ?? [],
      model.slots
        .filter(
          (slot) =>
            !slot.present ||
            inputs.retainedFiles === undefined ||
            inputs.retainedFiles.some((file) => file.id === slot.file.id),
        )
        .map((slot) => {
          const present =
            slot.present || inputs.retainedFiles?.some((file) => file.id === slot.file.id) === true

          const thumbnail = model.thumbnails[slot.file.id]

          if (!thumbnail) {
            throw new Error('InputMessage FileThumbnail Binding was not initialized')
          }

          const completed: Attribute<typeof Message.Type> = OnCustomEvent({
            name: 'fluid-exit-complete',
            f: (event) =>
              event.target === event.currentTarget
                ? Option.some(
                    Message.CompletedExit({ id: slot.file.id, generation: slot.generation }),
                  )
                : Option.none(),
          })

          const remove = h.OnClick(Message.RequestedRemove({ id: slot.file.id }), {
            propagation: 'Stop',
          })

          return InputMessageFileTile(
            {
              ...inputs,
              tooltipKey: inputMessageRemoveTooltipKey(model.id, slot.file.id),
              file: slot.file,
              filePreviewSize: model.size,
              present,
              initial: slot.initial,
              completion: completed,
              remove,
              thumbnail: (_file, _size, radius) =>
                h.block(
                  Thumbnail.embedView({
                    key: slot.file.id,
                    slotId: thumbnail.id,
                    model: thumbnail,
                    viewInputs: { ...inputs, radius },
                  }),
                ),
            },
            h,
          )
        }),
    ),
)

export const layer = InputMessageFilesBlock.makeLayer({ init, update, inMessageUpdate, view }).pipe(
  Layer.provide(FileThumbnailLayer),
)
