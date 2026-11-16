import { it } from '@effect/vitest'
import { Layer, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { CommandMenuDialogBlock, CommandMenuDialogLayer } from './command-menu-dialog.js'
import { DialogResourcesServerLayer } from './dialog.js'
const subject = {
  block: CommandMenuDialogBlock,
  layer: CommandMenuDialogLayer.pipe(Layer.provide(DialogResourcesServerLayer)),
}
it.effect('shortcut updates preserve query and dialog occurrence', () =>
  Story.story(
    subject,
    Story.init({
      id: 'shortcut-config',
      shortcut: 'mod+k',
      defaultQuery: 'keep this query',
      items: [{ value: 'open', label: 'Open' }],
    }),
    Story.inMessage(
      CommandMenuDialogBlock.InMessage.RequestedShortcut({ shortcut: Option.some('mod+j') }),
    ),
    Story.model((model) => {
      expect(Option.getOrThrow(model.shortcut)).toBe('mod+j')
      expect(model.menu.query).toBe('keep this query')
      expect(model.dialog.id).toBe('shortcut-config-dialog')
    }),
    Story.inMessage(
      CommandMenuDialogBlock.InMessage.RequestedShortcut({ shortcut: Option.none() }),
    ),
    Story.model((model) => {
      expect(Option.isNone(model.shortcut)).toBe(true)
      expect(model.menu.query).toBe('keep this query')
    }),
  ),
)
