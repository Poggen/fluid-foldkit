import {
  CommandMenuDialogBlock,
  CommandMenuDialogLayer,
  hoverModeOf,
} from '@foldkit-visuals/fluid/command-menu-dialog'
import { isDialogOpen } from '@foldkit-visuals/fluid/dialog'
import { CommandMenuFooter } from '@foldkit-visuals/fluid/command-menu'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { motion } from './motion'
import { Settings, presentation } from './settings'
import {
  CommandMenuTabsBlock,
  CommandMenuTabsLayer,
} from '@foldkit-visuals/fluid/command-menu-tabs'
import { SearchCategory, SearchIntent, searchItems, searchTabs } from './search-items'

const OutMessage = defineMessageUnion({ RequestedIntent: { intent: SearchIntent } })
const key = Symbol('Search')
export const SearchBlock = Block.make('Search', {
  key,
  InitArgs: Schema.Tuple([Settings, Schema.String]),
  ChildInitContext: Schema.Struct({ settings: Settings, path: Schema.String }),
  Model: Schema.Struct({
    palette: CommandMenuDialogBlock.Model,
    tabs: CommandMenuTabsBlock.Model,
    path: Schema.String,
  }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    RequestedOpen: {},
    InformedOfPage: { path: Schema.String },
    InformedOfHoverMode: { mode: Settings.fields.hover },
  }),
  OutMessage,
  inMessageOutputs: { RequestedOpen: { outMessage: OutMessage } },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof CommandMenuDialogBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: Pick<Settings, 'shape' | 'size' | 'hover'>
    }>(),
  },
})
const PaletteRequests = SearchBlock.makeRequiredFieldBinding(CommandMenuDialogBlock, {
  field: 'palette',
  init: {
    contextToArgs: ({ settings, path }) => [
      {
        id: 'site-search',
        virtualized: true,
        items: searchItems(path, 'all'),
        shortcut: 'mod+k',
        hoverMode: settings.hover,
      },
    ],
  },
})
const Palette = PaletteRequests.withOutMessagePolicy({
  fold: SearchBlock.makeOutMessageFold(CommandMenuDialogBlock, {
    Selected: ({ item }) =>
      SearchBlock.makeStep((model) => {
        const selected = searchItems(model.path, categoryOf(model)).find(
          (entry) => entry.value === item.value,
        )
        return selected === undefined
          ? { model }
          : { model, outMessage: OutMessage.RequestedIntent({ intent: selected.intent }) }
      }),
    OpenChanged: ({ open }) => (open ? refresh : SearchBlock.makeNoopStep()),
    QueryChanged: SearchBlock.makeNoopStep,
  }),
})
const TabsRequests = SearchBlock.makeRequiredFieldBinding(CommandMenuTabsBlock, {
  field: 'tabs',
  init: {
    contextToArgs: ({ settings }) => [
      {
        id: 'site-search-categories',
        inputId: 'site-search-input',
        tabs: searchTabs,
        value: 'all',
        hoverMode: settings.hover,
      },
    ],
  },
})
const categoryOf: (model: typeof SearchBlock.Model.Type) => SearchCategory = (
  model: typeof SearchBlock.Model.Type,
) => (Schema.is(SearchCategory)(model.tabs.value) ? model.tabs.value : 'all')
const refresh = SearchBlock.makeStep((model) => {
  const items = searchItems(model.path, categoryOf(model))
  return model.palette.menu.items.length === items.length &&
    model.palette.menu.items.every((item, index) => item.value === items[index]?.value)
    ? { model }
    : PaletteRequests.requestConfigure({ items, query: Option.none() })
})
const Tabs = TabsRequests.withOutMessagePolicy({
  fold: SearchBlock.makeOutMessageFold(CommandMenuTabsBlock, {
    ValueChanged: ({ value }) =>
      Schema.is(SearchCategory)(value)
        ? Update.combineSteps([TabsRequests.requestConfigureValue({ value }), refresh])
        : SearchBlock.makeNoopStep(),
  }),
})
const SearchComposition = SearchBlock.makeComposition({ bindings: [Palette, Tabs] })
const implementation = {
  init: SearchComposition.makeInit((settings, path) => ({
    model: { path },
    childInitContext: { settings, path },
  })),
  update: SearchComposition.makeUpdate({}),
  inMessageUpdate: SearchComposition.makeInMessageUpdate({
    RequestedOpen: PaletteRequests.requestOpen(),
    InformedOfPage: SearchBlock.makeStep((_model, { path }) =>
      Update.combineSteps([
        SearchBlock.makeFieldsStep(() => ({ path: () => path })),
        SearchBlock.makeStep((model) => (isDialogOpen(model.palette.dialog) ? refresh : { model })),
      ]),
    ),
    InformedOfHoverMode: SearchBlock.makeStep((model, { mode }) =>
      hoverModeOf(model.palette) === mode
        ? SearchBlock.makeNoopStep()
        : Update.combineSteps([
            PaletteRequests.requestHoverMode({ mode }),
            TabsRequests.requestHoverMode({ mode }),
          ]),
    ),
  }),
  view: SearchComposition.makeView.withInputs<{
    readonly settings: Pick<Settings, 'shape' | 'size' | 'hover'>
  }>((model, { settings }, h) => {
    const iconsByValue = new Map(
      searchItems(model.path, categoryOf(model)).map((item) => [item.value, item.icon]),
    )
    const context = presentation(settings)
    const { icons } = resolvePresentation({ context })
    return h.block(
      Palette.embedView({
        slotId: 'search-palette',
        model: model.palette,
        viewInputs: {
          context: presentation(settings),
          animate: motion.node,
          title: 'Site menu',
          description: 'Jump to a page or change a setting.',
          placeholder: 'Go to a page, change a setting…',
          header: () =>
            h.block(
              Tabs.embedView({
                slotId: 'search-categories',
                model: model.tabs,
                viewInputs: { context: presentation(settings), animate: motion.node },
              }),
            ),
          emptyText: 'No results found.',
          itemIconFor: (item) => {
            const name = iconsByValue.get(item.value)
            return name === undefined ? undefined : icons[name]
          },
          footer: (activeItem, mac) =>
            CommandMenuFooter(
              {
                context: presentation(settings),
                ...(activeItem === undefined ? {} : { activeItem }),
                mac,
                inDialog: true,
              },
              h,
            ),
        },
      }),
    )
  }),
}
export const layer = SearchBlock.makeLayer<typeof implementation>(implementation).pipe(
  Layer.provide(Layer.mergeAll(CommandMenuDialogLayer, CommandMenuTabsLayer)),
)
