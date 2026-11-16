import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
import { displayColorNumber } from './color-number-locale.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Effect, Option, Schema, Predicate } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import * as Render from 'foldkit/render'
import { SliderBlock, sliderSettings } from './slider.js'
import { SliderSettings, sliderTargets } from './slider-state.js'
import { HoverBlock, type HoverConfig } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'
import { colorTooltipEntries } from './color-picker-tooltips.js'
import { DocumentTooltipBlock } from './tooltip-native/document.js'
import type { TooltipDom } from './tooltip-native/resources.js'
import { ColorFormatMenuBlock } from './color-picker-format-menu.js'
import type { ColorFormatMenuConfig } from './color-picker-format-menu.js'
import type { ColorPickerProps } from './color-picker-parts.js'
import { ColorPickerEnvironment } from './color-picker-environment.js'
import { colorObservationFields } from './color-picker-observation.js'
import { observeColorPicker } from './color-picker-observer.js'
import {
  ColorState,
  ColorPickerConfigSchema,
  ColorSettings,
  ColorFormat,
  Parsed,
  Channel,
  colorInitial,
  currentFormat,
  colorEmit,
  colorChannel,
  colorWhole,
  channelSpecs,
  boundChannel,
} from './color-picker-state.js'
import type { ColorPickerConfig } from './color-picker-state.js'
import { railConfig } from './color-picker-rails.js'

const Event = Schema.Union([
  Schema.Struct({ type: Schema.Literal('value'), value: Schema.String, parsed: Parsed }),
  Schema.Struct({ type: Schema.Literal('format'), format: ColorFormat }),
])

const modelFields = {
  color: ColorState,
  tooltips: DocumentTooltipBlock.Model,
  hue: SliderBlock.Model,
  alpha: SliderBlock.Model,
  swatches: HoverBlock.Model,
  swatchHighlight: HoverHighlightBlock.Model,
  menu: ColorFormatMenuBlock.Model,
}

export type ColorPickerModelFields = typeof modelFields

const Model: Schema.Struct<ColorPickerModelFields> = Schema.Struct(modelFields)

type Model = typeof Model.Type

const Message = defineMessageUnion({
  ...colorObservationFields,
  Whole: { value: Schema.String },
  ResolvedWhole: {
    color: Schema.OptionFromNullOr(
      Schema.Struct({ r: Schema.Finite, g: Schema.Finite, b: Schema.Finite, a: Schema.Finite }),
    ),
  },
  Format: { format: ColorFormat },
  Screen: {},
  ScreenPicked: { value: Schema.OptionFromNullOr(Schema.String) },
  ResolvedSwatches: { swatches: Schema.Record(Schema.String, Schema.String) },
  CompletedField: {},
  Unmounted: {},
})

const OutMessage = defineMessageUnion({ Events: { events: Schema.Array(Event) } })

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedConfigure: { settings: ColorSettings },
  RequestedColor: { value: Schema.String },
  RequestedFormat: { format: ColorFormat },
})

export const ColorPickerKey = Symbol('ColorPicker')

const effects = Block.makeEffectsContract<never, ColorPickerEnvironment | TooltipDom>()

const ColorPickerNamespace = Block.makeNamespace('ColorPicker')

const Observe = ColorPickerNamespace.makeMountStream('Observe', {
  messages: [
    Message.Mounted,
    Message.SquarePointer,
    Message.SquareHover,
    Message.SquareFocus,
    Message.SquareKey,
    Message.FieldFocus,
    Message.FieldDraft,
    Message.FieldBlur,
    Message.FieldAutofill,
    Message.FieldKey,
    Message.FieldWheel,
    Message.ScrubDown,
    Message.ScrubMove,
    Message.ScrubUp,
    Message.ScrubLock,
    Message.Pressed,
  ],
  *handler() {
    const environment = yield* ColorPickerEnvironment

    return ({ element, viewStateChanges }) =>
      observeColorPicker(element, viewStateChanges, environment.numbers)
  },
})

const ResolveWhole = ColorPickerNamespace.makeCommand('ResolveWhole', {
  args: { value: Schema.String },
  messages: [Message.ResolvedWhole],
  *handler() {
    const environment = yield* ColorPickerEnvironment

    return ({ value }) =>
      Effect.sync(() =>
        Message.ResolvedWhole({ color: Option.fromNullishOr(environment.resolveColor(value)) }),
      )
  },
})

