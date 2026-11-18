import type { Model } from './input-message/definition.js'
import { modifyFields } from 'foldkit/struct'
import type { HoverMode } from './hover-observation.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Option, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { MessageFile, QueuedMessage } from './input-message-domain.js'

const initialButtonGlyph: (config: InputMessageConfig) => 'arrow' | 'stop' =
  function initialButtonGlyph(config: InputMessageConfig) {
    const canSend =
      config.disabled !== true &&
      (config.value.trim().length > 0 || (config.files?.length ?? 0) > 0)

    const canQueue = config.supportsQueue === true && canSend

    return config.status === 'streaming' && config.supportsStop === true && !canQueue
      ? 'stop'
      : 'arrow'
  }

export const initialInputMessage: (config: InputMessageConfig) => InputMessageModel =
  function initialInputMessage(config: InputMessageConfig) {
    return InputMessageModel.make({
      id: config.id,
      buttonGlyph: initialButtonGlyph(config),
      buttonExiting: false,
      buttonSwaps: 0,
      value: config.value,
      editRevision: 0,
      disabled: config.disabled ?? false,
      files: config.files ?? [],
      supportsFiles: config.supportsFiles ?? false,
      accept: config.accept ?? 'image/png,image/jpeg,application/pdf',
      maxFiles: Option.fromNullishOr(config.maxFiles),
      queue: config.queue ?? [],
      status: Option.fromNullishOr(config.status),
      supportsQueue: config.status !== undefined && (config.supportsQueue ?? false),
      showQueue: config.showQueue ?? true,
      supportsStop: config.supportsStop ?? false,
      history: config.history ?? [],
      historyIndex: Option.none(),
      draftBeforeHistory: '',
      suggestions: config.suggestions ?? [],
      placeholderSuggestion: Option.fromNullishOr(config.placeholderSuggestion),
      liveMessage: '',
      enqueueSequence: 0,
      focusVisible: false,
      hovered: false,
      dragOver: false,
      isTouch: false,
      reduceMotion: config.reduceMotion,
      filesHeight: Option.none(),
      queueHeight: Option.none(),
      suggestionsHeight: Option.none(),
      filePreviewSize: config.filePreviewSize ?? 80,
      minRows: config.minRows ?? 1,
      maxRows: config.maxRows ?? 8,
      clickToFocus: config.clickToFocus ?? true,
    })
  }

export const inputMessageButtonMode: (model: InputMessageModel) => 'send' | 'queue' | 'stop' =
  function inputMessageButtonMode(model: InputMessageModel) {
    const canSend = !model.disabled && (model.value.trim().length > 0 || model.files.length > 0)

    if (Option.getOrNull(model.status) === 'streaming') {
      if (canSend && model.supportsQueue) {
        return 'queue'
      }

      return model.supportsStop ? 'stop' : 'send'
    }

    return 'send'
  }

export const reconcileInputMessageButton: (before: InputMessageModel, after: Model) => Model =
  function reconcileInputMessageButton(before: InputMessageModel, after: Model) {
    const target = inputMessageButtonMode(after) === 'stop' ? 'stop' : 'arrow'

    return modifyFields(after, {
      buttonGlyph: () => before.buttonGlyph,
      buttonExiting: () => target !== before.buttonGlyph,
    })
  }

export const inputMessageObservationFields = {
  CapturedValue: { value: Schema.String },
  CapturedFocus: { visible: Schema.Boolean },
  CapturedBlur: {},
  CapturedHover: { hovered: Schema.Boolean },
  CapturedDrag: { over: Schema.Boolean },
  CapturedFiles: { batchId: Schema.String, files: Schema.Array(MessageFile) },
  CapturedTouch: { isTouch: Schema.Boolean },
  CapturedReducedMotion: { reduced: Schema.Boolean },
  CapturedMeasure: {
    filesHeight: Schema.NullOr(Schema.Finite),
    queueHeight: Schema.NullOr(Schema.Finite),
    suggestionsHeight: Schema.NullOr(Schema.Finite),
  },
  CapturedKey: {
    key: Schema.String,
    composing: Schema.Boolean,
    shift: Schema.Boolean,
    alt: Schema.Boolean,
    meta: Schema.Boolean,
    ctrl: Schema.Boolean,
    selectionStart: Schema.Natural,
    selectionEnd: Schema.Natural,
  },
}

