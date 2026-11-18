import { modifyFields } from 'foldkit/struct'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { InputMessageRegionBlock, Payload } from './input-message-region.js'
import { InputMessageEvent } from './input-message-domain.js'
import { Array, flow, Option } from 'effect'
import { Update } from 'foldkit'
import {
  InMessage,
  OutMessage,
  events,
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeOutMessageStep,
  makeStep,
} from './input-message/definition.js'
import type { InputMessageConfig } from './input-message-state.js'
import { reconcileInputMessageButton } from './input-message-state.js'
import { InputMessageFilesBlock } from './input-message-files.js'
import { InputMessageQueueBlock } from './input-message-queue.js'
import {
  FilesRegionBinding,
  QueueRegionBinding,
  SuggestionsRegion,
  Hover,
} from './input-message-regions.js'
import { localHandlers } from './input-message-transitions.js'

export const Files = makeRequiredFieldBinding(InputMessageFilesBlock, {
  field: 'filesView',
  init: {
    contextToArgs: (config: InputMessageConfig) => [
      {
        id: `${config.id}-files`,
        files: config.files ?? [],
        size: config.filePreviewSize ?? 80,
        removable: config.supportsFiles ?? false,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(InputMessageFilesBlock, {
    Retired: () => makeOutMessageStep(() => OutMessage.PresentationChanged()),
    RemoveRequested: ({ id }) =>
      makeStep((model) => {
        if (!model.supportsFiles) {
          return { model }
        }

        const files = model.files.filter((file) => file.id !== id)

        return flow(
          Update.combineSteps([
            makeStep(() => ({
              model: reconcileInputMessageButton(
                model,
                modifyFields(model, { files: () => files }),
              ),
            })),
            FilesRegionBinding.requestConfigure({
              payload: Payload.cases.Files.make({ items: files }),
              height: Option.getOrNull(model.filesHeight),
              open: files.length > 0,
            }),
          ]),
          Update.withOutMessage(events([InputMessageEvent.cases.FilesChanged.make({ files })])),
        )
      }),
  }),
})

export const FilesRegion = FilesRegionBinding.withOutMessagePolicy({
  fold: makeOutMessageFold(InputMessageRegionBlock, {
    Exited: () => Files.requestReset(),
  }),
})

export const refreshAfterQueueAction = makeStep((model) =>
  Update.combineSteps([
    Files.requestConfigure({
      files: model.files,
      size: model.filePreviewSize,
      removable: model.supportsFiles,
      animateNew: model.filesRegion.presence.phase !== 'Closed',
    }),
    FilesRegion.requestConfigure({
      payload: Payload.cases.Files.make({ items: model.files }),
      height: Option.getOrNull(model.filesHeight),
      open: model.files.length > 0,
    }),
    model.showQueue && model.supportsQueue
      ? QueueRegionBinding.requestConfigure({
          payload: Payload.cases.Queue.make({ items: model.queue }),
          height: Option.getOrNull(model.queueHeight),
          open: model.queue.length > 0,
        })
      : QueueRegionBinding.requestReset(),
    Array.match(model.suggestions, {
      onEmpty: () => SuggestionsRegion.requestReset(),
      onNonEmpty: (suggestions) =>
        SuggestionsRegion.requestConfigure({
          payload: Payload.cases.Suggestions.make({ items: suggestions }),
          height: Option.getOrNull(model.suggestionsHeight),
          open: model.value === '',
        }),
    }),
    ...(model.hover.activeIndex === null
      ? []
      : Array.match(model.suggestions, {
          onEmpty: () => [Hover.requestClear()],
          onNonEmpty: () => (model.value !== '' ? [Hover.requestClear()] : []),
        })),
  ]),
)

export const Queue = makeRequiredFieldBinding(InputMessageQueueBlock, {
  field: 'queueView',
  init: {
    contextToArgs: (config: InputMessageConfig) => [
      { id: `${config.id}-queue`, items: config.queue ?? [] },
    ],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(InputMessageQueueBlock, {
    Retired: () => makeOutMessageStep(() => OutMessage.PresentationChanged()),
    EditRequested: ({ id }) =>
      makeStep((model) => {
        const result = localHandlers.RequestedEditQueued(
          model,
          InMessage.RequestedEditQueued({ id }),
        )
        return result.model === model
          ? Update.combineSteps([
              makeStep((current) => ({
                model: reconcileInputMessageButton(model, current),
              })),
              Hover.requestClear(),
              refreshAfterQueueAction,
            ])
          : result
      }),
    RemoveRequested: ({ id }) =>
      makeStep((model) =>
        localHandlers.RequestedRemoveQueued(model, InMessage.RequestedRemoveQueued({ id })),
      ),
    OrderRequested: ({ ids }) =>
      makeStep((model) => {
        const result = localHandlers.RequestedReorder(model, InMessage.RequestedReorder({ ids }))
        return result.model === model
          ? Update.combineSteps([
              makeStep((current) => ({
                model: reconcileInputMessageButton(model, current),
              })),
              refreshAfterQueueAction,
            ])
          : result
      }),
  }),
})

export const QueueRegion = QueueRegionBinding.withOutMessagePolicy({
  fold: makeOutMessageFold(InputMessageRegionBlock, {
    Exited: () => Queue.requestConfigure({ items: [], animateNew: false, reset: true }),
  }),
})

export const synchronizeChildren = makeStep((model) =>
  Update.combineSteps([
    Files.requestConfigure({
      files: model.files,
      size: model.filePreviewSize,
      removable: model.supportsFiles,
      animateNew: model.filesRegion.presence.phase !== 'Closed',
    }),
    Queue.requestConfigure({
      items: model.queue,
      animateNew:
        model.showQueue && model.supportsQueue && model.queueRegion.presence.phase !== 'Closed',
      reset: !model.showQueue || !model.supportsQueue,
    }),
    FilesRegion.requestConfigure({
      payload: Payload.cases.Files.make({ items: model.files }),
      height: Option.getOrNull(model.filesHeight),
      open: model.files.length > 0,
    }),
    model.showQueue && model.supportsQueue
      ? QueueRegionBinding.requestConfigure({
          payload: Payload.cases.Queue.make({ items: model.queue }),
          height: Option.getOrNull(model.queueHeight),
          open: model.queue.length > 0,
        })
      : QueueRegionBinding.requestReset(),
    Array.match(model.suggestions, {
      onEmpty: () => SuggestionsRegion.requestReset(),
      onNonEmpty: (suggestions) =>
        SuggestionsRegion.requestConfigure({
          payload: Payload.cases.Suggestions.make({ items: suggestions }),
          height: Option.getOrNull(model.suggestionsHeight),
          open: model.value === '',
        }),
    }),
    ...(model.hover.activeIndex === null
      ? []
      : Array.match(model.suggestions, {
          onEmpty: () => [Hover.requestClear()],
          onNonEmpty: () => (model.value !== '' ? [Hover.requestClear()] : []),
        })),
    ...Array.match(model.suggestions, {
      onEmpty: () => [],
      onNonEmpty: () =>
        model.value === '' && model.suggestionsRegion.presence.phase !== 'Present'
          ? [Hover.requestRemeasure()]
          : [],
    }),
  ]),
)