const ResolveSwatches = ColorPickerNamespace.makeCommand('ResolveSwatches', {
  args: { swatches: Schema.Array(Schema.String) },
  messages: [Message.ResolvedSwatches],
  *handler() {
    const environment = yield* ColorPickerEnvironment

    return ({ swatches }) =>
      Effect.sync(() => {
        const resolved: Record<string, string> = {}

        for (const value of swatches) {
          const color = environment.resolveColor(value)

          if (color) {
            resolved[value] = colorWhole(colorInitial({ id: '' }), color).parsed.hex.toLowerCase()
          }
        }

        return Message.ResolvedSwatches({ swatches: resolved })
      })
  },
})

const Pick = ColorPickerNamespace.makeCommand('Pick', {
  messages: [Message.ScreenPicked],
  *handler() {
    const environment = yield* ColorPickerEnvironment

    return () =>
      environment
        .pickScreen()
        .pipe(Effect.map((value) => Message.ScreenPicked({ value: Option.fromNullishOr(value) })))
  },
})

const Field = ColorPickerNamespace.makeCommand('Field', {
  args: {
    id: Schema.String,
    channel: Channel,
    operation: Schema.Literals(['focus', 'blur', 'unlock']),
  },
  messages: [Message.CompletedField],
  *handler() {
    const environment = yield* ColorPickerEnvironment

    return ({ id, channel, operation }) =>
      (operation === 'unlock' &&
      (environment.document?.defaultView?.navigator.userAgent ?? '').includes('Firefox')
        ? Effect.sleep('20 millis')
        : Effect.void
      ).pipe(
        Effect.andThen(Render.afterCommit),
        Effect.andThen(
          Effect.sync(() => {
            const root = environment.document?.getElementById(id)
            const wrapper = root?.querySelector<HTMLElement>(`[data-color-channel="${channel}"]`)
            const input = wrapper?.querySelector('input')

            if (operation === 'focus') {
              input?.focus()
              input?.select()
            } else if (operation === 'blur') {
              input?.blur()
            } else if (operation === 'unlock' && environment.document?.pointerLockElement) {
              environment.document.exitPointerLock()
            }

            return Message.CompletedField()
          }),
        ),
      )
  },
})

const CursorPortal = ColorPickerNamespace.makeMount('CursorPortal', {
  messages: [Message.CompletedField],
  *handler() {
    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const parent = element.parentNode
          const sibling = element.nextSibling
          element.ownerDocument.body.append(element)

          return () => {
            if (parent) {
              if (sibling?.parentNode === parent) {
                sibling.before(element)
              } else {
                parent.append(element)
              }
            }
          }
        }),
        (dispose) => Effect.sync(dispose),
      ).pipe(Effect.as(Message.CompletedField()))
  },
})

export const ColorPickerBlock = Block.make(ColorPickerNamespace, {
  key: ColorPickerKey,
  InitArgs: Schema.Tuple([ColorPickerConfigSchema]),
  Model,
  Message,
  InMessage,
  OutMessage,
  inMessageOutputs: { RequestedFormat: { outMessage: OutMessage.Events } },
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<ColorPickerProps>(),
    mounts: [Observe, CursorPortal],
  },
  effects,
})

const valueEvents = (result: ReturnType<typeof colorEmit>) =>
  [{ type: 'value', value: result.value, parsed: result.parsed }] satisfies ReadonlyArray<
    typeof Event.Type
  >

const HueInitial = ColorPickerBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'hue',
  init: {
    contextToArgs: (config: ColorPickerConfig) => [
      { id: `${config.id}-hue`, ...railConfig(colorInitial(config), 'hue') },
    ],
  },
})

const AlphaInitial = ColorPickerBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'alpha',
  init: {
    contextToArgs: (config: ColorPickerConfig) => [
      { id: `${config.id}-alpha`, ...railConfig(colorInitial(config), 'alpha') },
    ],
  },
})

const railSettingsEqual = Schema.toEquivalence(SliderSettings)
const railSettingsSatisfied = (
  model: typeof SliderBlock.Model.Type,
  settings: typeof SliderSettings.Type,
) =>
  railSettingsEqual(model.settings, settings) &&
  // A released drag may still need its controlled targets acknowledged.
  (model.drag !== 'idle' || sliderTargets(model) === model)