export const InputMessageObservation = defineMessageUnion(inputMessageObservationFields)

export type InputMessageResourceObservation = Extract<
  typeof InputMessageObservation.Type,
  {
    readonly _tag:
      | 'CapturedKey'
      | 'CapturedFocus'
      | 'CapturedFiles'
      | 'CapturedTouch'
      | 'CapturedMeasure'
      | 'CapturedDrag'
      | 'CapturedReducedMotion'
  }
>

export const InputMessageModel = Schema.Struct({
  id: Schema.String,
  buttonGlyph: Schema.Literals(['arrow', 'stop']),
  buttonExiting: Schema.Boolean,
  buttonSwaps: Schema.Natural,
  value: Schema.String,
  editRevision: Schema.Natural,
  disabled: Schema.Boolean,
  files: Schema.Array(MessageFile),
  supportsFiles: Schema.Boolean,
  accept: Schema.String,
  maxFiles: Schema.OptionFromNullOr(Schema.Natural),
  queue: Schema.Array(QueuedMessage),
  status: Schema.OptionFromNullOr(Schema.Literals(['idle', 'streaming'])),
  supportsQueue: Schema.Boolean,
  showQueue: Schema.Boolean,
  supportsStop: Schema.Boolean,
  history: Schema.Array(Schema.String),
  historyIndex: Schema.OptionFromNullOr(Schema.Natural),
  draftBeforeHistory: Schema.String,
  suggestions: Schema.Array(Schema.String),
  placeholderSuggestion: Schema.OptionFromNullOr(Schema.String),
  liveMessage: Schema.String,
  enqueueSequence: Schema.Natural,
  focusVisible: Schema.Boolean,
  hovered: Schema.Boolean,
  dragOver: Schema.Boolean,
  isTouch: Schema.Boolean,
  reduceMotion: Schema.Boolean,
  filesHeight: Schema.OptionFromNullOr(Schema.Finite),
  queueHeight: Schema.OptionFromNullOr(Schema.Finite),
  suggestionsHeight: Schema.OptionFromNullOr(Schema.Finite),
  filePreviewSize: Schema.Finite,
  minRows: Schema.Natural,
  maxRows: Schema.Natural,
  clickToFocus: Schema.Boolean,
})

export type InputMessageModel = typeof InputMessageModel.Type

export interface InputMessageConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly value: string
  readonly disabled?: boolean
  readonly files?: ReadonlyArray<MessageFile>
  readonly supportsFiles?: boolean
  readonly accept?: string
  readonly maxFiles?: number
  readonly queue?: ReadonlyArray<QueuedMessage>
  readonly status?: 'idle' | 'streaming'
  readonly showQueue?: boolean
  readonly supportsQueue?: boolean
  readonly supportsStop?: boolean
  readonly history?: ReadonlyArray<string>
  readonly suggestions?: ReadonlyArray<string>
  readonly placeholderSuggestion?: string
  readonly filePreviewSize?: number
  readonly minRows?: number
  readonly maxRows?: number
  readonly clickToFocus?: boolean
  readonly reduceMotion: boolean
}

export const inputMessageValues = <M extends InputMessageModel>(model: M) => ({
  ...model,
  maxFiles: Option.getOrNull(model.maxFiles),
  status: Option.getOrNull(model.status),
  historyIndex: Option.getOrNull(model.historyIndex),
  placeholderSuggestion: Option.getOrNull(model.placeholderSuggestion),
  filesHeight: Option.getOrNull(model.filesHeight),
  queueHeight: Option.getOrNull(model.queueHeight),
  suggestionsHeight: Option.getOrNull(model.suggestionsHeight),
})

export const measuredHeight = (previous: Option.Option<number>, next: number | null) =>
  next === null || Option.getOrNull(previous) === next ? previous : Option.some(next)
