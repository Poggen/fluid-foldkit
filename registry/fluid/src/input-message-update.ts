// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Update } from 'foldkit'
import { InMessage, makeNoopStep, makeStep } from './input-message/definition.js'
import { Composition } from './input-message/composition.js'
import { localHandlers, inputMessageKeyIntent } from './input-message-transitions.js'
import { synchronizeChildren, refreshAfterQueueAction } from './input-message-bindings.js'
import { Hover, Highlight } from './input-message-regions.js'
import { reconcileInputMessageButton } from './input-message-state.js'

const localUpdate = Composition.makeUpdate({
  CapturedValue: localHandlers.CapturedValue,
  CapturedFocus: localHandlers.CapturedFocus,
  CapturedBlur: localHandlers.CapturedBlur,
  CapturedHover: localHandlers.CapturedHover,
  CapturedDrag: localHandlers.CapturedDrag,
  CapturedReducedMotion: localHandlers.CapturedReducedMotion,
  CapturedTouch: localHandlers.CapturedTouch,
  CapturedMeasure: localHandlers.CapturedMeasure,
  CapturedFiles: localHandlers.CapturedFiles,
  CapturedRemoveFile: (model, { index }) =>
    localHandlers.RequestedRemoveFile(model, InMessage.RequestedRemoveFile({ index })),
  CapturedSubmit: localHandlers.RequestedSubmit,
  CapturedStop: localHandlers.RequestedStop,
  CapturedFill: (model, { text }) =>
    localHandlers.RequestedFill(model, InMessage.RequestedFill({ text })),
  CapturedRemoveQueued: (model, { id }) =>
    localHandlers.RequestedRemoveQueued(model, InMessage.RequestedRemoveQueued({ id })),
  CapturedEditQueued: (model, { id }) =>
    localHandlers.RequestedEditQueued(model, InMessage.RequestedEditQueued({ id })),
  CapturedMoveQueued: (model, { id, direction }) =>
    localHandlers.RequestedMoveQueued(model, InMessage.RequestedMoveQueued({ id, direction })),
  CapturedReorder: (model, { ids }) =>
    localHandlers.RequestedReorder(model, InMessage.RequestedReorder({ ids })),
  CompletedButtonExit: localHandlers.CompletedButtonExit,
  CompletedFocus: localHandlers.CompletedFocus,
  CompletedFilesSettled: makeNoopStep(),
  CapturedKey: localHandlers.CapturedKey,
  CapturedHighlight: (model, { index }) =>
    Hover.requestHighlight({
      index:
        index !== null && (model.value !== '' || index >= model.suggestions.length) ? null : index,
    })(model),
})

const sharedUpdate = Composition.makeUpdate.compose(
  Composition.makeUpdate.on([
    'CapturedValue',
    'CapturedFocus',
    'CapturedBlur',
    'CapturedHover',
    'CapturedDrag',
    'CapturedTouch',
    'CapturedFiles',
    'CapturedRemoveFile',
    'CapturedSubmit',
    'CapturedStop',
    'CapturedFill',
    'CapturedRemoveQueued',
    'CapturedEditQueued',
    'CapturedMoveQueued',
    'CapturedReorder',
    'CompletedFocus',
  ])((model, _message, { before }) => ({ model: reconcileInputMessageButton(before, model) })),
  Composition.makeUpdate.on([
    'CapturedValue',
    'CapturedBlur',
    'CapturedFill',
    'CapturedEditQueued',
  ])(Hover.requestClear()),
  Composition.makeUpdate.on([
    'CapturedValue',
    'CapturedFocus',
    'CapturedBlur',
    'CapturedHover',
    'CapturedDrag',
    'CapturedReducedMotion',
    'CapturedTouch',
    'CapturedFiles',
    'CapturedRemoveFile',
    'CapturedSubmit',
    'CapturedStop',
    'CapturedFill',
    'CapturedRemoveQueued',
    'CapturedEditQueued',
    'CapturedMoveQueued',
    'CapturedReorder',
    'CompletedButtonExit',
    'CompletedFocus',
  ])(synchronizeChildren),
  Composition.makeUpdate.on(['CapturedMeasure'])((model, _message, { before }) =>
    model === before
      ? makeNoopStep()
      : Update.combineSteps([
          makeStep((current) => ({
            model: reconcileInputMessageButton(before, current),
          })),
          synchronizeChildren,
        ]),
  ),
  Composition.makeUpdate.on(['CapturedKey'])((model, message, { before }) => {
    const intent = inputMessageKeyIntent(before, message)
    return intent.kind === 'Highlight'
      ? Hover.requestHighlight({ index: intent.index })
      : Update.combineSteps([
          makeStep((current) => ({
            model: reconcileInputMessageButton(before, current),
          })),
          ...(intent.kind === 'Fill' ? [Hover.requestClear()] : []),
          synchronizeChildren,
        ])
  }),
  Composition.makeUpdate.except([
    'CapturedSubmit',
    'CapturedKey',
    'CapturedRemoveQueued',
    'CapturedEditQueued',
    'CapturedMoveQueued',
    'CapturedReorder',
  ])((model, _message, { before }) =>
    model.queue === before.queue
      ? makeNoopStep()
      : Update.combineSteps([
          makeStep((current) => ({
            model: reconcileInputMessageButton(before, current),
          })),
          ...(model.editRevision !== before.editRevision ? [Hover.requestClear()] : []),
          refreshAfterQueueAction,
        ]),
  ),
)

type UpdateParts = readonly [typeof localUpdate, typeof sharedUpdate]

export const update: ReturnType<typeof Composition.makeUpdate.compose<UpdateParts>> =
  Composition.makeUpdate.compose(localUpdate, sharedUpdate)

const inputUpdate = Composition.makeInMessageUpdate({
  RequestedHoverMode: makeStep((model, { mode }: typeof InMessage.RequestedHoverMode.Type) =>
    Update.combineSteps([
      Hover.requestConfigure({
        options: { mode, axis: 'y', nearest: true, gapClick: true, maxDistance: Infinity },
      }),
      Highlight.informOfSource({ snapshot: model.hover, hidden: false, mode }),
    ]),
  ),
  InformedOfValue: localHandlers.InformedOfValue,
  RequestedConfigure: localHandlers.RequestedConfigure,
  RequestedRemoveFile: localHandlers.RequestedRemoveFile,
  RequestedSubmit: localHandlers.RequestedSubmit,
  RequestedStop: localHandlers.RequestedStop,
  RequestedFill: localHandlers.RequestedFill,
  RequestedRemoveQueued: localHandlers.RequestedRemoveQueued,
  RequestedEditQueued: localHandlers.RequestedEditQueued,
  RequestedMoveQueued: localHandlers.RequestedMoveQueued,
  RequestedReorder: localHandlers.RequestedReorder,
  RequestedHighlight: (model, { index }) =>
    Hover.requestHighlight({
      index:
        index !== null && (model.value !== '' || index >= model.suggestions.length) ? null : index,
    })(model),
})

export const inMessageUpdate = Composition.makeInMessageUpdate.compose(
  inputUpdate,
  Composition.makeInMessageUpdate.except(['RequestedHoverMode', 'RequestedHighlight'])(
    (model, _message, { before }) => ({ model: reconcileInputMessageButton(before, model) }),
  ),
  Composition.makeInMessageUpdate.on(['RequestedFill', 'RequestedEditQueued'])(
    Hover.requestClear(),
  ),
  Composition.makeInMessageUpdate.except(['RequestedHoverMode', 'RequestedHighlight'])(
    synchronizeChildren,
  ),
)
