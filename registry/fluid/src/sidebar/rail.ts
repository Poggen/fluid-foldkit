/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { Option } from 'effect'
import { SidebarBlock } from './definition.js'
import type { Model } from './definition.js'
import { RailTooltips } from './composition.js'

export const sidebarRailPresent: (model: typeof Model.Type) => boolean = (
  model: typeof Model.Type,
) =>
  model.options.collapsible !== 'none' &&
  model.options.rail &&
  !(model.options.peek !== 'none' && !model.open && !model.resizing)

const railOptions = (model: typeof Model.Type) => {
  const side: 'left' | 'right' = model.options.side === 'left' ? 'right' : 'left'
  const followCursor = 'y' as const
  return {
    side,
    sideOffset: 8,
    followCursor,
    forceOpen: model.resizing ? false : Option.getOrUndefined(model.railTooltipOpen),
  }
}

export const reconcileRailTooltips = (before: typeof Model.Type) =>
  SidebarBlock.makeStep((model) => {
    const previous = railOptions(before)
    const next = railOptions(model)
    return previous.side === next.side && previous.forceOpen === next.forceOpen
      ? SidebarBlock.makeNoopStep()
      : RailTooltips.requestConfigure({ key: `${model.options.id}-rail`, options: next })
  })
