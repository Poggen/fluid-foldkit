import { modifyFields } from 'foldkit/struct'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Array, Match, Option } from 'effect'
import { inputMessageValues, measuredHeight } from './input-message-state.js'
import type { InputMessageObservation } from './input-message-state.js'
import type { Model, Message, InMessage } from './input-message/definition.js'
import { OutMessage, Focus, SettleFiles, events } from './input-message/definition.js'
import { acceptMessageFiles, messageKeyIntent, InputMessageEvent } from './input-message-domain.js'
import type { QueuedMessage } from './input-message-domain.js'
import {
  RequestedRemoveQueued,
  RequestedEditQueued,
  RequestedMoveQueued,
  RequestedReorder,
} from './input-message-queue-actions.js'

const fill = (model: Model, text: string) => ({
  model: modifyFields(model, {
    editRevision: (value) => value + 1,
    historyIndex: () => Option.none(),
  }),
  commands: [Focus({ id: model.id, caretEnd: true })],
  outMessage: events([InputMessageEvent.cases.ValueChanged.make({ value: text })]),
})

function submit(model: Model) {
  const trimmed = model.value.trim()

  if (
    model.disabled ||
    Array.match(model.files, {
      onEmpty: () => !trimmed,
      onNonEmpty: () => false,
    })
  ) {
    return { model }
  }

  if (Option.getOrNull(model.status) === 'streaming' && model.supportsQueue) {
    let sequence = model.enqueueSequence

    while (model.queue.some((item) => item.id === `${model.id}-queued-${sequence}`)) {
      sequence += 1
    }

    const item: QueuedMessage = {
      id: `${model.id}-queued-${sequence}`,
      text: trimmed,
      files: model.files,
    }

    const queue = [...model.queue, item]

    return {
      model: modifyFields(model, {
        historyIndex: () => Option.none(),
        queue: () => queue,
        editRevision: (value) => value + 1,
        files: () => (model.supportsFiles ? [] : model.files),
        enqueueSequence: () => sequence + 1,
      }),
      commands: [Focus({ id: model.id, caretEnd: false })],
      outMessage: events([
        InputMessageEvent.cases.QueueChanged.make({ queue }),
        InputMessageEvent.cases.ValueChanged.make({ value: '' }),
        ...(model.supportsFiles
          ? [InputMessageEvent.cases.FilesChanged.make({ files: [] }) satisfies InputMessageEvent]
          : []),
      ]),
    }
  }

  return {
    model: modifyFields(model, { historyIndex: () => Option.none() }),
    outMessage: events([
      InputMessageEvent.cases.Sent.make({ text: trimmed, files: model.files, queuedId: null }),
    ]),
  }
}

type Action =
  | typeof InMessage.Type
  | typeof InputMessageObservation.Type
  | ReturnType<
      | typeof Message.CompletedFocus
      | typeof Message.CompletedButtonExit
      | typeof Message.CompletedFilesSettled
    >

export type LocalHandlers = {
  readonly [Tag in Action['_tag']]: (
    model: Model,
    message: Extract<Action, { readonly _tag: Tag }>,
  ) => {
    readonly model: Model
    readonly commands?: ReadonlyArray<ReturnType<typeof Focus> | ReturnType<typeof SettleFiles>>
    readonly outMessage?: typeof OutMessage.Type
  }
}

