import { CommandMenuFooter } from '@foldkit-visuals/fluid/command-menu'
import {
  CommandMenuDialogBlock,
  CommandMenuDialogLayer,
} from '@foldkit-visuals/fluid/command-menu-dialog'
import {
  CommandMenuTabsBlock,
  CommandMenuTabsLayer,
} from '@foldkit-visuals/fluid/command-menu-tabs'
import { Effect, Layer, Option, Schema } from 'effect'
import { AsyncData, Block, Update } from 'foldkit'
import { Query } from 'foldkit/experimental'
import { FontCatalogueQuery } from './query'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { Settings, presentation } from '../settings'
import { motion } from '../motion'
import { GoogleFont, categories, matchingFonts, previewStylesheet } from './catalogue'
const Message = defineMessageUnion({
  CompletedPreview: { revision: Schema.Natural, href: Schema.String },
  ClickedRetry: {},
})
const OutMessage = defineMessageUnion({ Selected: { font: GoogleFont } })
const key = Symbol('GoogleFontPicker')
export const GoogleFontPickerBlock = Block.make('GoogleFontPicker', {
  key,
  InitArgs: Schema.Tuple([Settings]),
  ChildInitContext: Settings,
  Model: Schema.Struct({
    palette: CommandMenuDialogBlock.Model,
    tabs: CommandMenuTabsBlock.Model,
    catalogue: FontCatalogueQuery.Model,
    previewRevision: Schema.Natural,
    previewHref: Schema.OptionFromNullOr(Schema.String),
    query: Schema.String,
    category: Schema.String,
    current: Schema.NullOr(Schema.String),
    returnFocusId: Schema.String,
  }),
  Message,
  OutMessage,
  inMessageOutputs: { RequestedOpen: { outMessage: OutMessage } },
  InMessage: defineInMessageUnion({
    RequestedOpen: { current: Schema.NullOr(Schema.String), returnFocusId: Schema.String },
    InformedOfHoverMode: { mode: Settings.fields.hover },
  }),
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
const WaitForPreview = GoogleFontPickerBlock.makeCommand('WaitForPreview', {
  args: { revision: Schema.Natural, href: Schema.String, delay: Schema.Number },
  messages: [Message.CompletedPreview],
  *handler() {
    return ({ revision, href, delay }) =>
      Effect.sleep(delay).pipe(Effect.as(Message.CompletedPreview({ revision, href })))
  },
})
const catalogueData = (model: typeof GoogleFontPickerBlock.Model.Type) =>
  AsyncData.getData(FontCatalogueQuery.read(model.catalogue))
const rows = (model: typeof GoogleFontPickerBlock.Model.Type) =>
  Option.match(catalogueData(model), {
    onNone: () => [],
    onSome: (catalogue) =>
      matchingFonts(catalogue.fonts, model.query, model.category, model.current),
  })
const returnFocusSelector = (id: string) => {
  switch (id) {
    case 'site-desktop-search':
      return '#site-navigation nav[aria-label="Search"] button'
    case 'site-mobile-search':
      return '#navigation-dialog nav[aria-label="Search"] button'
    case 'site-menu-button':
      return '#site-menu-button'
    default:
      return '[data-font-picker-return="true"] button[aria-label="Heading font"]'
  }
}
const refresh = GoogleFontPickerBlock.makeStep((model) => {
  const fonts = rows(model),
    revision = model.previewRevision + 1
  return Update.combineSteps([
    PaletteRequests.requestConfigure({
      items: fonts.map((font) => ({ value: font.name, label: font.name })),
      query: Option.some(model.query),
    }),
    GoogleFontPickerBlock.makeFieldsStep(() => ({ previewRevision: () => revision })),
    ...(fonts.length
      ? [
          GoogleFontPickerBlock.makeCommandsStep(() => [
            WaitForPreview({
              revision,
              href: previewStylesheet(fonts),
              delay: model.query.trim() ? 200 : 0,
            }),
          ]),
        ]
      : []),
  ])
})
const CatalogueBinding = GoogleFontPickerBlock.makeRequiredFieldBinding(FontCatalogueQuery, {
  field: 'catalogue',
}).withOutMessagePolicy({
  fold: GoogleFontPickerBlock.makeOutMessageFold(FontCatalogueQuery, {
    CompletedFetch: () => refresh,
  }),
})
const PaletteRequests = GoogleFontPickerBlock.makeRequiredFieldBinding(CommandMenuDialogBlock, {
  field: 'palette',
  init: {
    contextToArgs: (settings) => [
      {
        id: 'google-font-picker',
        virtualized: true,
        items: [],
        shortcut: null,
        hoverMode: settings.hover,
        returnFocusSelector: '[data-font-picker-return="true"] button[aria-label="Heading font"]',
      },
    ],
  },
})
const Palette = PaletteRequests.withOutMessagePolicy({
  fold: GoogleFontPickerBlock.makeOutMessageFold(CommandMenuDialogBlock, {
    QueryChanged: ({ query }) =>
      Update.combineSteps([
        GoogleFontPickerBlock.makeFieldsStep(() => ({ query: () => query })),
        refresh,
      ]),
    Selected: ({ item }) =>
      GoogleFontPickerBlock.makeStep((model) => {
        const font = rows(model).find((font) => font.name === item.value)
        return font === undefined
          ? { model }
          : Update.withOutMessage({ model }, OutMessage.Selected({ font }))
      }),
    OpenChanged: ({ open }) =>
      open
        ? GoogleFontPickerBlock.makeNoopStep()
        : Update.combineSteps([
            GoogleFontPickerBlock.makeFieldsStep(() => ({
              query: () => '',
              category: () => 'all',
              previewRevision: (revision) => revision + 1,
            })),
            GoogleFontPickerBlock.makeStep((model) =>
              AsyncData.isPending(FontCatalogueQuery.read(model.catalogue))
                ? CatalogueBinding.requestReset()
                : { model },
            ),
          ]),
  }),
})
const TabsRequests = GoogleFontPickerBlock.makeRequiredFieldBinding(CommandMenuTabsBlock, {
  field: 'tabs',
  init: {
    contextToArgs: (settings) => [
      {
        id: 'google-font-categories',
        inputId: 'google-font-picker-input',
        tabs: categories,
        value: 'all',
        hoverMode: settings.hover,
      },
    ],
  },
})
const Tabs = TabsRequests.withOutMessagePolicy({
  fold: GoogleFontPickerBlock.makeOutMessageFold(CommandMenuTabsBlock, {
    ValueChanged: ({ value }) =>
      Update.combineSteps([
        GoogleFontPickerBlock.makeFieldsStep(() => ({ category: () => value })),
        TabsRequests.requestConfigureValue({ value }),
        refresh,
      ]),
  }),
})
const GoogleFontPickerComposition = GoogleFontPickerBlock.makeComposition({
  bindings: [Palette, Tabs, CatalogueBinding],
})
export const googleFontPickerLayer = GoogleFontPickerBlock.makeLayer({
  init: GoogleFontPickerComposition.makeInit((settings) => ({
    model: {
      previewRevision: 0,
      previewHref: Option.none(),
      query: '',
      category: 'all',
      current: null,
      returnFocusId: 'customize-desktop-font-select-trigger',
    },
    childInitContext: settings,
  })),
  update: GoogleFontPickerComposition.makeUpdate({
    CompletedPreview: GoogleFontPickerBlock.makeFieldsStep((model, { revision, href }) =>
      revision === model.previewRevision ? { previewHref: () => Option.some(href) } : {},
    ),
    ClickedRetry: CatalogueBinding.requestRevalidationOrLoad(),
  }),
  inMessageUpdate: GoogleFontPickerComposition.makeInMessageUpdate.compose(
    GoogleFontPickerComposition.makeInMessageUpdate.on(['RequestedOpen'])(
      GoogleFontPickerBlock.makeStep((model, { current, returnFocusId }) =>
        Update.combineSteps([
          GoogleFontPickerBlock.makeFieldsStep(() => ({
            current: () => current,
            returnFocusId: () => returnFocusId,
          })),
          PaletteRequests.requestReturnFocus({
            selector: Option.some(returnFocusSelector(returnFocusId)),
          }),
          Tabs.requestConfigureValue({ value: 'all' }),
          CatalogueBinding.requestLoadIfMissing(),
          refresh,
        ]),
      ),
    ),
    GoogleFontPickerComposition.makeInMessageUpdate.on(['InformedOfHoverMode'])(
      GoogleFontPickerBlock.makeStep.fromMessage(({ mode }) => Tabs.requestHoverMode({ mode })),
    ),
    GoogleFontPickerComposition.makeInMessageUpdate({
      RequestedOpen: Palette.requestOpen(),
      InformedOfHoverMode: GoogleFontPickerBlock.makeStep.fromMessage(({ mode }) =>
        Palette.requestHoverMode({ mode }),
      ),
    }),
  ),
  view: GoogleFontPickerComposition.makeView.withInputs((model, { settings }, h) => {
    const catalogue = Option.getOrUndefined(catalogueData(model))
    const failed = Option.isSome(AsyncData.getError(FontCatalogueQuery.read(model.catalogue)))
    return h.div(
      [h.Class('contents')],
      [
        ...Option.toArray(model.previewHref).map((href) =>
          h.link([h.Rel('stylesheet'), h.Href(href)]),
        ),
        h.block(
          Palette.embedView({
            slotId: 'google-font-picker',
            model: model.palette,
            viewInputs: {
              context: presentation(settings),
              animate: motion.node,
              title: 'Google Fonts',
              description: "Pick a family for the site's headings.",
              placeholder:
                catalogue !== undefined
                  ? `Search ${catalogue.fonts.length.toLocaleString('en-US')} Google Fonts…`
                  : failed
                    ? "Google Fonts didn't load"
                    : 'Loading Google Fonts…',
              emptyText:
                catalogue !== undefined
                  ? 'No family matches.'
                  : failed
                    ? 'The font list did not load. Close and reopen to try again.'
                    : 'Loading…',
              header: () =>
                h.block(
                  Tabs.embedView({
                    slotId: 'font-categories',
                    model: model.tabs,
                    viewInputs: { context: presentation(settings), animate: motion.node },
                  }),
                ),
              renderItemContent: (item) => [
                h.span(
                  [
                    h.Class('min-w-0 flex-1 truncate py-1 -my-1'),
                    h.Style({ fontFamily: `"${item.value}", var(--font-sans)` }),
                  ],
                  [item.label],
                ),
              ],
              footer: failed
                ? h.button(
                    [h.Type('button'), h.OnClick(Message.ClickedRetry())],
                    ['Retry font list'],
                  )
                : (activeItem, mac) =>
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
        ),
      ],
    )
  }),
  EffectsLayer: WaitForPreview.layer,
}).pipe(Layer.provide(Layer.mergeAll(Query.layer, CommandMenuDialogLayer, CommandMenuTabsLayer)))

export const test = { Categories: Tabs, Catalogue: CatalogueBinding, Palette }
