// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { Block } from 'foldkit'
import type * as Mount from 'foldkit/mount'
import { Observe, makeComposition } from './definition.js'
import { initialInputMessage } from '../input-message-state.js'
import type { InputMessageConfig } from '../input-message-state.js'
import { Files, Queue, FilesRegion, QueueRegion } from '../input-message-bindings.js'
import { SuggestionsRegion, Hover, Highlight } from '../input-message-regions.js'

export const Composition = makeComposition({
  bindings: [Files, Queue, FilesRegion, QueueRegion, SuggestionsRegion, Hover, Highlight],
  mounts: [Observe],
})

export type InputMessageViewBuilder = Block.ViewBuilderFor<typeof Composition>

export type InputMessageMessage = Parameters<InputMessageViewBuilder['OnBlur']>[0]

export type InputMessageMountRequirements = Mount.RequirementsOf<typeof Observe>

export const init = Composition.makeInit((config: InputMessageConfig) => ({
  model: initialInputMessage(config),
  childInitContext: config,
}))