export const localHandlers = {
  RequestedConfigure: (model, { _tag: _request, ...values }) => {
    const supportsQueue = values.status !== null && values.supportsQueue
    const [next, ...rest] = values.queue

    const dispatch =
      supportsQueue &&
      Option.getOrNull(model.status) === 'streaming' &&
      values.status === 'idle' &&
      next !== undefined

    const configured = modifyFields(model, {
      value: () => values.value,
      disabled: () => values.disabled,
      files: () => values.files,
      queue: () => values.queue,
      supportsFiles: () => values.supportsFiles,
      supportsQueue: () => supportsQueue,
      showQueue: () => values.showQueue,
      supportsStop: () => values.supportsStop,
      accept: () => values.accept,
      maxFiles: () => Option.fromNullishOr(values.maxFiles),
      status: () => Option.fromNullishOr(values.status),
      placeholderSuggestion: () => Option.fromNullishOr(values.placeholderSuggestion),
      filePreviewSize: () => values.filePreviewSize,
      minRows: () => values.minRows,
      maxRows: () => values.maxRows,
      clickToFocus: () => values.clickToFocus,
      history: () => values.history,
      suggestions: () => values.suggestions,
    })

    return {
      model: dispatch
        ? modifyFields(configured, {
            queue: () => rest,
            liveMessage: () => `Message sent.${rest.length ? ` ${rest.length} still queued.` : ''}`,
          })
        : configured,
      outMessage: dispatch
        ? events([
            InputMessageEvent.cases.QueueChanged.make({ queue: rest }),
            InputMessageEvent.cases.Sent.make({
              text: next.text,
              files: next.files,
              queuedId: next.id,
            }),
          ])
        : OutMessage.PresentationChanged(),
    }
  },
  InformedOfValue: (model, { value }) => ({ model: modifyFields(model, { value: () => value }) }),
  CapturedValue: (model, { value }) => ({
    model: modifyFields(model, {
      editRevision: (value) => value + 1,
      historyIndex: () => Option.none(),
    }),
    outMessage: events([InputMessageEvent.cases.ValueChanged.make({ value })]),
  }),
  CapturedFocus: (model, { visible }) => ({
    model: modifyFields(model, { focusVisible: (current) => current || visible }),
    outMessage: events([InputMessageEvent.cases.Focused.make({ visible })]),
  }),
  CapturedBlur: (model) => ({
    model: modifyFields(model, { focusVisible: () => false }),
    outMessage: events([InputMessageEvent.cases.Blurred.make({})]),
  }),
  CapturedHover: (model, { hovered }) => ({
    model: modifyFields(model, { hovered: () => hovered }),
  }),
  CapturedDrag: (model, { over }) => ({ model: modifyFields(model, { dragOver: () => over }) }),
  CapturedTouch: (model, { isTouch }) => ({
    model: modifyFields(model, { isTouch: () => isTouch }),
  }),
  CapturedReducedMotion: (model, { reduced }) => ({
    model: modifyFields(model, { reduceMotion: () => reduced }),
  }),
  CapturedMeasure: (model, heights) => {
    const filesHeight = measuredHeight(model.filesHeight, heights.filesHeight)
    const queueHeight = measuredHeight(model.queueHeight, heights.queueHeight)
    const suggestionsHeight = measuredHeight(model.suggestionsHeight, heights.suggestionsHeight)

    return {
      model:
        filesHeight === model.filesHeight &&
        queueHeight === model.queueHeight &&
        suggestionsHeight === model.suggestionsHeight
          ? model
          : modifyFields(model, {
              filesHeight: () => filesHeight,
              queueHeight: () => queueHeight,
              suggestionsHeight: () => suggestionsHeight,
            }),
    }
  },
  CapturedFiles: (model, { files, batchId }) => {
    if (!model.supportsFiles || model.disabled) {
      return { model, commands: [SettleFiles({ batchId, accepted: [] })] }
    }

    const next = acceptMessageFiles(
      model.files,
      files,
      model.accept,
      Option.getOrNull(model.maxFiles),
    )

    return next === null
      ? { model, commands: [SettleFiles({ batchId, accepted: [] })] }
      : {
          model: modifyFields(model, { files: () => next }),
          commands: [SettleFiles({ batchId, accepted: next.map((file) => file.id) })],
          outMessage: events([InputMessageEvent.cases.FilesChanged.make({ files: next })]),
        }
  },
  RequestedRemoveFile: (model, { index }) => {
    if (!model.supportsFiles) {
      return { model }
    }

    const files = model.files.filter((_, i) => i !== index)

    return {
      model: modifyFields(model, { files: () => files }),
      outMessage: events([InputMessageEvent.cases.FilesChanged.make({ files })]),
    }
  },
  RequestedSubmit: submit,
  RequestedStop: (model) =>
    model.supportsStop
      ? { model, outMessage: events([InputMessageEvent.cases.Stopped.make({})]) }
      : { model },
  RequestedFill: (model, { text }) => fill(model, text),
  RequestedHighlight: (model) => ({ model }),
  RequestedHoverMode: (model) => ({ model }),
  RequestedRemoveQueued,
  RequestedEditQueued,
  RequestedMoveQueued,
  RequestedReorder,
  CapturedKey: (model, key) => {
    const intent = inputMessageKeyIntent(model, key)
    return Match.value(intent).pipe(
      Match.when({ kind: 'Native' }, () => ({ model })),
      Match.when({ kind: 'Highlight' }, () => ({ model })),
      Match.when({ kind: 'Fill' }, ({ text }) => fill(model, text)),
      Match.when({ kind: 'Submit' }, () => submit(model)),
      Match.when({ kind: 'History' }, ({ index, savedDraft, text }) => ({
        model: modifyFields(model, {
          editRevision: (revision) => revision + 1,
          historyIndex: () => Option.fromNullishOr(index),
          draftBeforeHistory: () => savedDraft,
        }),
        commands: [Focus({ id: model.id, caretEnd: true })],
        outMessage: events([InputMessageEvent.cases.ValueChanged.make({ value: text })]),
      })),
      Match.exhaustive,
    )
  },

  CompletedButtonExit: (model) => ({
    model: model.buttonExiting
      ? modifyFields(model, {
          buttonGlyph: () => (model.buttonGlyph === 'stop' ? 'arrow' : 'stop'),
          buttonExiting: () => false,
          buttonSwaps: (value) => value + 1,
        })
      : model,
  }),
  CompletedFocus: (model) => ({ model }),
  CompletedFilesSettled: (model) => ({ model }),
} satisfies LocalHandlers

export const inputMessageKeyIntent = (model: Model, key: typeof Message.CapturedKey.Type) =>
  messageKeyIntent({ ...inputMessageValues(model), activeSuggestion: model.hover.activeIndex }, key)
