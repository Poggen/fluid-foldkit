import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { Story } from 'foldkit'
import { DialogResourcesServerLayer } from '../src/dialog-resources.js'
import { ComboboxBlock as Combo, layer } from '../src/combobox.js'
import { ComboboxPopupBlock, test as popupTest } from '../src/combobox-popup.js'
import { presentedComboboxOptions } from '../src/combobox-options.js'
import type { ComboboxViewInputs } from '../src/combobox-view.js'

const subject = { block: Combo, layer: layer.pipe(Layer.provide(DialogResourcesServerLayer)) }
const items = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'archived', label: 'Archived', disabled: true },
]
const viewInputs: ComboboxViewInputs = { animate: (node) => node }
const settleCommands = (...generations: ReadonlyArray<number>) =>
  Story.steps(
    Story.Command.expectExactInOrder(
      ...generations.map((generation) => popupTest.FinishExit({ generation })),
    ),
    Story.Command.resolveAllExact(
      ...generations.map(
        (generation) =>
          [
            popupTest.FinishExit({ generation }),
            ComboboxPopupBlock.Message.CompletedExit({ generation }),
          ] satisfies readonly [unknown, unknown],
      ),
    ),
  )

test.effect('controlled multi-selection emits intent while chips retain the accepted value', () =>
  Story.story(
    subject,
    Story.init({ id: 'teams', items, multiple: true, value: ['design'] }),
    Story.message(Combo.Message.Committed({ value: 'engineering' })),
    Story.expectOutMessage(Combo.OutMessage.ValuesChanged({ values: ['design', 'engineering'] })),
    Story.model((model) => {
      expect(model.values).toEqual(['design'])
      expect(model.chips.filter((chip) => chip.present).map((chip) => chip.value)).toEqual([
        'design',
      ])
    }),
    Story.inMessage(
      Combo.InMessage.RequestedConfigure({ items, value: ['design', 'engineering'] }),
    ),
    Story.model((model) => {
      expect(model.values).toEqual(['design', 'engineering'])
      expect(model.chips.filter((chip) => chip.present).map((chip) => chip.value)).toEqual([
        'design',
        'engineering',
      ])
    }),
    Story.Command.expectNone(),
  ),
)

test.effect(
  'creation requests wait for application acceptance and disabled rows cannot select',
  () =>
    Effect.gen(function* () {
      const proposed = yield* Story.story(
        subject,
        Story.init({ id: 'teams', items, multiple: true, allowCreate: true }),
        Story.message(Combo.Message.Inputted({ query: 'Research' })),
        Story.message(Combo.Message.Committed({ value: '\u0000create' })),
        Story.expectOutMessage(Combo.OutMessage.CreateRequested({ query: 'Research' })),
        Story.model((model) => {
          expect(model.values).toEqual([])
          expect(model.open).toBe(false)
          expect(model.query).toBe('')
          expect(presentedComboboxOptions(model, viewInputs).presented).toEqual([])
        }),
        settleCommands(2),
      )
      yield* Story.story(
        subject,
        Story.given(proposed),
        Story.inMessage(
          Combo.InMessage.RequestedAcceptCreated({
            item: { value: 'research', label: 'Research' },
          }),
        ),
        Story.model((model) => {
          expect(model.values).toEqual(['research'])
          expect(model.query).toBe('')
          expect(model.open).toBe(false)
        }),
        Story.message(Combo.Message.Committed({ value: 'archived' })),
        Story.model((model) => expect(model.values).toEqual(['research'])),
        Story.Command.expectNone(),
      )
      yield* Story.story(
        subject,
        Story.given(proposed),
        Story.inMessage(Combo.InMessage.RequestedOpen()),
        Story.inMessage(
          Combo.InMessage.RequestedAcceptCreated({
            item: { value: 'research', label: 'Research' },
          }),
        ),
        Story.model((model) => {
          expect(model.open).toBe(true)
          expect(model.values).toEqual(['research'])
        }),
        Story.Command.expectNone(),
      )
    }),
)

