/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { Model } from './input-message/definition.js'
import { inputMessageRemoveTooltipKey } from './input-message-domain.js'

/** A projection for the real document Tooltip Binding; includes exits until their actual completion. */
export function inputMessageTooltipEntries(model: Model) {
  return [
    ...(model.filesRegion.presence.phase === 'Closed'
      ? []
      : model.filesView.slots.map((slot) => ({
          key: inputMessageRemoveTooltipKey(model.filesView.id, slot.file.id),
          content: 'Remove',
          side: 'top' as const,
        }))),
    ...(!model.showQueue || !model.supportsQueue || model.queueRegion.presence.phase === 'Closed'
      ? []
      : model.queueView.slots.map((slot) => ({
          key: inputMessageRemoveTooltipKey(model.queueView.id, slot.item.id),
          content: 'Remove',
          side: 'top' as const,
        }))),
  ]
}
