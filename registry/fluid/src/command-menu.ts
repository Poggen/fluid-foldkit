// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Layer } from 'effect'
import { Block } from 'foldkit'
import { CommandMenuNamespace, commandMenuContract } from './command-menu-definition.js'
import { commandMenuPlans, commandMenuChildrenLayer } from './command-menu-plans.js'
import type { CommandMenuOptions } from './command-menu-contracts.js'

export const defineCommandMenuBlock = (options: CommandMenuOptions = {}) => ({
  namespace: CommandMenuNamespace,
  contract: commandMenuContract,
  childLayers: commandMenuChildrenLayer,
  plans: <const Key extends symbol>(
    block: ReturnType<typeof Block.make<'CommandMenu', Key, typeof commandMenuContract>>,
  ) => commandMenuPlans<Key>(block, options),
})

export const CommandMenuKey = Symbol('CommandMenu')

export const CommandMenuBlock = Block.make(CommandMenuNamespace, {
  key: CommandMenuKey,
  ...commandMenuContract,
})

export const CommandMenuLayer = CommandMenuBlock.makeLayer(
  commandMenuPlans(CommandMenuBlock, {}),
).pipe(Layer.provide(commandMenuChildrenLayer))

export { CommandMenuShortcut, CommandMenuFooter } from './command-menu-parts.js'

export { parseShortcut, matchesShortcut, hasModifier, formatShortcut } from './command-shortcuts.js'

export {
  CommandMenuItem,
  CommandMenuConfig,
  commandMenuRows,
  defaultCommandMenuFilter,
} from './command-menu-contracts.js'

export type { CommandMenuViewInputs, CommandMenuOptions } from './command-menu-contracts.js'

export const hoverModeOf = (model: typeof CommandMenuBlock.Model.Type) => model.hover.mode