test.effect(
  'a stale chip exit cannot remove a reselected value, and reset restores the default',
  () =>
    Effect.gen(function* () {
      const removed = yield* Story.story(
        subject,
        Story.init({ id: 'teams', items, multiple: true, defaultValue: ['design'] }),
        Story.message(Combo.Message.Removed({ value: 'design' })),
        Story.model((model) => {
          expect(model.values).toEqual([])
          expect(model.chips[0]?.present).toBe(false)
        }),
        Story.Command.expectNone(),
      )
      const exiting = removed.chips[0]
      if (exiting === undefined) throw new Error('Expected retained chip')
      yield* Story.story(
        subject,
        Story.given(removed),
        Story.message(Combo.Message.Committed({ value: 'design' })),
        Story.message(
          Combo.Message.ChipExited({ value: 'design', generation: exiting.generation }),
        ),
        Story.model((model) =>
          expect(model.chips.map((chip) => [chip.value, chip.present])).toEqual([['design', true]]),
        ),
        Story.message(Combo.Message.Committed({ value: 'engineering' })),
        Story.message(Combo.Message.RequestedReset()),
        Story.model((model) => expect(model.values).toEqual(['design'])),
        Story.Command.expectNone(),
      )
    }),
)

test.effect(
  'Multi-pick retains unfiltered highlighting and freezes filtered choices during exit',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'multiple', items, multiple: true }),
      Story.inMessage(Combo.InMessage.RequestedOpen()),
      Story.message(Combo.Message.Activated({ index: 1 })),
      Story.message(Combo.Message.Committed({ value: 'engineering' })),
      Story.model((model) => {
        expect(model.open).toBe(true)
        expect(Option.getOrNull(model.activeIndex)).toBe(1)
      }),
      Story.message(Combo.Message.Inputted({ query: 'Des' })),
      Story.message(Combo.Message.Committed({ value: 'design' })),
      Story.model((model) => {
        expect(model.open).toBe(false)
        expect(model.query).toBe('')
        expect(model.values).toEqual(['engineering', 'design'])
        expect(presentedComboboxOptions(model, viewInputs).presented).toEqual([items[0]])
      }),
      settleCommands(2),
    ),
)

test.effect('Creation intent closes and clears when application declines creation', () =>
  Story.story(
    subject,
    Story.init({ id: 'create', items, allowCreate: true }),
    Story.message(Combo.Message.Inputted({ query: 'Research' })),
    Story.message(Combo.Message.Committed({ value: '\u0000create' })),
    Story.expectOutMessage(Combo.OutMessage.CreateRequested({ query: 'Research' })),
    Story.model((model) => {
      expect(model.open).toBe(false)
      expect(model.query).toBe('')
      expect(model.values).toEqual([])
    }),
    settleCommands(2),
  ),
)

for (const key of ['ArrowDown', 'ArrowUp'] as const) {
  test.effect(`keyboard ${key} reopens a closing popup before the DOM catches up`, () =>
    Story.story(
      subject,
      Story.init({ id: 'teams', items }),
      Story.inMessage(Combo.InMessage.RequestedOpen()),
      Story.inMessage(Combo.InMessage.RequestedClose()),
      Story.model((model) => expect(model.open).toBe(false)),
      Story.message(Combo.Message.Navigated({ key })),
      Story.model((model) => {
        expect(model.open).toBe(true)
        expect(model.openingLast).toBe(key === 'ArrowUp')
      }),
      settleCommands(2),
      Story.model((model) => expect(model.popup.retained).toBe(true)),
    ),
  )
}