const syncRails = (state: ColorState) =>
  ColorPickerBlock.makeStep((model) => {
    const hue = sliderSettings({ id: `${state.id}-hue`, ...railConfig(state, 'hue') })
    const alpha = sliderSettings({ id: `${state.id}-alpha`, ...railConfig(state, 'alpha') })
    return Update.combineSteps([
      ...(railSettingsSatisfied(model.hue, hue)
        ? []
        : [HueInitial.requestSettings({ settings: hue })]),
      ...(railSettingsSatisfied(model.alpha, alpha)
        ? []
        : [AlphaInitial.requestSettings({ settings: alpha })]),
    ])
  })

const emit = (
  result: ReturnType<typeof colorEmit>,
  events: ReadonlyArray<typeof Event.Type> = valueEvents(result),
  commands: ReadonlyArray<ReturnType<typeof Field>> = [],
) =>
  ColorPickerBlock.makeStep(() => {
    const combined = Update.combineSteps([
      ColorPickerBlock.makeFieldsStep(() => ({ color: () => result.state })),
      syncRails(result.state),
      ColorPickerBlock.makeCommandsStep(() => commands),
    ])

    return (current: Parameters<typeof combined>[0]) =>
      Update.withOutMessage(combined(current), OutMessage.Events({ events }))
  })

const Hue = HueInitial.withOutMessagePolicy({
  fold: ColorPickerBlock.makeOutMessageFold(SliderBlock, {
    Changed: ({ value }) =>
      ColorPickerBlock.makeStep((model) =>
        emit(
          colorEmit(
            modifyFields(model.color, { oklchHue: () => Option.none() }),
            modifyFields(model.color.hsv, {
              h: () => (Predicate.isNumber(value) ? value : value[0]),
            }),
          ),
        ),
      ),
  }),
})

const Alpha = AlphaInitial.withOutMessagePolicy({
  fold: ColorPickerBlock.makeOutMessageFold(SliderBlock, {
    Changed: ({ value }) =>
      ColorPickerBlock.makeStep((model) =>
        emit(
          colorEmit(
            model.color,
            modifyFields(model.color.hsv, {
              a: () => (Predicate.isNumber(value) ? value : value[0]) / 100,
            }),
          ),
        ),
      ),
  }),
})

const SwatchHighlight = ColorPickerBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'swatchHighlight',
  init: {
    contextToArgs: (config: ColorPickerConfig) => [
      {
        id: `${config.id}-swatch-highlight`,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
})

const Swatches = ColorPickerBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'swatches',
  init: {
    contextToArgs: (config: ColorPickerConfig): [HoverConfig] => [
      {
        id: `${config.id}-swatches`,
        axis: 'xy',
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: ColorPickerBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      ColorPickerBlock.makeStep((model) =>
        SwatchHighlight.informOfSource({ snapshot, hidden: false, mode: model.swatches.mode }),
      ),
  }),
})

const MenuInitial = ColorPickerBlock.makeRequiredFieldBinding(ColorFormatMenuBlock, {
  field: 'menu',
  init: {
    contextToArgs: (config: ColorPickerConfig): [ColorFormatMenuConfig] => {
      const menu: ColorFormatMenuConfig = {
        id: `${config.id}-menu`,
        ...(config.hoverMode === undefined ? {} : { hoverMode: config.hoverMode }),
        format: currentFormat(colorInitial(config)),
      }

      const configured =
        config.formatOpen === undefined ? menu : { ...menu, open: config.formatOpen }

      return [
        config.defaultFormatOpen === undefined
          ? configured
          : { ...configured, defaultOpen: config.defaultFormatOpen },
      ]
    },
  },
})

const SelectMenu = ColorPickerBlock.makeCommand('SelectMenu', {
  args: { format: ColorFormat },
  messages: [Message.Format],
  *handler() {
    return ({ format }) => Effect.succeed(Message.Format({ format }))
  },
})

const Menu = MenuInitial.withOutMessagePolicy({
  fold: ColorPickerBlock.makeOutMessageFold(ColorFormatMenuBlock, {
    Selected: ({ format }) => ColorPickerBlock.makeCommandsStep(() => [SelectMenu({ format })]),
  }),
})

