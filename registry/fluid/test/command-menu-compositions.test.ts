import { it as effectTest } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { Block, Story } from 'foldkit'
import { SynchronizeSelection } from '../src/tabs-selection-effects.js'
import { TabsBlock } from '../src/tabs.js'
import { ScrollAreaBlock, test as scrollTest } from '../src/scroll-area.js'
import { isDialogOpen, DialogResourcesServerLayer } from '../src/dialog.js'
import { expect, test } from 'vitest'
import { CommandMenuDialogBlock, CommandMenuDialogLayer } from '../src/command-menu-dialog.js'
import { CommandMenuTabsBlock, CommandMenuTabsLayer } from '../src/command-menu-tabs.js'
import {
  commandMenuRows,
  defineCommandMenuBlock,
  CommandMenuBlock,
  CommandMenuLayer,
} from '../src/command-menu.js'
import type { CommandMenuItem } from '../src/command-menu.js'

const dialogSubject = {
  block: CommandMenuDialogBlock,
  layer: CommandMenuDialogLayer.pipe(Layer.provide(DialogResourcesServerLayer)),
}

const tabsSubject = { block: CommandMenuTabsBlock, layer: CommandMenuTabsLayer }

const prefix = (item: CommandMenuItem, query: string) => item.label.toLowerCase().startsWith(query)

const items = [
  { value: 'write', label: 'Write document', keywords: ['new page'], group: 'Create' },
  { value: 'project', label: 'New project', group: 'Create' },
  { value: 'settings', label: 'Settings', group: 'Navigate', disabled: true },
]

effectTest.effect('controlled dialog accepts or declines intent without losing query', () =>
  Story.story(
    dialogSubject,
    Story.init({ id: 'commands', items, open: false, defaultQuery: 'new' }),
    Story.inMessage(CommandMenuDialogBlock.InMessage.RequestedToggle()),
    Story.expectOutMessage(CommandMenuDialogBlock.OutMessage.OpenChanged({ open: true })),
    Story.model((model) => expect(isDialogOpen(model.dialog)).toBe(false)),
    Story.inMessage(
      CommandMenuDialogBlock.InMessage.RequestedControlledOpen({ control: Option.some(true) }),
    ),
    Story.inMessage(CommandMenuDialogBlock.InMessage.RequestedClose()),
    Story.expectOutMessage(CommandMenuDialogBlock.OutMessage.OpenChanged({ open: false })),
    Story.model((model) => expect(isDialogOpen(model.dialog)).toBe(true)),
    Story.inMessage(
      CommandMenuDialogBlock.InMessage.RequestedControlledOpen({ control: Option.some(false) }),
    ),
    Story.model((model) => {
      expect(isDialogOpen(model.dialog)).toBe(false)
      expect(model.menu.query).toBe('new')
    }),
  ),
)

effectTest.effect('tabs wrap, propose parent values and honor acceptance', () =>
  Story.story(
    tabsSubject,
    Story.init({
      id: 'tabs',
      inputId: 'query',
      tabs: [
        { value: 'all', label: 'All' },
        { value: 'create', label: 'Create' },
      ],
      value: 'all',
    }),
    Story.message(CommandMenuTabsBlock.Message.PressedNavigationKey({ direction: 'left' })),
    Story.expectOutMessage(CommandMenuTabsBlock.OutMessage.ValueChanged({ value: 'create' })),
    Story.model((model) => expect(model.value).toBe('all')),
    Story.inMessage(CommandMenuTabsBlock.InMessage.RequestedConfigureValue({ value: 'create' })),
    Story.model((model) => expect(model.tabs.selectedIndex).toBe(1)),
    Story.Command.expectExactInOrder(
      SynchronizeSelection({ id: 'tabs', selectedIndex: 1, generation: 1 }),
    ),
    Story.Command.resolve(
      SynchronizeSelection,
      TabsBlock.Message.ObservedSelectionTabStop({
        selectedIndex: 1,
        generation: 1,
        index: Option.none(),
      }),
    ),
    Story.message(CommandMenuTabsBlock.Message.PressedNavigationKey({ direction: 'right' })),
    Story.expectOutMessage(CommandMenuTabsBlock.OutMessage.ValueChanged({ value: 'all' })),
  ),
)

