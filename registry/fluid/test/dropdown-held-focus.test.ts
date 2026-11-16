import { it } from '@effect/vitest'
import { Layer, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { DropdownMenuBlock as Dropdown, menuLayer } from '../src/dropdown.js'
import { FinishExit } from '../src/dropdown-composition.js'
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'
import type { DropdownRow } from '../src/dropdown-state.js'
import { HoverBlock, test as hoverTest } from '../src/hover.js'

const subject = {
  block: Dropdown,
  layer: menuLayer.pipe(Layer.provide(DropdownResourcesServerLayer)),
}
const row = (id: string, index: number, kind: DropdownRow['kind'] = 'action'): DropdownRow => ({
  id,
  index,
  label: id,
  kind,
  disabled: false,
  available: true,
  checked: false,
  closeOnClick: true,
})
const held = row('submenu', 2, 'submenu')
const pointerHandlers = (enabled: boolean) =>
  hoverTest.ControlHover({
    id: 'closing-hold-hover',
    action: 'PointerHandlers',
    index: null,
    enabled,
  })

for (const scenario of [
  {
    name: 'reindexed focused row',
    rows: [row('replacement', 1), row('focused', 7), held],
    focusedId: Option.some('focused'),
    activeIndex: 7,
  },
  {
    name: 'removed focused row',
    rows: [row('replacement', 1), held],
    focusedId: Option.none(),
    activeIndex: null,
  },
]) {
  it.effect(
    `closing submenu release follows the ${scenario.name} without another focus event`,
    () =>
      Story.story(
        subject,
        Story.init({ id: 'closing-hold', defaultOpen: true }),
        Story.message(Dropdown.Message.MeasuredRows({ rows: [row('focused', 1), held] })),
        Story.message(Dropdown.Message.FocusedRow({ id: Option.some('focused'), visible: true })),
        Story.model((model) => {
          expect(model.hover.activeIndex).toBe(1)
        }),
        Story.inMessage(Dropdown.InMessage.RequestedSubmenuHold({ index: 2, open: true })),
        Story.Command.expectExact(pointerHandlers(false)),
        Story.Command.resolve(pointerHandlers(false), HoverBlock.Message.CompletedControl()),
        Story.model((model) => {
          expect(model.hover.activeIndex).toBe(2)
          expect(model.hover.pointerHandlers).toBe(false)
        }),
        Story.inMessage(Dropdown.InMessage.RequestedVisibility({ open: false })),
        Story.Command.expectExact(FinishExit({ generation: 1 })),
        Story.message(Dropdown.Message.MeasuredRows({ rows: scenario.rows })),
        Story.inMessage(Dropdown.InMessage.RequestedSubmenuHold({ index: 2, open: false })),
        Story.model((model) => {
          expect(model.controller.phase).toBe('closing')
          expect(model.controller.focusedId).toEqual(scenario.focusedId)
          expect(Option.isNone(model.controller.heldIndex)).toBe(true)
          expect(model.hover.activeIndex).toBe(scenario.activeIndex)
          expect(model.hover.pointerHandlers).toBe(true)
        }),
        Story.Command.expectHas(pointerHandlers(true)),
        Story.Command.resolve(pointerHandlers(true), HoverBlock.Message.CompletedControl()),
        Story.Command.resolve(
          FinishExit({ generation: 1 }),
          Dropdown.Message.CompletedExit({ generation: 1 }),
        ),
        Story.Command.expectNone(),
      ),
  )
}
