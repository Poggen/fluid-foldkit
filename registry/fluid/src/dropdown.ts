/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Layer } from 'effect'
import { Block } from 'foldkit'
import { DropdownNamespace, contract, subContract, dependencies } from './dropdown-composition.js'
import { dropdownPlans, dropdownSubPlans } from './dropdown-layer.js'

export type { DropdownProps } from './dropdown-props.js'

export type { DropdownConfig, DropdownSubConfig } from './dropdown-state.js'

export { Model as DropdownModel, DropdownEvent } from './dropdown-composition.js'

export const DropdownKey = Symbol('Dropdown')

export const DropdownBlock = Block.make(DropdownNamespace, { ...contract, key: DropdownKey })

export const layer = DropdownBlock.makeLayer(
  dropdownPlans<typeof DropdownKey>(DropdownBlock, true),
).pipe(Layer.provide(dependencies))

export const DropdownMenuKey = Symbol('DropdownMenu')

export const DropdownMenuBlock = Block.make(DropdownNamespace, {
  ...contract,
  key: DropdownMenuKey,
})

export const menuLayer = DropdownMenuBlock.makeLayer(
  dropdownPlans<typeof DropdownMenuKey>(DropdownMenuBlock, false),
).pipe(Layer.provide(dependencies))

export const DropdownSubKey = Symbol('DropdownSub')

export const DropdownSubBlock = Block.make(DropdownNamespace, {
  ...subContract,
  key: DropdownSubKey,
})

export const subLayer = DropdownSubBlock.makeLayer(
  dropdownSubPlans<typeof DropdownSubKey>(DropdownSubBlock),
).pipe(Layer.provide(dependencies))

export const hoverModeOf = (model: typeof DropdownBlock.Model.Type) => model.hover.mode
