// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Layer } from 'effect'
import { Block } from 'foldkit'
import { DropdownMenuBlock, menuLayer } from './dropdown.js'
import { layer as hoverLayer } from './hover.js'
import { layer as highlightLayer } from './hover-highlight.js'
import { sidebarIdentityRecipe } from './sidebar-identity.js'

const recipe = sidebarIdentityRecipe('user')

export const SidebarUserFooterKey = Symbol('SidebarUserFooter')

export const SidebarUserFooterBlock = Block.make(recipe.namespace, {
  key: SidebarUserFooterKey,
  ...recipe.contract,
})

export const SidebarUserFooterLayer = SidebarUserFooterBlock.makeLayer(
  recipe.plans(SidebarUserFooterBlock, DropdownMenuBlock),
).pipe(Layer.provide(Layer.mergeAll(menuLayer, hoverLayer, highlightLayer)))

export type {
  SidebarIdentityConfig as SidebarUserFooterConfig,
  SidebarIdentityViewInputs as SidebarUserFooterViewInputs,
} from './sidebar-identity.js'

export const hoverModeOf = (model: typeof SidebarUserFooterBlock.Model.Type) => model.hover.mode
