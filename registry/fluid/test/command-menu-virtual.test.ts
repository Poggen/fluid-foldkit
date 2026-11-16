import { it } from '@effect/vitest'
import { Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { VirtualList } from '@foldkit/ui'
import { CommandMenuBlock as Menu, CommandMenuLayer } from '../src/command-menu.js'

const subject = { block: Menu, layer: CommandMenuLayer }
const items = Array.from({ length: 100 }, (_, index) => ({
  value: `item-${index}`,
  label: `Item ${index}`,
  group: index < 50 ? 'First' : 'Second',
  disabled: index === 98,
}))

it.effect('virtual menus reveal offscreen logical results through native scroll commands', () =>
  Story.withBlock(subject, (menu) => {
    const initial = menu.init({ id: 'virtual-menu', items, virtualized: true }).model
    const last = menu.update(initial, Menu.Message.RequestedMove({ direction: 'last' }))
    expect(Option.getOrNull(last.model.activeIndex)).toBe(99)
    const scroll = (last.commands ?? []).flatMap((command) =>
      Option.toArray(Story.Command.argsOf(VirtualList.test.ApplyScroll)(command)),
    )
    expect(scroll).toContainEqual(
      expect.objectContaining({
        id: 'virtual-menu-results-group%3ASecond',
        request: { _tag: 'Target', target: { _tag: 'Index', index: 49 }, alignment: 'Nearest' },
      }),
    )
    const selected = menu.update(last.model, Menu.Message.Entered())
    expect(selected.outMessage).toEqual(
      Menu.OutMessage.Selected({ item: Option.getOrThrow(Option.fromUndefinedOr(items[99])) }),
    )
    const previous = menu.update(last.model, Menu.Message.RequestedMove({ direction: 'previous' }))
    expect(Option.getOrNull(previous.model.activeIndex)).toBe(97)
    const first = menu.update(previous.model, Menu.Message.RequestedMove({ direction: 'first' }))
    const wrapped = menu.update(first.model, Menu.Message.RequestedMove({ direction: 'previous' }))
    expect(Option.getOrNull(wrapped.model.activeIndex)).toBe(99)
  }),
)

it.effect('filtering a virtual menu removes old groups and keeps logical selection current', () =>
  Story.withBlock(subject, (menu) => {
    const initial = menu.init({ id: 'virtual-filter', items, virtualized: true }).model
    const filtered = menu.update(initial, Menu.Message.RequestedQuery({ query: 'Item 52' })).model
    expect(Object.keys(filtered.virtualLists)).toEqual(['group:Second'])
    const selected = menu.update(filtered, Menu.Message.Entered())
    expect(selected.outMessage).toEqual(
      Menu.OutMessage.Selected({ item: Option.getOrThrow(Option.fromUndefinedOr(items[52])) }),
    )
    const empty = menu.update(filtered, Menu.Message.RequestedQuery({ query: 'missing' })).model
    expect(Object.keys(empty.virtualLists)).toEqual([])
    expect(Option.isNone(empty.activeIndex)).toBe(true)
    expect(menu.update(empty, Menu.Message.Entered()).outMessage).toBeUndefined()
  }),
)
