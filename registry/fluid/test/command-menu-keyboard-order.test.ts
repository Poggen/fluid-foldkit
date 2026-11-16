import { it } from '@effect/vitest'
import { Layer, Option } from 'effect'
import { Block, Story } from 'foldkit'
import {
  CommandMenuBlock as Menu,
  CommandMenuLayer,
  defineCommandMenuBlock,
} from '../src/command-menu.js'

const subject = { block: Menu, layer: CommandMenuLayer }
const write = { value: 'write', label: 'Write document', group: 'Create', keywords: ['new page'] }
const blocked = { value: 'blocked', label: 'Blocked', disabled: true, group: 'Create' }
const project = { value: 'project', label: 'New project', group: 'Navigate' }
const items = [write, blocked, project]

it.effect('Enter selects the latest keyboard row without an intervening render', () =>
  Story.story(
    subject,
    Story.init({ id: 'command-order', items }),
    Story.message(Menu.Message.RequestedMove({ direction: 'first' })),
    Story.message(Menu.Message.RequestedMove({ direction: 'next' })),
    Story.message(Menu.Message.Entered()),
    Story.expectOutMessage(Menu.OutMessage.Selected({ item: project })),
    Story.Command.expectNone(),
  ),
)

it.effect('Enter preserves the displayed first enabled suggestion and canonical item payload', () =>
  Story.story(
    subject,
    Story.init({ id: 'command-initial', items, suggestions: ['project'] }),
    Story.message(Menu.Message.Entered()),
    Story.expectOutMessage(Menu.OutMessage.Selected({ item: project })),
    Story.Command.expectNone(),
  ),
)

it.effect('query then Enter resolves current filtered rows before any render', () =>
  Story.story(
    subject,
    Story.init({ id: 'command-filter', items }),
    Story.message(Menu.Message.RequestedQuery({ query: 'project' })),
    Story.expectOutMessage(Menu.OutMessage.QueryChanged({ query: 'project' })),
    Story.message(Menu.Message.Entered()),
    Story.expectOutMessage(Menu.OutMessage.Selected({ item: project })),
    Story.Command.expectNone(),
  ),
)

for (const unavailable of [[], [blocked]]) {
  it.effect(
    `Enter emits no selection when candidates are ${unavailable.length === 0 ? 'empty' : 'disabled'}`,
    () =>
      Story.story(
        subject,
        Story.init({ id: 'command-unavailable', items: unavailable }),
        Story.message(Menu.Message.RequestedMove({ direction: 'next' })),
        Story.message(Menu.Message.Entered()),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
      ),
  )
}

it.effect(
  'explicit pointer selection retains its value instead of following keyboard highlight',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'command-explicit', items }),
      Story.message(Menu.Message.RequestedMove({ direction: 'last' })),
      Story.message(Menu.Message.RequestedSelect({ value: 'write' })),
      Story.expectOutMessage(Menu.OutMessage.Selected({ item: write })),
      Story.Command.expectNone(),
    ),
)

const recipe = defineCommandMenuBlock({
  filter: (item, query) => item.label.toLowerCase().startsWith(query.toLowerCase()),
})
const PrefixKey = Symbol('KeyboardPrefixCommandMenu')
const Prefix = Block.make(recipe.namespace, { key: PrefixKey, ...recipe.contract })
const prefixLayer = Prefix.makeLayer(recipe.plans(Prefix)).pipe(Layer.provide(recipe.childLayers))

it.effect('Enter honors the configured recipe filter rather than default keyword matching', () =>
  Story.story(
    { block: Prefix, layer: prefixLayer },
    Story.init({ id: 'command-prefix', items, defaultQuery: 'new' }),
    Story.message(Prefix.Message.RequestedMove({ direction: 'first' })),
    Story.message(Prefix.Message.Entered()),
    Story.expectOutMessage(Prefix.OutMessage.Selected({ item: project })),
    Story.Command.expectNone(),
  ),
)

it.effect('initial Enter skips a disabled first row', () =>
  Story.story(
    subject,
    Story.init({ id: 'command-disabled-first', items: [blocked, project] }),
    Story.message(Menu.Message.Entered()),
    Story.expectOutMessage(Menu.OutMessage.Selected({ item: project })),
    Story.Command.expectNone(),
  ),
)

it.effect('filtering to no results clears a previous keyboard selection before Enter', () =>
  Story.story(
    subject,
    Story.init({ id: 'command-empty-filter', items }),
    Story.message(Menu.Message.RequestedMove({ direction: 'last' })),
    Story.message(Menu.Message.RequestedQuery({ query: 'unmatched-result' })),
    Story.expectOutMessage(Menu.OutMessage.QueryChanged({ query: 'unmatched-result' })),
    Story.message(Menu.Message.Entered()),
    Story.expectNoOutMessage(),
    Story.Command.expectNone(),
  ),
)

it.effect(
  'controlled query selection follows accepted state before and after parent acknowledgement',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'command-controlled', items, query: 'write' }),
      Story.message(Menu.Message.RequestedQuery({ query: 'project' })),
      Story.expectOutMessage(Menu.OutMessage.QueryChanged({ query: 'project' })),
      Story.message(Menu.Message.Entered()),
      Story.expectOutMessage(Menu.OutMessage.Selected({ item: write })),
      Story.inMessage(Menu.InMessage.RequestedConfigure({ items, query: Option.some('project') })),
      Story.message(Menu.Message.Entered()),
      Story.expectOutMessage(Menu.OutMessage.Selected({ item: project })),
      Story.Command.expectNone(),
    ),
)