const selectFormat = (model: Model, format: ColorFormat) => {
  const state = modifyFields(model.color, {
    internalFormat: () =>
      Option.isNone(model.color.settings.format) ? format : model.color.internalFormat,
  })

  const result = colorEmit(state, state.hsv, format)

  return ColorPickerBlock.makeStep(() => {
    const combined = Update.combineSteps([
      ColorPickerBlock.makeFieldsStep(() => ({ color: () => result.state })),
      HueInitial.requestSettings({
        settings: sliderSettings({ id: `${state.id}-hue`, ...railConfig(state, 'hue') }),
      }),
      AlphaInitial.requestSettings({
        settings: sliderSettings({ id: `${state.id}-alpha`, ...railConfig(state, 'alpha') }),
      }),
      MenuInitial.requestSettings({
        settings: { format: currentFormat(state), open: state.settings.formatOpen },
      }),
      Menu.requestDismiss({ restore: true }),
    ])

    return (current: Parameters<typeof combined>[0]) =>
      Update.withOutMessage(
        combined(current),
        OutMessage.Events({ events: [{ type: 'format', format }, ...valueEvents(result)] }),
      )
  })
}

const Tooltips = ColorPickerBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
}).withOutMessagePolicy({
  fold: ColorPickerBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: () => ColorPickerBlock.makeNoopStep(),
  }),
})

const reconcileTooltips = () =>
  ColorPickerBlock.makeStep((model) => {
    const entries = colorTooltipEntries(model.color)
    const keys = new Set(entries.map(({ key }) => key))
    return Update.combineSteps([
      ...Object.keys(model.tooltips.rows)
        .filter((key) => !keys.has(key))
        .map((key) => Tooltips.requestRemove({ key })),
      ...entries
        .filter(({ key }) => model.tooltips.rows[key] === undefined)
        .map((entry) => Tooltips.requestAdd(entry)),
    ])
  })

const ColorPickerComposition = ColorPickerBlock.makeComposition({
  mounts: [Observe, CursorPortal],
  bindings: [Hue, Alpha, Swatches, SwatchHighlight, Menu, Tooltips],
})

export type ColorPickerViewBuilder = Block.ViewBuilderFor<typeof ColorPickerComposition>

const init = ColorPickerComposition.makeInit((config: ColorPickerConfig) => ({
  model: { color: colorInitial(config) },
  childInitContext: config,
  steps: [reconcileTooltips()],
}))

const commitChannel = (model: Model, channel: typeof Channel.Type, raw: string) => {
  if (channel === 'hex') {
    return { model, commands: [ResolveWhole({ value: raw.startsWith('#') ? raw : `#${raw}` })] }
  }

  const spec = channelSpecs(model.color).find((candidate) => candidate.channel === channel)
  // eslint-disable-next-line unicorn/prefer-number-coercion -- Source accepts numeric prefixes and blank drafts stay invalid; Number changes committed values.
  const value = Number.parseFloat(raw.replace('%', ''))

  if (!spec || !Number.isFinite(value)) {
    return { model }
  }

  const bounded = boundChannel(value, spec)

  // eslint-disable-next-line unicorn/prefer-number-coercion -- The channel display may contain a percent suffix; Number would reject the displayed value.
  if (bounded === Number.parseFloat(spec.value)) {
    return { model }
  }

  const result = colorChannel(model.color, channel, bounded)

  const display =
    channelSpecs(result.state).find((item) => item.channel === channel)?.value ?? spec.value

  return emit({
    ...result,
    state: {
      ...result.state,
      drafts: {
        ...result.state.drafts,
        [channel]: displayColorNumber(display, spec.percent, model.color.numberDisplay),
      },
    },
  })
}

export {
  Model,
  Message,
  SelectMenu,
  Tooltips,
  reconcileTooltips,
  CursorPortal,
  Observe,
  ResolveWhole,
  ResolveSwatches,
  Pick,
  Field,
  Hue,
  Alpha,
  Swatches,
  SwatchHighlight,
  Menu,
  ColorPickerComposition,
  init,
  commitChannel,
  emit,
  selectFormat,
  valueEvents,
}