test.effect(
  'Base rapid Backspace retains the next accepted chip until the physical exit retires',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'chips', items, multiple: true, value: ['design', 'engineering'] }),
      Story.message(Combo.Message.Activated({ index: 1 })),
      Story.message(Combo.Message.Backspaced({ renderedChipsCount: 2 })),
      Story.expectOutMessage(Combo.OutMessage.ValuesChanged({ values: ['design'] })),
      Story.model((model) => expect(Option.getOrNull(model.activeIndex)).toBeNull()),
      Story.inMessage(Combo.InMessage.RequestedConfigure({ items, value: ['design'] })),
      Story.message(Combo.Message.Backspaced({ renderedChipsCount: 2 })),
      Story.expectOutMessage(Combo.OutMessage.ValuesChanged({ values: ['design'] })),
      Story.model((model) => {
        expect(model.values).toEqual(['design'])
        expect(Option.getOrNull(model.activeIndex)).toBeNull()
      }),
      Story.messageWith((model) => {
        const exiting = model.chips.find((chip) => chip.value === 'engineering')
        if (exiting === undefined) throw new Error('Expected retained engineering chip')
        return Combo.Message.ChipExited({ value: 'engineering', generation: exiting.generation })
      }),
      Story.message(Combo.Message.Backspaced({ renderedChipsCount: 1 })),
      Story.expectOutMessage(Combo.OutMessage.ValuesChanged({ values: [] })),
      Story.Command.expectNone(),
    ),
)

test.effect(
  'Base multi-pick closes a filtered external input and keeps an unfiltered list open',
  () =>
    Effect.gen(function* () {
      yield* Story.story(
        subject,
        Story.init({ id: 'filtered', items, multiple: true }),
        Story.inMessage(Combo.InMessage.RequestedOpen()),
        Story.message(Combo.Message.Committed({ value: 'design' })),
        Story.model((model) => expect(model.open).toBe(true)),
        Story.message(Combo.Message.Inputted({ query: 'Eng' })),
        Story.message(Combo.Message.Committed({ value: 'engineering' })),
        Story.expectOutMessage(
          Combo.OutMessage.ValuesChanged({ values: ['design', 'engineering'] }),
        ),
        Story.model((model) => {
          expect(model.values).toEqual(['design', 'engineering'])
          expect(model.query).toBe('')
          expect(model.open).toBe(false)
          expect(presentedComboboxOptions(model, viewInputs).presented).toEqual([items[1]])
        }),
        Story.inMessage(Combo.InMessage.RequestedOpen()),
        Story.model((model) =>
          expect(presentedComboboxOptions(model, viewInputs).presented).toEqual(items),
        ),
        settleCommands(2),
        Story.message(Combo.Message.Inputted({ query: 'Des' })),
        Story.inMessage(Combo.InMessage.RequestedClose()),
        Story.model((model) => {
          expect(model.query).toBe('')
          expect(presentedComboboxOptions(model, viewInputs).presented).toEqual([items[0]])
        }),
        settleCommands(4),
      )
      yield* Story.story(
        subject,
        Story.init({ id: 'single-filtered', items }),
        Story.message(Combo.Message.Inputted({ query: 'Engineering' })),
        Story.message(Combo.Message.Committed({ value: 'engineering' })),
        Story.model((model) =>
          expect(presentedComboboxOptions(model, viewInputs).presented).toEqual([items[1]]),
        ),
        Story.inMessage(Combo.InMessage.RequestedOpen()),
        settleCommands(2),
        Story.inMessage(Combo.InMessage.RequestedClose()),
        Story.model((model) =>
          expect(presentedComboboxOptions(model, viewInputs).presented).toEqual(items),
        ),
        settleCommands(4),
      )
    }),
)

test.effect('live mode configuration retains selection, popup, query and unrelated options', () =>
  Story.story(
    subject,
    Story.init({
      id: 'live-mode',
      items,
      multiple: true,
      defaultValue: ['design', 'engineering'],
      hideSelected: true,
      allowCreate: true,
    }),
    Story.inMessage(Combo.InMessage.RequestedOpen()),
    Story.message(Combo.Message.Inputted({ query: 'des' })),
    Story.inMessage(Combo.InMessage.RequestedConfigure({ items, multiple: false })),
    Story.model((model) => {
      expect(model.multiple).toBe(false)
      expect(model.values).toEqual(['design'])
      expect(model.open).toBe(true)
      expect(model.query).toBe('des')
      expect(model.hideSelected).toBe(true)
      expect(model.allowCreate).toBe(true)
    }),
    Story.inMessage(Combo.InMessage.RequestedConfigure({ items, multiple: true })),
    Story.model((model) => {
      expect(model.values).toEqual(['design'])
      expect(model.open).toBe(true)
      expect(model.query).toBe('des')
    }),
    Story.Command.expectNone(),
  ),
)
