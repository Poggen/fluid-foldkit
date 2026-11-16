// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Effect, Layer } from 'effect'
import { DropdownResourcesLayer } from './dropdown-resources.js'
import { DialogResources, DialogResourcesLayer } from './dialog-resources.js'
import { SelectBlock } from './select/block.js'

export { SelectBlock, SelectKey, SelectOption } from './select/block.js'
export type { SelectConfig, SelectViewInputs, SelectDeclared } from './select/block.js'
export { layer } from './select/layer.js'

/** Share this Layer with Dialog to preserve popup ancestry across portals. */
export const createSelectLayer = (
  document: Document,
  dialogResources = DialogResourcesLayer(document),
) =>
  Layer.unwrap(
    Effect.gen(function* () {
      return DropdownResourcesLayer(document, yield* DialogResources)
    }),
  ).pipe(Layer.provideMerge(dialogResources))

export const hoverModeOf = (model: typeof SelectBlock.Model.Type) => model.menu.hover.mode
