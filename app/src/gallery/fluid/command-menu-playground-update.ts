import { CommandMenuItem } from '@foldkit-visuals/fluid/command-menu'
import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
import { commandRows, type Configuration } from '../../playground/configs/command-menu'
import type { ComponentPresentation } from '../../settings'
import { FluidGalleryBlock } from './block'
import { Commands } from './details-bindings'
import { CommandDialog } from './playground-bindings'
const equalItems = Schema.toEquivalence(Schema.Array(CommandMenuItem))
export const reconcileCommandMenu = (config: Configuration, _presentation: ComponentPresentation) =>
  FluidGalleryBlock.makeStep((model) => {
    const inline = commandRows(
      config,
      model.commandTabs.value,
      model.commandFilter.value,
      model.commandSort.value,
      model.commands.query,
    )
    const dialog = commandRows(
      config,
      model.commandTabs.value,
      model.commandFilter.value,
      model.commandSort.value,
      model.commandDialog.menu.query,
    )
    return Update.combineSteps([
      ...(equalItems(model.commands.items, inline)
        ? []
        : [Commands.requestConfigure({ items: inline, query: Option.none() })]),
      ...(equalItems(model.commandDialog.menu.items, dialog)
        ? []
        : [CommandDialog.requestConfigure({ items: dialog, query: Option.none() })]),
      ...(Option.getOrNull(model.commandDialog.shortcut) === config.shortcut
        ? []
        : [CommandDialog.requestShortcut({ shortcut: Option.some(config.shortcut) })]),
    ])
  })
