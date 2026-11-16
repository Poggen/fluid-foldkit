import { it } from '@effect/vitest'
import { Layer } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { DropdownMenuBlock as Dropdown, menuLayer } from '../src/dropdown.js'
import { FinishExit } from '../src/dropdown-composition.js'
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'
const subject = {
  block: Dropdown,
  layer: menuLayer.pipe(Layer.provide(DropdownResourcesServerLayer)),
}

it.effect('uses admitted hover state for clicks and preserves controlled rejection', () =>
  Story.story(
    subject,
    Story.init({ id: 'hover-click' }),
    Story.message(Dropdown.Message.HoveredTrigger({ over: true, openOnHover: true })),
    Story.message(Dropdown.Message.ClickedTrigger({ withinHoverAdmission: true })),
    Story.model((m) => {
      expect(m.controller.phase).toBe('open')
    }),
    Story.expectNoOutMessage(),
    Story.message(Dropdown.Message.ClickedTrigger({ withinHoverAdmission: false })),
    Story.model((m) => {
      expect(m.controller.phase).toBe('closing')
    }),
    Story.Command.expectExact(FinishExit({ generation: 2 })),
    Story.Command.resolve(FinishExit, Dropdown.Message.CompletedExit({ generation: 2 })),
    Story.Command.expectNone(),
  ),
)

it.effect('controlled hover requests leave rejected visibility intact', () =>
  Story.story(
    subject,
    Story.init({ id: 'rejected-hover', open: false }),
    Story.message(Dropdown.Message.HoveredTrigger({ over: true, openOnHover: true })),
    Story.message(Dropdown.Message.ClickedTrigger({ withinHoverAdmission: true })),
    Story.model((m) => {
      expect(m.controller.phase).toBe('absent')
    }),
    Story.expectOutMessage(
      Dropdown.OutMessage.Events({ events: [{ _tag: 'OpenChanged', open: true }] }),
    ),
    Story.Command.expectNone(),
  ),
)

it.effect('disabled triggers reject clicks', () =>
  Story.story(
    subject,
    Story.init({ id: 'disabled-hover' }),
    Story.inMessage(Dropdown.InMessage.RequestedDisabled({ disabled: true })),
    Story.message(Dropdown.Message.ClickedTrigger({ withinHoverAdmission: false })),
    Story.model((m) => {
      expect(m.controller.phase).toBe('absent')
    }),
    Story.expectNoOutMessage(),
    Story.Command.expectNone(),
  ),
)
