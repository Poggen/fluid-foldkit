import { HoverMode } from '../hover-observation.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { InputMessageViewInputs } from '../input-message-view.js'
import { InputMessageResources } from '../input-message-resources.js'
import { InputMessageModel, inputMessageObservationFields } from '../input-message-state.js'
import { InputMessageEvent, MessageFile, QueuedMessage } from '../input-message-domain.js'
import { InputMessageRegionBlock } from '../input-message-region.js'
import type { FileThumbnailResources } from '../file-thumbnail-resources.js'
import type { InputMessageQueueNative } from '../input-message-queue-native.js'
import { InputMessageFilesBlock } from '../input-message-files.js'
import { InputMessageQueueBlock } from '../input-message-queue.js'
import { HoverBlock } from '../hover.js'
import { HoverHighlightBlock } from '../hover-highlight.js'

export const Model = Schema.Struct({
  ...InputMessageModel.fields,
  filesView: InputMessageFilesBlock.Model,
  queueView: InputMessageQueueBlock.Model,
  filesRegion: InputMessageRegionBlock.Model,
  queueRegion: InputMessageRegionBlock.Model,
  suggestionsRegion: InputMessageRegionBlock.Model,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
})

export type Model = typeof Model.Type

const Controlled = Schema.Struct({
  value: Schema.String,
  disabled: Schema.Boolean,
  files: Schema.Array(MessageFile),
  queue: Schema.Array(QueuedMessage),
  status: Schema.NullOr(Schema.Literals(['idle', 'streaming'])),
  supportsFiles: Schema.Boolean,
  supportsQueue: Schema.Boolean,
  showQueue: Schema.Boolean,
  supportsStop: Schema.Boolean,
  accept: Schema.String,
  maxFiles: Schema.NullOr(Schema.Natural),
  filePreviewSize: Schema.Finite,
  minRows: Schema.Natural,
  maxRows: Schema.Natural,
  clickToFocus: Schema.Boolean,
  history: Schema.Array(Schema.String),
  suggestions: Schema.Array(Schema.String),
  placeholderSuggestion: Schema.NullOr(Schema.String),
})

export const Message = defineMessageUnion({
  ...inputMessageObservationFields,
  CapturedSubmit: {},
  CapturedStop: {},
  CapturedFill: { text: Schema.String },
  CapturedHighlight: { index: Schema.NullOr(Schema.Natural) },
  CapturedRemoveFile: { index: Schema.Natural },
  CapturedRemoveQueued: { id: Schema.String },
  CapturedEditQueued: { id: Schema.String },
  CapturedMoveQueued: { id: Schema.String, direction: Schema.Literals([-1, 1]) },
  CapturedReorder: { ids: Schema.Array(Schema.String) },
  CompletedFocus: {},
  CompletedButtonExit: {},
  CompletedFilesSettled: {},
})

export const OutMessage = defineMessageUnion({
  Events: { events: Schema.Array(InputMessageEvent) },
  PresentationChanged: {},
})

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedConfigure: { ...Controlled.fields },
  InformedOfValue: { value: Schema.String },
  RequestedSubmit: {},
  RequestedStop: {},
  RequestedFill: { text: Schema.String },
  RequestedHighlight: { index: Schema.NullOr(Schema.Natural) },
  RequestedRemoveFile: { index: Schema.Natural },
  RequestedRemoveQueued: { id: Schema.String },
  RequestedEditQueued: { id: Schema.String },
  RequestedMoveQueued: { id: Schema.String, direction: Schema.Literals([-1, 1]) },
  RequestedReorder: { ids: Schema.Array(Schema.String) },
})

export const InputMessageConfigSchema = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  value: Schema.String,
  reduceMotion: Schema.Boolean,
  disabled: Schema.optionalKey(Schema.Boolean),
  files: Schema.optionalKey(Schema.Array(MessageFile)),
  supportsFiles: Schema.optionalKey(Schema.Boolean),
  accept: Schema.optionalKey(Schema.String),
  maxFiles: Schema.optionalKey(Schema.Natural),
  queue: Schema.optionalKey(Schema.Array(QueuedMessage)),
  status: Schema.optionalKey(Schema.Literals(['idle', 'streaming'])),
  showQueue: Schema.optionalKey(Schema.Boolean),
  supportsQueue: Schema.optionalKey(Schema.Boolean),
  supportsStop: Schema.optionalKey(Schema.Boolean),
  history: Schema.optionalKey(Schema.Array(Schema.String)),
  suggestions: Schema.optionalKey(Schema.Array(Schema.String)),
  placeholderSuggestion: Schema.optionalKey(Schema.String),
  filePreviewSize: Schema.optionalKey(Schema.Finite),
  minRows: Schema.optionalKey(Schema.Natural),
  maxRows: Schema.optionalKey(Schema.Natural),
  clickToFocus: Schema.optionalKey(Schema.Boolean),
})

const effects = Block.makeEffectsContract<
  never,
  InputMessageResources | FileThumbnailResources | InputMessageQueueNative
>()

export const InputMessageKey = Symbol('FluidInputMessage')

export const InputMessageBlock = Block.make('InputMessage', {
  key: InputMessageKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([InputMessageConfigSchema]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<InputMessageViewInputs>() },
  effects,
  inMessageOutputs: {
    RequestedConfigure: { outMessage: OutMessage },
    RequestedSubmit: { outMessage: OutMessage.Events },
    RequestedStop: { outMessage: OutMessage.Events },
    RequestedFill: { outMessage: OutMessage.Events },
    RequestedRemoveFile: { outMessage: OutMessage.Events },
    RequestedRemoveQueued: { outMessage: OutMessage.Events },
    RequestedEditQueued: { outMessage: OutMessage.Events },
    RequestedMoveQueued: { outMessage: OutMessage.Events },
    RequestedReorder: { outMessage: OutMessage.Events },
  },
})

export const {
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeOutMessageStep,
  makeStep,
  makeNoopStep,
  makeComposition,
  makeCommand,
  makeMountStream,
} = InputMessageBlock

export const Focus = makeCommand('Focus', {
  args: { id: Schema.String, caretEnd: Schema.Boolean },
  messages: [Message.CompletedFocus],
  *handler() {
    const resources = yield* InputMessageResources

    return ({ id, caretEnd }) =>
      resources.focus(id, caretEnd).pipe(Effect.as(Message.CompletedFocus()))
  },
})

export const SettleFiles = makeCommand('SettleFiles', {
  args: { batchId: Schema.String, accepted: Schema.Array(Schema.String) },
  messages: [Message.CompletedFilesSettled],
  *handler() {
    const resources = yield* InputMessageResources

    return ({ batchId, accepted }) =>
      resources.settleFiles(batchId, accepted).pipe(Effect.as(Message.CompletedFilesSettled()))
  },
})

export const Observe = makeMountStream('Observe', {
  messages: [
    Message.CapturedKey,
    Message.CapturedFocus,
    Message.CapturedFiles,
    Message.CapturedTouch,
    Message.CapturedMeasure,
    Message.CapturedDrag,
    Message.CapturedReducedMotion,
  ],
  *handler() {
    const resources = yield* InputMessageResources

    return ({ element, viewStateChanges }) => resources.observe(element, viewStateChanges)
  },
})

export const events = (values: readonly [InputMessageEvent, ...Array<InputMessageEvent>]) =>
  OutMessage.Events({ events: values })
