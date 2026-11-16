import { it } from '@effect/vitest'
import { Layer, Option, Result } from 'effect'
import { AsyncData, Story } from 'foldkit'
import { toParentMessageFor } from 'foldkit/test'
import { FontCatalogueQuery } from './query'
import { CommandMenuDialogBlock } from '@foldkit-visuals/fluid/command-menu-dialog'
import { expect } from 'vitest'
import { CommandMenuTabsBlock } from '@foldkit-visuals/fluid/command-menu-tabs'
import { DialogResourcesServerLayer } from '@foldkit-visuals/fluid/dialog'
import { TabsBlock } from '@foldkit-visuals/fluid/tabs'
import { SynchronizeSelection } from '../../../registry/fluid/src/tabs-selection-effects'
import { defaults } from '../settings'
import { GoogleFontPickerBlock, googleFontPickerLayer, test } from './picker'

it.effect('accepts keyboard category selection in both the filter and visible tab', () =>
  Story.story(
    {
      block: GoogleFontPickerBlock,
      layer: googleFontPickerLayer.pipe(Layer.provide(DialogResourcesServerLayer)),
    },
    Story.init(defaults),
    Story.messageIn(
      test.Categories,
      CommandMenuTabsBlock.Message.PressedNavigationKey({ direction: 'right' }),
    ),
    Story.model((model) => {
      expect(model.category).toBe('serif')
      expect(model.tabs.value).toBe('serif')
      expect(model.tabs.tabs.selectedIndex).toBe(1)
    }),
    Story.Command.expectExactInOrder(
      SynchronizeSelection({ id: 'google-font-categories', selectedIndex: 1, generation: 1 }),
    ),
    Story.Command.resolve(
      SynchronizeSelection,
      TabsBlock.Message.ObservedSelectionTabStop({
        selectedIndex: 1,
        generation: 1,
        index: Option.none(),
      }),
    ),
  ),
)

const catalogue: import('./catalogue').FontCatalogue = {
  source: 'fixture',
  retrieved: '2026-11-16',
  fonts: [
    {
      name: 'Inter',
      category: 'sans-serif',
      weights: [400, 700],
      italicOnly: false,
      weightAxis: null,
      opticalAxis: null,
    },
  ],
}
const subject = {
  block: GoogleFontPickerBlock,
  layer: googleFontPickerLayer.pipe(Layer.provide(DialogResourcesServerLayer)),
}
const open = GoogleFontPickerBlock.InMessage.RequestedOpen({
  current: 'Inter',
  returnFocusId: 'font-trigger',
})

it.effect('opening a font picker repeatedly reuses its successful native catalogue query', () =>
  Story.withBlock(subject, (picker) => {
    const initial = picker.init(defaults).model
    const opened = picker.inMessageUpdate(initial, open).model
    const loaded = picker.update(
      opened,
      toParentMessageFor(picker)(
        test.Catalogue,
        FontCatalogueQuery.Message.CompletedFetch({
          generation: opened.catalogue.generation,
          result: Result.succeed(catalogue),
        }),
      ),
    ).model
    const reopened = picker.inMessageUpdate(loaded, open)
    expect(AsyncData.getData(FontCatalogueQuery.read(reopened.model.catalogue))).toEqual(
      Option.some(catalogue),
    )
    expect(reopened.model.palette.menu.items.map((item) => item.value)).toEqual(['Inter'])
    expect(
      (reopened.commands ?? []).flatMap((command) =>
        Option.toArray(Story.Command.argsOf(FontCatalogueQuery.Fetch)(command)),
      ),
    ).toEqual([])
  }),
)

it.effect('closing a loading font picker rejects its old catalogue completion', () =>
  Story.withBlock(subject, (picker) => {
    const opened = picker.inMessageUpdate(picker.init(defaults).model, open).model
    const closed = picker.update(
      opened,
      toParentMessageFor(picker)(test.Palette, CommandMenuDialogBlock.Message.ShortcutToggled()),
    ).model
    const completed = picker.update(
      closed,
      toParentMessageFor(picker)(
        test.Catalogue,
        FontCatalogueQuery.Message.CompletedFetch({
          generation: opened.catalogue.generation,
          result: Result.succeed(catalogue),
        }),
      ),
    ).model
    expect(AsyncData.getData(FontCatalogueQuery.read(completed.catalogue))).toEqual(Option.none())
    expect(completed.palette.menu.items).toEqual([])
    const reopened = picker.inMessageUpdate(completed, open)
    expect(
      (reopened.commands ?? []).flatMap((command) =>
        Option.toArray(Story.Command.argsOf(FontCatalogueQuery.Fetch)(command)),
      ),
    ).toHaveLength(1)
  }),
)
