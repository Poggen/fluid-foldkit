import { it } from '@effect/vitest'
import { Layer, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { ComboboxBlock as Combo, layer } from '../src/combobox.js'
import { Popup } from '../src/combobox-definition.js'
import { ComboboxPopupBlock, test as popupTest } from '../src/combobox-popup.js'
import { SelectionBackgroundsBlock, test as selectionTest } from '../src/selection-backgrounds.js'
import { DialogResourcesServerLayer } from '../src/dialog-resources.js'

const subject = { block: Combo, layer: layer.pipe(Layer.provide(DialogResourcesServerLayer)) }
const items = [
  { value: 'react', label: 'React' },
  { value: 'svelte', label: 'SvelteKit' },
  { value: 'disabled', label: 'Disabled', disabled: true },
]
const publishRows = Story.messageIn(
  Popup,
  ComboboxPopupBlock.Message.RowsChanged({ values: items.map((item) => item.value) }),
)
const completedClock = [
  selectionTest.SynchronizeClock,
  SelectionBackgroundsBlock.Message.CompletedClock(),
] as const
const finishExit = Story.steps(
  Story.Command.expectExactInOrder(
    selectionTest.SynchronizeClock,
    popupTest.FinishExit({ generation: 2 }),
    selectionTest.SynchronizeClock,
  ),
  Story.Command.resolveAllExact(
    completedClock,
    [
      popupTest.FinishExit({ generation: 2 }),
      ComboboxPopupBlock.Message.CompletedExit({ generation: 2 }),
    ],
    completedClock,
  ),
)

it.effect('Enter selects the latest keyboard highlight without an intervening render', () =>
  Story.story(
    subject,
    Story.init({ id: 'keyboard-order', items }),
    Story.message(Combo.Message.OpenedByField()),
    publishRows,
    Story.message(Combo.Message.Navigated({ key: 'ArrowDown' })),
    Story.message(Combo.Message.Entered()),
    Story.expectOutMessage(Combo.OutMessage.Selected({ value: Option.some('svelte') })),
    Story.model((model) => {
      expect(model.values).toEqual(['svelte'])
      expect(model.query).toBe('SvelteKit')
      expect(model.open).toBe(false)
    }),
    finishExit,
  ),
)

it.effect('Enter uses the filtered row after typing and navigation', () =>
  Story.story(
    subject,
    Story.init({ id: 'keyboard-filter-order', items }),
    Story.message(Combo.Message.Inputted({ query: 'svel' })),
    Story.messageIn(Popup, ComboboxPopupBlock.Message.RowsChanged({ values: ['svelte'] })),
    Story.message(Combo.Message.Navigated({ key: 'ArrowDown' })),
    Story.message(Combo.Message.Entered()),
    Story.expectOutMessage(Combo.OutMessage.Selected({ value: Option.some('svelte') })),
    Story.model((model) => expect(model.query).toBe('SvelteKit')),
    finishExit,
  ),
)

it.effect('Enter does not commit a disabled row or an absent highlight', () =>
  Story.story(
    subject,
    Story.init({ id: 'keyboard-disabled', items }),
    Story.message(Combo.Message.Entered()),
    Story.message(Combo.Message.OpenedByField()),
    publishRows,
    Story.message(Combo.Message.Activated({ index: 2 })),
    Story.message(Combo.Message.Entered()),
    Story.message(Combo.Message.Activated({ index: null })),
    Story.message(Combo.Message.Entered()),
    Story.model((model) => expect(model.values).toEqual([])),
    Story.expectNoOutMessage(),
    Story.Command.expectNone(),
  ),
)

it.effect('consecutive Enter events toggle the current multi-selection without a render', () =>
  Story.story(
    subject,
    Story.init({ id: 'keyboard-multiple', items, multiple: true }),
    Story.message(Combo.Message.OpenedByField()),
    publishRows,
    Story.message(Combo.Message.Navigated({ key: 'ArrowDown' })),
    Story.message(Combo.Message.Entered()),
    Story.expectOutMessage(Combo.OutMessage.ValuesChanged({ values: ['svelte'] })),
    Story.message(Combo.Message.Entered()),
    Story.expectOutMessage(Combo.OutMessage.ValuesChanged({ values: [] })),
    Story.model((model) => {
      expect(model.values).toEqual([])
      expect(model.open).toBe(true)
    }),
    Story.Command.resolveAllExact(completedClock, completedClock),
  ),
)
