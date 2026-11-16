// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Layer } from 'effect'
import { init } from './input-message/composition.js'
import { InputMessageBlock, Observe, Focus, SettleFiles } from './input-message/definition.js'
import { update, inMessageUpdate } from './input-message-update.js'
import { view } from './input-message/view.js'
import { layer as FilesLayer } from './input-message-files.js'
import { layer as QueueLayer } from './input-message-queue.js'
import { layer as RegionLayer } from './input-message-region.js'
import { layer as HoverLayer } from './hover.js'
import { layer as HighlightLayer } from './hover-highlight.js'

export {
  InputMessageBlock,
  InputMessageKey,
  InputMessageConfigSchema,
} from './input-message/definition.js'

export const layer = InputMessageBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(Observe.layer, Focus.layer, SettleFiles.layer),
}).pipe(
  Layer.provide(Layer.mergeAll(FilesLayer, QueueLayer, RegionLayer, HoverLayer, HighlightLayer)),
)

export {
  createInputMessageLayer,
  createInputMessageFileRegistry,
  InputMessageResources,
} from './input-message-resources.js'

export type { InputMessageConfig } from './input-message-state.js'

export type { InputMessageViewInputs } from './input-message-view.js'

export { MessageFile, QueuedMessage, InputMessageEvent } from './input-message-domain.js'

export { inputMessageTooltipEntries } from './input-message-descriptors.js'

export type {
  InputMessageViewBuilder,
  InputMessageMessage,
  InputMessageMountRequirements,
} from './input-message/composition.js'

export type { InputMessageQueueNative } from './input-message-queue-native.js'

export const hoverModeOf = (model: typeof InputMessageBlock.Model.Type) => model.hover.mode
