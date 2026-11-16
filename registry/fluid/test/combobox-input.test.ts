import { it } from '@effect/vitest'
import { Layer, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { ComboboxBlock as Combo, layer } from '../src/combobox.js'
import { Hover, Popup } from '../src/combobox-definition.js'
import { ComboboxPopupBlock } from '../src/combobox-popup.js'
import { HoverBlock } from '../src/hover.js'
import { DialogResourcesServerLayer } from '../src/dialog-resources.js'

const subject = { block: Combo, layer: layer.pipe(Layer.provide(DialogResourcesServerLayer)) }
const items = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
]
const init = { id: 'input-teams', items }
const publishRows = Story.steps(
  Story.messageIn(
    Popup,
    ComboboxPopupBlock.Message.RowsChanged({ values: ['design', 'engineering'] }),
  ),
  Story.Command.expectNone(),
)

it.effect(
  'typing opens a closed popup and repeated typing keeps its live query and generation',
  () =>
    Story.story(
      subject,
      Story.init(init),
      Story.message(Combo.Message.Inputted({ query: 'D' })),
      Story.model((model) => {
        expect(model.query).toBe('D')
        expect(model.open).toBe(true)
        expect(model.popup.open).toBe(true)
        expect(model.popup.retained).toBe(true)
        expect(model.popup.generation).toBe(1)
      }),
      Story.models(
        Story.steps(Story.message(Combo.Message.Inputted({ query: 'De' }))),
        (before, after) => {
          expect(after.query).toBe('De')
          expect(after.popup).toBe(before.popup)
          expect(after.hover).toBe(before.hover)
          expect(Option.isNone(after.closingQuery)).toBe(true)
          expect(Option.isNone(after.activeIndex)).toBe(true)
        },
      ),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    ),
)

it.effect('typing clears a keyboard highlight through the child binding', () =>
  Story.story(
    subject,
    Story.init(init),
    Story.message(Combo.Message.OpenedByField()),
    publishRows,
    Story.message(Combo.Message.Navigated({ key: 'ArrowDown' })),
    Story.model((model) => {
      expect(model.hover.activeIndex).toBe(1)
      expect(Option.getOrNull(model.activeIndex)).toBe(1)
    }),
    Story.message(Combo.Message.Inputted({ query: 'Eng' })),
    Story.model((model) => {
      expect(model.query).toBe('Eng')
      expect(model.popup.open).toBe(true)
      expect(model.hover.activeIndex).toBeNull()
      expect(Option.isNone(model.activeIndex)).toBe(true)
    }),
    Story.expectNoOutMessage(),
    Story.Command.expectNone(),
  ),
)

it.effect('typing clears a pointer highlight without resetting the pointer session', () =>
  Story.story(
    subject,
    Story.init({ ...init, hoverMode: 'standard' }),
    Story.message(Combo.Message.OpenedByField()),
    Story.messageIn(Hover, HoverBlock.Message.PointerEntered()),
    Story.messageIn(
      Hover,
      HoverBlock.Message.PointerMoved({
        point: { x: 10, y: 10 },
        containerRect: { top: 0, left: 0, width: 100, height: 100 },
        scroll: { x: 0, y: 0 },
        border: { x: 0, y: 0 },
        layoutSize: { width: 100, height: 100 },
        targetIndices: [1],
        disabledIndices: [],
      }),
    ),
    Story.model((model) => expect(model.hover.activeIndex).toBe(1)),
    Story.models(
      Story.steps(Story.message(Combo.Message.Inputted({ query: 'Des' }))),
      (before, after) => {
        expect(after.hover.activeIndex).toBeNull()
        expect(Option.isNone(after.activeIndex)).toBe(true)
        expect(after.hover.session).toBe(before.hover.session)
        expect(after.hover.sessionPending).toBe(before.hover.sessionPending)
        expect(after.popup.open).toBe(true)
      },
    ),
    Story.expectNoOutMessage(),
    Story.Command.expectNone(),
  ),
)

it.effect('disabled typing leaves the query and all child state unchanged', () =>
  Story.story(
    subject,
    Story.init({ ...init, disabled: true, defaultValue: 'design' }),
    Story.models(
      Story.steps(Story.message(Combo.Message.Inputted({ query: 'Eng' }))),
      (before, after) => expect(after).toBe(before),
    ),
    Story.model((model) => {
      expect(model.query).toBe('Design')
      expect(model.popup.open).toBe(false)
    }),
    Story.expectNoOutMessage(),
    Story.Command.expectNone(),
  ),
)
