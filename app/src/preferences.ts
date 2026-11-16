import { HoverBlock, layer as HoverLayer } from '@foldkit-visuals/fluid/hover'
import {
  HoverHighlightBlock,
  layer as HoverHighlightLayer,
} from '@foldkit-visuals/fluid/hover-highlight'
import {
  SelectBlock,
  SelectOption,
  hoverModeOf,
  layer as SelectLayer,
} from '@foldkit-visuals/fluid/select'
import { Effect, Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { accentPresets } from './accents'
import { makeRenderPreferences } from './preferences-view'
import { Settings, SettingSelection } from './settings'
import { HeadingFontPreferenceBlock, headingFontPreferenceLayer } from './fonts/preference'
const Config = Schema.Struct({
  id: Schema.String,
  settings: Settings,
  parentId: Schema.optionalKey(Schema.String),
})
const key = Symbol('Preferences')
const Message = defineMessageUnion({ ClickedReset: {} })
const OutMessage = defineMessageUnion({
  SelectedSetting: { selection: SettingSelection },
  RequestedReset: {},
  RequestedFontBrowse: {},
})
const InMessage = defineInMessageUnion({
  InformedOfSelections: { settings: Settings },
  InformedOfFontWeights: { weights: Schema.Array(Schema.Int) },
})
export const PreferencesBlock = Block.make('Preferences', {
  key,
  InitArgs: Schema.Tuple([Config]),
  ChildInitContext: Config,
  Model: Schema.Struct({
    isMenuOpen: Schema.Boolean,
    rowHover: HoverBlock.Model,
    rowHighlight: HoverHighlightBlock.Model,
    theme: SelectBlock.Model,
    accent: SelectBlock.Model,
    font: HeadingFontPreferenceBlock.Model,
    shape: SelectBlock.Model,
    size: SelectBlock.Model,
    hover: SelectBlock.Model,
  }),
  Message,
  InMessage,
  OutMessage,
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof SelectBlock>['programRequirements']
  >(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<{ readonly settings: Settings }>() },
})
const RowHighlight = PreferencesBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'rowHighlight',
  init: {
    contextToArgs: ({ id, settings }) => [{ id: `${id}-row-highlight`, mode: settings.hover }],
  },
})
const RowHover = PreferencesBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'rowHover',
  init: { contextToArgs: ({ id, settings }) => [{ id: `${id}-rows`, mode: settings.hover }] },
}).withOutMessagePolicy({
  fold: PreferencesBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      PreferencesBlock.makeStep((model) =>
        RowHighlight.informOfSource({
          snapshot,
          hidden: model.isMenuOpen,
          mode: model.rowHover.mode,
        }),
      ),
  }),
})
const menuChanged = ({ open }: { readonly open: boolean }) =>
  Update.combineSteps([
    PreferencesBlock.makeFieldsStep(() => ({ isMenuOpen: () => open })),
    // Closing waits for a fresh move; portalled menus never steer the settings highlight.
    RowHover.requestClear(),
    RowHighlight.requestHide(),
    RowHover.requestPointerHandlers({ enabled: !open }),
  ])
