import {
  SelectBlock,
  SelectOption,
  hoverModeOf,
  layer as SelectLayer,
} from '@foldkit-visuals/fluid/select'
import { Effect, Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { createLazy, type Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { Settings, SettingSelection, presentation } from '../settings'
import { target } from '../motion'
import { spring } from '@foldkit-visuals/fluid/tokens'
const Config = Schema.Struct({
  id: Schema.String,
  settings: Settings,
  parentId: Schema.optionalKey(Schema.String),
})
const key = Symbol('HeadingFontPreference')
const OutMessage = defineMessageUnion({
  SelectedSetting: { selection: SettingSelection },
  RequestedBrowse: {},
  OpenChanged: { open: Schema.Boolean },
})
export const HeadingFontPreferenceBlock = Block.make('HeadingFontPreference', {
  key,
  InitArgs: Schema.Tuple([Config]),
  ChildInitContext: Config,
  Model: Schema.Struct({ font: SelectBlock.Model, weight: SelectBlock.Model }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    InformedOfSettings: { settings: Settings },
    InformedOfWeights: { weights: Schema.Array(Schema.Int) },
  }),
  OutMessage,
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof SelectBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: Settings
      readonly fontRow: (view: Html) => Html
      readonly weightRow: (view: Html) => Html
    }>(),
  },
})
const fontOptions = (settings: Settings) => [
  { value: 'sans', label: 'Inter' },
  { value: 'serif', label: 'Geist Serif' },
  ...(settings.customFont === undefined
    ? []
    : [{ value: 'custom', label: settings.customFont.family }]),
  { value: 'browse', label: 'Browse Google Fonts…' },
]
const weightNames: Readonly<Record<number, string>> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semibold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
}
const weightOptions = (weights: readonly number[]) => [
  { value: 'auto', label: 'Auto' },
  ...weights.map((weight) => ({
    value: String(weight),
    label: `${weightNames[weight] ?? 'Weight'} ${weight}`,
  })),
]
const Font = HeadingFontPreferenceBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'font',
  init: {
    contextToArgs: ({ settings, id, parentId }) => [
      {
        id: `${id}-font`,
        items: fontOptions(settings),
        value: settings.font,
        hoverMode: settings.hover,
        ...(parentId === undefined ? {} : { parentId }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: HeadingFontPreferenceBlock.makeOutMessageFold(SelectBlock, {
    OpenChanged: ({ open }) =>
      HeadingFontPreferenceBlock.makeOutMessageStep(() => OutMessage.OpenChanged({ open })),
    Selected: ({ value }) =>
      value === 'browse'
        ? HeadingFontPreferenceBlock.makeOutMessageStep(() => OutMessage.RequestedBrowse())
        : Schema.is(Settings.fields.font)(value)
          ? HeadingFontPreferenceBlock.makeOutMessageStep(() =>
              OutMessage.SelectedSetting({ selection: { _tag: 'Font', value } }),
            )
          : HeadingFontPreferenceBlock.makeNoopStep(),
  }),
})
const Weight = HeadingFontPreferenceBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'weight',
  init: {
    contextToArgs: ({ settings, id, parentId }) => [
      {
        id: `${id}-weight`,
        items: weightOptions(
          settings.customFont?.weight == null ? [] : [settings.customFont.weight],
        ),
        value: settings.customFont?.weight == null ? 'auto' : String(settings.customFont.weight),
        hoverMode: settings.hover,
        ...(parentId === undefined ? {} : { parentId }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: HeadingFontPreferenceBlock.makeOutMessageFold(SelectBlock, {
    OpenChanged: ({ open }) =>
      HeadingFontPreferenceBlock.makeOutMessageStep(() => OutMessage.OpenChanged({ open })),
    Selected: ({ value }) =>
      HeadingFontPreferenceBlock.makeOutMessageStep(() =>
        OutMessage.SelectedSetting({
          selection: { _tag: 'FontWeight', value: value === 'auto' ? null : Number(value) },
        }),
      ),
  }),
})
const HeadingFontPreferenceComposition = HeadingFontPreferenceBlock.makeComposition({
  bindings: [Font, Weight],
})
const sameItems = Schema.toEquivalence(Schema.Array(SelectOption))
const implementation = {
  init: HeadingFontPreferenceComposition.makeInit((config) => ({
    model: {},
    childInitContext: config,
  })),
  update: HeadingFontPreferenceComposition.makeUpdate({}),
  inMessageUpdate: HeadingFontPreferenceComposition.makeInMessageUpdate({
    InformedOfSettings: HeadingFontPreferenceBlock.makeStep((model, { settings }) => {
      const items = fontOptions(settings),
        value = settings.customFont?.weight == null ? 'auto' : String(settings.customFont.weight)
      return Update.combineSteps([
        ...(model.font.value === settings.font && sameItems(model.font.items, items)
          ? []
          : [Font.requestConfigure({ items, value: settings.font })]),
        ...(model.weight.value === value
          ? []
          : [
              Weight.requestConfigure({
                items: model.weight.items.some((item) => item.value === value)
                  ? model.weight.items
                  : weightOptions(
                      settings.customFont?.weight == null ? [] : [settings.customFont.weight],
                    ),
                value,
              }),
            ]),
        ...(hoverModeOf(model.font) === settings.hover
          ? []
          : [
              Font.requestHoverMode({ mode: settings.hover }),
              Weight.requestHoverMode({ mode: settings.hover }),
            ]),
      ])
    }),
    InformedOfWeights: HeadingFontPreferenceBlock.makeStep((model, { weights }) =>
      Weight.requestConfigure({ items: weightOptions(weights), value: model.weight.value }),
    ),
  }),
}

type SelectModel = typeof SelectBlock.Model.Type
type PreferenceHtml = Block.ViewBuilderFor<typeof HeadingFontPreferenceComposition>

const makeView = () => {
  const lazyFont = createLazy()
  const renderFont = (
    model: SelectModel,
    shape: Settings['shape'],
    size: Settings['size'],
    hover: Settings['hover'],
    h: PreferenceHtml,
  ) =>
    h.block(
      Font.embedView({
        slotId: 'font',
        model,
        viewInputs: {
          context: presentation({ shape, size, hover }),
          variant: 'borderless',
          className: 'min-w-0 w-auto px-2 text-site-body',
          ariaLabel: 'Heading font',
          animate: target.node,
        },
      }),
    )
  const lazyWeight = createLazy()
  const renderWeight = (
    model: SelectModel,
    shape: Settings['shape'],
    size: Settings['size'],
    hover: Settings['hover'],
    h: PreferenceHtml,
  ) =>
    h.block(
      Weight.embedView({
        slotId: 'weight',
        model,
        viewInputs: {
          context: presentation({ shape, size, hover }),
          variant: 'borderless',
          className: 'min-w-0 w-auto px-2 text-site-body',
          ariaLabel: 'Heading weight',
          animate: target.node,
        },
      }),
    )
  return HeadingFontPreferenceComposition.makeView.withInputs(
    (model, { settings, fontRow, weightRow }, h) => {
      const fontView = lazyFont(renderFont, [
        model.font,
        settings.shape,
        settings.size,
        settings.hover,
        h,
      ])
      const weightView = lazyWeight(renderWeight, [
        model.weight,
        settings.shape,
        settings.size,
        settings.hover,
        h,
      ])
      return h.div(
        [h.Class('contents')],
        [
          fontRow(fontView),
          target.node(
            h.div(
              [h.Class('grid'), h.Inert(settings.font !== 'custom')],
              [h.div([h.Class('min-h-0')], [weightRow(weightView)])],
            ),
            {
              initial: false,
              animate:
                settings.font === 'custom'
                  ? { gridTemplateRows: '1fr', opacity: 1, transitionEnd: { overflow: 'visible' } }
                  : { gridTemplateRows: '0fr', opacity: 0, overflow: 'hidden' },
              transition: settings.font === 'custom' ? spring.moderate : spring.moderate.exit,
              reducedMotion: 'user',
            },
          ),
        ],
      )
    },
  )
}
const plans = Effect.gen(function* () {
  const children = yield* HeadingFontPreferenceComposition.acquireChildren()
  return { ...implementation, children, view: makeView() }
})
export const headingFontPreferenceLayer = HeadingFontPreferenceBlock.makeLayer(plans).pipe(
  Layer.provide(SelectLayer),
)
