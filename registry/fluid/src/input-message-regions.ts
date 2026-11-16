// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { InputMessageRegionBlock, Payload } from './input-message-region.js'
import {
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeNoopStep,
  makeStep,
} from './input-message/definition.js'
import type { InputMessageConfig } from './input-message-state.js'
import type { InputMessageRegionConfig } from './input-message-region.js'
import { HoverBlock } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'

export const FilesRegionBinding = makeRequiredFieldBinding(InputMessageRegionBlock, {
  field: 'filesRegion',
  init: {
    contextToArgs: (config: InputMessageConfig): [InputMessageRegionConfig] => [
      {
        id: `${config.id}-files-region`,
        payload: Payload.cases.Files.make({ items: config.files ?? [] }),
        open: (config.files?.length ?? 0) > 0,
      },
    ],
  },
})

export const QueueRegionBinding = makeRequiredFieldBinding(InputMessageRegionBlock, {
  field: 'queueRegion',
  init: {
    contextToArgs: (config: InputMessageConfig): [InputMessageRegionConfig] => [
      {
        id: `${config.id}-queue-region`,
        payload: Payload.cases.Queue.make({ items: config.queue ?? [] }),
        mounted:
          config.status !== undefined &&
          (config.supportsQueue ?? false) &&
          config.showQueue !== false,
        open:
          (config.queue?.length ?? 0) > 0 &&
          config.status !== undefined &&
          (config.supportsQueue ?? false) &&
          config.showQueue !== false,
      },
    ],
  },
})

export const SuggestionsRegion = makeRequiredFieldBinding(InputMessageRegionBlock, {
  field: 'suggestionsRegion',
  init: {
    contextToArgs: (config: InputMessageConfig): [InputMessageRegionConfig] => [
      {
        id: `${config.id}-suggestions-region`,
        payload: Payload.cases.Suggestions.make({ items: config.suggestions ?? [] }),
        mounted: (config.suggestions?.length ?? 0) > 0,
        open: (config.suggestions?.length ?? 0) > 0 && config.value === '',
      },
    ],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(InputMessageRegionBlock, {
    Exited: makeNoopStep,
  }),
})

export const Highlight = makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: InputMessageConfig) => [
      { id: `${config.id}-suggestion-highlight`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
})

export const Hover = makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: InputMessageConfig) => [
      { id: `${config.id}-suggestions`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      makeStep((model) =>
        Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
      ),
  }),
})