test('custom prefix filtering differs from default keyword matching and suggestions do not duplicate rows', () => {
  expect(commandMenuRows(items, 'new', [], 'Suggested').map((item) => item.value)).toEqual([
    'write',
    'project',
  ])

  expect(commandMenuRows(items, 'new', [], 'Suggested', prefix).map((item) => item.value)).toEqual([
    'project',
  ])
  expect(
    commandMenuRows(items, '', ['project'], 'Suggested').map((item) => [item.value, item.group]),
  ).toEqual([
    ['project', 'Suggested'],
    ['write', 'Create'],
    ['settings', 'Navigate'],
  ])
})

const customRecipe = defineCommandMenuBlock({ filter: prefix })

const CustomKey = Symbol('PrefixCommandMenu')

const Custom = Block.make(customRecipe.namespace, { key: CustomKey, ...customRecipe.contract })

const CustomLayer = Custom.makeLayer(customRecipe.plans(Custom)).pipe(
  Layer.provide(customRecipe.childLayers),
)

effectTest.effect('custom recipe navigation uses the configured prefix filter', () =>
  Story.story(
    { block: Custom, layer: CustomLayer },
    Story.init({ id: 'prefix', items, defaultQuery: 'new' }),
    Story.message(Custom.Message.RequestedMove({ direction: 'last' })),
    Story.model((model) => expect(Option.getOrNull(model.activeIndex)).toBe(0)),
  ),
)

effectTest.effect(
  'Menu retirement resets uncontrolled defaults without changing a controlled query',
  () =>
    Effect.gen(function* () {
      yield* Story.story(
        { block: CommandMenuBlock, layer: CommandMenuLayer },
        Story.init({ id: 'retired', items, defaultQuery: 'new' }),
        Story.message(CommandMenuBlock.Message.RequestedQuery({ query: 'write' })),
        Story.inMessage(CommandMenuBlock.InMessage.RequestedRetire()),
        Story.Command.expectExactInOrder(
          scrollTest.Scroll({ id: 'retired-scroll', left: 0, top: 0 }),
        ),
        Story.Command.resolve(scrollTest.Scroll, ScrollAreaBlock.Message.CompletedScroll()),
        Story.expectNoOutMessage(),
        Story.model((model) => {
          expect(model.query).toBe('new')
          expect(Option.isNone(model.activeIndex)).toBe(true)
          expect(Option.isNone(model.height)).toBe(true)
        }),
      )
      yield* Story.story(
        { block: CommandMenuBlock, layer: CommandMenuLayer },
        Story.init({ id: 'accepted', items, query: 'write', defaultQuery: 'new' }),
        Story.inMessage(CommandMenuBlock.InMessage.RequestedRetire()),
        Story.Command.expectExactInOrder(
          scrollTest.Scroll({ id: 'accepted-scroll', left: 0, top: 0 }),
        ),
        Story.Command.resolve(scrollTest.Scroll, ScrollAreaBlock.Message.CompletedScroll()),
        Story.model((model) => expect(model.query).toBe('write')),
      )
    }),
)

const platforms: ReadonlyArray<'mac' | 'other'> = ['mac', 'other']
for (const platform of platforms) {
  effectTest.effect(
    `command menu seeds ${platform} platform glyphs before browser observation`,
    () =>
      Story.story(
        { block: CommandMenuBlock, layer: CommandMenuLayer },
        Story.init({ id: 'platform-seed', items, platform }),
        Story.model((model) => expect(model.mac).toBe(platform === 'mac')),
      ),
  )
}

effectTest.effect('dialog appearance updates preserve an open menu and its query', () =>
  Story.story(
    dialogSubject,
    Story.init({ id: 'appearance', items, defaultQuery: 'new' }),
    Story.inMessage(CommandMenuDialogBlock.InMessage.RequestedOpen()),
    Story.model((model) => expect(isDialogOpen(model.dialog)).toBe(true)),
    Story.models(
      Story.steps(
        Story.inMessage(CommandMenuDialogBlock.InMessage.RequestedHoverMode({ mode: 'standard' })),
      ),
      (before, after) => {
        expect(isDialogOpen(after.dialog)).toBe(true)
        expect(after.menu.query).toBe('new')
        expect(after.menu.hover.mode).toBe('standard')
        expect(before.menu.hover.mode).toBe('fluid')
      },
    ),
  ),
)