const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
const Theme = PreferencesBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'theme',
  init: {
    contextToArgs: ({ settings, id, parentId }) => [
      {
        hoverMode: settings.hover,
        id: `${id}-theme`,
        items: themeOptions,
        value: settings.theme,
        ...(parentId === undefined ? {} : { parentId }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: PreferencesBlock.makeOutMessageFold(SelectBlock, {
    OpenChanged: menuChanged,
    Selected: ({ value }) =>
      Schema.is(Settings.fields.theme)(value)
        ? PreferencesBlock.makeOutMessageStep(() =>
            OutMessage.SelectedSetting({ selection: { _tag: 'Theme', value } }),
          )
        : PreferencesBlock.makeNoopStep(),
  }),
})
const accentOptions = accentPresets.map(({ value, label }) => ({ value, label }))
const Accent = PreferencesBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'accent',
  init: {
    contextToArgs: ({ settings, id, parentId }) => [
      {
        hoverMode: settings.hover,
        id: `${id}-accent`,
        items: accentsFor(settings),
        value: accentValue(settings),
        ...(parentId === undefined ? {} : { parentId }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: PreferencesBlock.makeOutMessageFold(SelectBlock, {
    OpenChanged: menuChanged,
    Selected: ({ value }) =>
      Schema.is(Settings.fields.accent)(value)
        ? PreferencesBlock.makeOutMessageStep(() =>
            OutMessage.SelectedSetting({ selection: { _tag: 'Accent', value } }),
          )
        : PreferencesBlock.makeNoopStep(),
  }),
})
const accentsFor = (settings: Settings) =>
  settings.accent.startsWith('#')
    ? [...accentOptions, { value: 'custom', label: 'Custom' }]
    : accentOptions
export const accentValue = (settings: Settings) =>
  settings.accent.startsWith('#') ? 'custom' : settings.accent
const Font = PreferencesBlock.makeRequiredFieldBinding(HeadingFontPreferenceBlock, {
  field: 'font',
  init: { contextToArgs: (config) => [config] },
}).withOutMessagePolicy({
  fold: PreferencesBlock.makeOutMessageFold(HeadingFontPreferenceBlock, {
    OpenChanged: menuChanged,
    RequestedBrowse: () =>
      PreferencesBlock.makeOutMessageStep(() => OutMessage.RequestedFontBrowse()),
    SelectedSetting: ({ selection }) =>
      PreferencesBlock.makeOutMessageStep(() => OutMessage.SelectedSetting({ selection })),
  }),
})
const shapeOptions = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'pill', label: 'Pill' },
]
const Shape = PreferencesBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'shape',
  init: {
    contextToArgs: ({ settings, id, parentId }) => [
      {
        hoverMode: settings.hover,
        id: `${id}-shape`,
        items: shapeOptions,
        value: settings.shape,
        ...(parentId === undefined ? {} : { parentId }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: PreferencesBlock.makeOutMessageFold(SelectBlock, {
    OpenChanged: menuChanged,
    Selected: ({ value }) =>
      Schema.is(Settings.fields.shape)(value)
        ? PreferencesBlock.makeOutMessageStep(() =>
            OutMessage.SelectedSetting({ selection: { _tag: 'Shape', value } }),
          )
        : PreferencesBlock.makeNoopStep(),
  }),
})
const sizeOptions = [
  { value: 'default', label: 'Default' },
  { value: 'compact', label: 'Compact' },
]
const Size = PreferencesBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'size',
  init: {
    contextToArgs: ({ settings, id, parentId }) => [
      {
        hoverMode: settings.hover,
        id: `${id}-size`,
        items: sizeOptions,
        value: settings.size,
        ...(parentId === undefined ? {} : { parentId }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: PreferencesBlock.makeOutMessageFold(SelectBlock, {
    OpenChanged: menuChanged,
    Selected: ({ value }) =>
      Schema.is(Settings.fields.size)(value)
        ? PreferencesBlock.makeOutMessageStep(() =>
            OutMessage.SelectedSetting({ selection: { _tag: 'Size', value } }),
          )
        : PreferencesBlock.makeNoopStep(),
  }),
})
const hoverOptions = [
  { value: 'fluid', label: 'Fluid' },
  { value: 'standard', label: 'Standard' },
]
const Hover = PreferencesBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'hover',
  init: {
    contextToArgs: ({ settings, id, parentId }) => [
      {
        hoverMode: settings.hover,
        id: `${id}-hover`,
        items: hoverOptions,
        value: settings.hover,
        ...(parentId === undefined ? {} : { parentId }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: PreferencesBlock.makeOutMessageFold(SelectBlock, {
    OpenChanged: menuChanged,
    Selected: ({ value }) =>
      Schema.is(Settings.fields.hover)(value)
        ? PreferencesBlock.makeOutMessageStep(() =>
            OutMessage.SelectedSetting({ selection: { _tag: 'Hover', value } }),
          )
        : PreferencesBlock.makeNoopStep(),
  }),
})
const PreferencesComposition = PreferencesBlock.makeComposition({
  bindings: [Theme, Accent, Font, Shape, Size, Hover, RowHover, RowHighlight],
})
const implementation = {
  init: PreferencesComposition.makeInit((config) => ({
    model: { isMenuOpen: false },
    childInitContext: config,
  })),
  update: PreferencesComposition.makeUpdate({
    ClickedReset: PreferencesBlock.makeOutMessageStep(() => OutMessage.RequestedReset()),
  }),
  inMessageUpdate: PreferencesComposition.makeInMessageUpdate({
    InformedOfFontWeights: PreferencesBlock.makeStep.fromMessage(({ weights }) =>
      Font.informOfWeights({ weights }),
    ),
    InformedOfSelections: PreferencesBlock.makeStep((model, { settings }) => {
      const sameItems = Schema.toEquivalence(Schema.Array(SelectOption))
      const configured = (
        select: typeof SelectBlock.Model.Type,
        items: ReadonlyArray<SelectOption>,
        value: string,
      ) => select.controlled && select.value === value && sameItems(select.items, items)
      return Update.combineSteps([
        ...(configured(model.theme, themeOptions, settings.theme)
          ? []
          : [Theme.requestConfigure({ items: themeOptions, value: settings.theme })]),
        ...(configured(model.accent, accentsFor(settings), accentValue(settings))
          ? []
          : [
              Accent.requestConfigure({
                items: accentsFor(settings),
                value: accentValue(settings),
              }),
            ]),
        Font.informOfSettings({ settings }),
        ...(configured(model.shape, shapeOptions, settings.shape)
          ? []
          : [Shape.requestConfigure({ items: shapeOptions, value: settings.shape })]),
        ...(configured(model.size, sizeOptions, settings.size)
          ? []
          : [Size.requestConfigure({ items: sizeOptions, value: settings.size })]),
        ...(configured(model.hover, hoverOptions, settings.hover)
          ? []
          : [Hover.requestConfigure({ items: hoverOptions, value: settings.hover })]),
        ...(hoverModeOf(model.theme) === settings.hover
          ? []
          : [Theme.requestHoverMode({ mode: settings.hover })]),
        ...(hoverModeOf(model.accent) === settings.hover
          ? []
          : [Accent.requestHoverMode({ mode: settings.hover })]),
        ...(hoverModeOf(model.shape) === settings.hover
          ? []
          : [Shape.requestHoverMode({ mode: settings.hover })]),
        ...(hoverModeOf(model.size) === settings.hover
          ? []
          : [Size.requestHoverMode({ mode: settings.hover })]),
        ...(hoverModeOf(model.hover) === settings.hover
          ? []
          : [Hover.requestHoverMode({ mode: settings.hover })]),
        ...(model.rowHover.mode === settings.hover
          ? []
          : [
              RowHover.requestConfigure({
                options: {
                  ...model.rowHover.options,
                  maxDistance: model.rowHover.options.maxDistance ?? Infinity,
                  mode: settings.hover,
                },
              }),
            ]),
      ])
    }),
  }),
}
export type PreferencesHtml = Block.ViewBuilderFor<typeof PreferencesComposition>
export const preferencesViewBindings = {
  Theme,
  Accent,
  Font,
  Shape,
  Size,
  Hover,
  RowHover,
  RowHighlight,
  reset: Message.ClickedReset,
}
const makeView = () => {
  const render = makeRenderPreferences(preferencesViewBindings)
  return PreferencesComposition.makeView.withInputs(render)
}
const plans = Effect.gen(function* () {
  const children = yield* PreferencesComposition.acquireChildren()
  return { ...implementation, children, view: makeView() }
})
export const layer = PreferencesBlock.makeLayer(plans).pipe(
  Layer.provide(
    Layer.mergeAll(SelectLayer, HoverLayer, HoverHighlightLayer, headingFontPreferenceLayer),
  ),
)
