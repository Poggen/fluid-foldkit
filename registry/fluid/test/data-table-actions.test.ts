import { it } from '@effect/vitest'
import { Layer, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import {
  DataTableActionsBlock as block,
  DataTableActionsLayer as layer,
  RetirePalette,
} from '../src/data-table-actions.js'
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'
import { DialogResourcesServerLayer } from '../src/dialog.js'
const subject = {
  block,
  layer: layer.pipe(
    Layer.provide(Layer.merge(DropdownResourcesServerLayer, DialogResourcesServerLayer)),
  ),
}

it.effect(
  'binds the command shortcut only for a nonempty enabled selection and closes an obsolete palette',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'actions' }),
      Story.message(block.Message.OpenedPalette()),
      Story.model((model) => {
        expect(model.palette.dialog.isOpen).toBe(false)
        expect(Option.isNone(model.palette.shortcut)).toBe(true)
      }),
      Story.inMessage(
        block.InMessage.RequestedConfigure({
          selectedIds: ['a', 'b'],
          disabled: false,
          selectable: true,
        }),
      ),
      Story.message(block.Message.OpenedPalette()),
      Story.model((model) => {
        expect(model.palette.dialog.isOpen).toBe(true)
        expect(Option.getOrNull(model.palette.shortcut)).toBe('mod+k')
      }),
      Story.inMessage(
        block.InMessage.RequestedConfigure({ selectedIds: [], disabled: false, selectable: true }),
      ),
      Story.Command.expectExact(RetirePalette()),
      Story.Command.resolve(RetirePalette, block.Message.RetiredPalette()),
      Story.model((model) => {
        expect(model.palette.dialog.isOpen).toBe(false)
        expect(Option.isNone(model.palette.shortcut)).toBe(true)
        expect(model.shownCount).toBe(2)
      }),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    ),
)
it.effect('does not reserve mod+k when no actions are supplied', () =>
  Story.story(
    subject,
    Story.init({ id: 'empty-actions', selectedIds: ['a'], selectionActions: [] }),
    Story.message(block.Message.OpenedPalette()),
    Story.model((model) => {
      expect(model.palette.dialog.isOpen).toBe(false)
      expect(Option.isNone(model.palette.shortcut)).toBe(true)
    }),
    Story.expectNoOutMessage(),
    Story.Command.expectNone(),
  ),
)

it.effect('keeps sorted-move confirmation under parent control', () =>
  Story.story(
    subject,
    Story.init({ id: 'reorder' }),
    Story.inMessage(block.InMessage.RequestedConfirmMove({ open: true })),
    Story.model((model) => expect(model.confirmation.isOpen).toBe(true)),
    Story.message(block.Message.MoveConfirmed()),
    Story.expectOutMessage(block.OutMessage.MoveConfirmed()),
    Story.inMessage(block.InMessage.RequestedConfirmMove({ open: false })),
    Story.model((model) => expect(model.confirmation.isOpen).toBe(false)),
    Story.message(block.Message.MoveConfirmed()),
    Story.expectNoOutMessage(),
    Story.Command.expectNone(),
  ),
)
