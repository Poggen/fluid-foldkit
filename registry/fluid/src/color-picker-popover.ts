import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { Option, Schema, Layer } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  ColorPickerBlock,
  ColorPickerConfigSchema,
  layer as pickerLayer,
  colorSettings,
} from './color-picker.js'
import type { ColorPickerProps, ColorPickerConfig } from './color-picker.js'
import { ColorPopupBlock, layer as popupLayer } from './color-picker-popup.js'
import type { ColorPopupConfig, ColorPopupProps } from './color-picker-popup.js'
import { ColorSettings } from './color-picker-state.js'
import type { ColorPickerEnvironment } from './color-picker-environment.js'
import type { TooltipDom } from './tooltip-native/resources.js'
import { parseColor, rgbToHexStr } from './color-picker-math.js'
import { ColorTile } from './color-picker-parts.js'
import { resolvePresentation, createPresentationContext } from './presentation.js'
import { surfaceClasses } from './lib/surface-classes.js'
import { nestedRadius } from './lib/shape.js'
import { cn } from './lib/utils.js'
import { HoverBlock, layer as hoverLayer, hoverItemAttributes } from './hover.js'
import { HoverHighlightBlock, layer as highlightLayer } from './hover-highlight.js'

export interface ColorPickerPopoverConfig extends ColorPickerConfig {
  readonly open?: boolean
  readonly defaultOpen?: boolean
}

export interface ColorPickerPopoverProps extends ColorPickerProps {
  readonly triggerLabel?: string
  readonly triggerLabelPosition?: 'left' | 'right'
  readonly triggerShowValue?: boolean
  readonly triggerShowRemove?: boolean
  readonly triggerClassName?: string
}

const Model = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  settings: ColorSettings,
  picker: ColorPickerBlock.Model,
  popup: ColorPopupBlock.Model,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
})

const Message = defineMessageUnion({
  Removed: {},
})

const OutMessage = defineMessageUnion({
  PickerEvents: { events: ColorPickerBlock.OutMessage.Events.fields.events },
  OpenChanged: { open: Schema.Boolean },
  Removed: {},
})

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedConfigure: { settings: ColorSettings, open: Schema.OptionFromNullOr(Schema.Boolean) },
})

export const ColorPickerPopoverKey = Symbol('ColorPickerPopover')

const effects = Block.makeEffectsContract<never, ColorPickerEnvironment | TooltipDom>()

export const ColorPickerPopoverBlock = Block.make('ColorPickerPopover', {
  key: ColorPickerPopoverKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      ...ColorPickerConfigSchema.fields,
      open: Schema.optionalKey(Schema.Boolean),
      defaultOpen: Schema.optionalKey(Schema.Boolean),
    }),
  ]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<ColorPickerPopoverProps>() },
  effects,
})

const PickerInitial = ColorPickerPopoverBlock.makeRequiredFieldBinding(ColorPickerBlock, {
  field: 'picker',
  init: {
    contextToArgs: (config: ColorPickerPopoverConfig) =>
      [
        {
          ...config,
          id: `${config.id}-picker`,
          value: config.value ?? config.defaultValue ?? '#6B97FF',
        },
      ] satisfies [ColorPickerConfig],
  },
})

const Picker = PickerInitial.withOutMessagePolicy({
  fold: ColorPickerPopoverBlock.makeOutMessageFold(ColorPickerBlock, {
    Events: ({ events }) =>
      ColorPickerPopoverBlock.makeStep((model) => {
        const latest = events.findLast((event) => event.type === 'value')

        const value =
          Option.isNone(model.settings.value) && latest?.type === 'value'
            ? latest.value
            : model.value

        const combined = Update.combineSteps([
          ColorPickerPopoverBlock.makeFieldsStep(() => ({ value: () => value })),
          PickerInitial.requestConfigure({
            settings: modifyFields(model.settings, { value: () => Option.some(value) }),
          }),
        ])

        return (current: Parameters<typeof combined>[0]) =>
          Update.withOutMessage(combined(current), OutMessage.PickerEvents({ events }))
      }),
  }),
})

const Popup = ColorPickerPopoverBlock.makeRequiredFieldBinding(ColorPopupBlock, {
  field: 'popup',
  init: {
    contextToArgs: (config: ColorPickerPopoverConfig) => {
      const popup: ColorPopupConfig = { id: `${config.id}-popup`, kind: 'popover' }
      const configured = config.open === undefined ? popup : { ...popup, open: config.open }

      return [
        config.defaultOpen === undefined
          ? configured
          : { ...configured, defaultOpen: config.defaultOpen },
      ] satisfies [ColorPopupConfig]
    },
  },
}).withOutMessagePolicy({
  fold: ColorPickerPopoverBlock.makeOutMessageFold(ColorPopupBlock, {
    OpenChanged: ({ open }) =>
      ColorPickerPopoverBlock.makeStep((model) => ({
        model,
        outMessage: OutMessage.OpenChanged({ open }),
      })),
    Selected: () => ColorPickerPopoverBlock.makeNoopStep(),
    FocusChanged: () => ColorPickerPopoverBlock.makeNoopStep(),
  }),
})

const Highlight = ColorPickerPopoverBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: ColorPickerPopoverConfig) => [
      {
        id: `${config.id}-segment-highlight`,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
})

const Hover = ColorPickerPopoverBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: ColorPickerPopoverConfig) =>
      [
        {
          id: `${config.id}-segments`,
          axis: 'x',
          gapClick: false,
          ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
        },
      ] satisfies [
        {
          id: string
          axis: 'x'
          mode?: HoverMode
          gapClick: false
        },
      ],
  },
}).withOutMessagePolicy({
  fold: ColorPickerPopoverBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      ColorPickerPopoverBlock.makeStep((model) =>
        Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
      ),
  }),
})

const ColorPickerPopoverComposition = ColorPickerPopoverBlock.makeComposition({
  bindings: [Picker, Popup, Hover, Highlight],
})

const init = ColorPickerPopoverComposition.makeInit((config: ColorPickerPopoverConfig) => ({
  childInitContext: config,
  model: {
    id: config.id,
    value: config.value ?? config.defaultValue ?? '#6B97FF',
    settings: colorSettings(config),
  },
}))

const inMessageUpdate = ColorPickerPopoverComposition.makeInMessageUpdate({
  RequestedHoverMode: ColorPickerPopoverBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Update.combineSteps([
        Hover.requestConfigure({
          options: { mode, axis: 'x', nearest: false, gapClick: false, maxDistance: Infinity },
        }),
        Picker.requestHoverMode({ mode }),
      ]),
  ),
  RequestedConfigure: ColorPickerPopoverBlock.makeStep(
    (model, { settings, open }: typeof InMessage.RequestedConfigure.Type) => {
      const value = Option.getOrElse(settings.value, () => model.value)

      return Update.combineSteps([
        ColorPickerPopoverBlock.makeFieldsStep(() => ({
          value: () => value,
          settings: () => settings,
        })),
        Picker.requestConfigure({ settings: { ...settings, value: Option.some(value) } }),
        Popup.requestConfigure({ open }),
      ])
    },
  ),
})

const update = ColorPickerPopoverComposition.makeUpdate({
  Removed: (model) => ({ model, outMessage: OutMessage.Removed() }),
})

const view = ColorPickerPopoverComposition.makeView.withInputs<ColorPickerPopoverProps>(
  (model, inputs, h) => {
    const { shape, size, surface, icons } = resolvePresentation(inputs)
    const compact = size.variant === 'compact'
    const level = Math.min(surface + 2, 8)
    const parsed = parseColor(model.value)
    const swatchColor = parsed ? rgbToHexStr(parsed.r, parsed.g, parsed.b, parsed.a) : model.value

    const valueLabel = parsed
      ? rgbToHexStr(parsed.r, parsed.g, parsed.b, 1).replace(/^#/u, '').toUpperCase()
      : model.value

    const label =
      inputs.triggerLabel !== undefined && inputs.triggerLabel !== ''
        ? h.span(
            [h.Class(cn('text-muted-foreground px-1 select-none', size.text))],
            [inputs.triggerLabel],
          )
        : null

    const content = [
      ...(label && inputs.triggerLabelPosition !== 'right' ? [label] : []),
      ColorTile({ ...inputs, size: compact ? 16 : 20, color: swatchColor }, h),
      ...(inputs.triggerShowValue === false
        ? []
        : [h.span([h.Class(cn('text-foreground tabular-nums', size.text))], [valueLabel])]),
      ...(label && inputs.triggerLabelPosition === 'right' ? [label] : []),
    ]

    const innerRadius =
      shape.variant === 'sharp'
        ? 'rounded-none'
        : nestedRadius(shape.bgRadius, 3) === 5
          ? 'rounded-[5px]'
          : 'rounded-[17px]'
    const childContext = createPresentationContext({ ...inputs, surface: level })

    const popupContent: ColorPopupProps = {
      ...inputs,
      triggerContent: () => content,
      triggerClassName: cn(
        inputs.triggerShowRemove === true
          ? cn(
              'relative z-[1] flex h-full items-center outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] cursor-pointer',
              size.gap,
              compact ? 'px-1' : 'px-1.5',
              innerRadius,
            )
          : cn(
              'flex items-center border border-border bg-transparent hover:bg-hover transition-colors duration-80 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] cursor-pointer',
              size.gap,
              size.control,
              compact ? 'px-1.5' : 'px-2',
              shape.input,
              inputs.triggerClassName,
            ),
      ),
      triggerAttributes: childAttributes(
        inputs.triggerShowRemove === true
          ? [
              h.DataAttribute('fluid-hover-index', '0'),
              ...hoverItemAttributes(0, false, model.hover.activeIndex),
            ]
          : [],
      ),

      contentClassName: 'outline-none',
      content: () => [
        h.div(
          [h.Id(`${model.id}-panel`)],
          [
            h.block(
              Picker.embedView({
                slotId: model.picker.color.id,
                model: model.picker,
                viewInputs: {
                  ...inputs,
                  context: childContext,
                  portalContainerId: `${model.id}-panel`,
                  className: cn(surfaceClasses(level, 3), inputs.className),
                },
              }),
            ),
          ],
        ),
      ],
    }

    const popupInputs: ColorPopupProps =
      inputs.triggerShowRemove === true
        ? {
            ...popupContent,
            wrapTrigger: (trigger: Html) =>
              h.block(
                Hover.embedView({
                  slotId: model.hover.id,
                  model: model.hover,
                  viewInputs: {
                    className: cn(
                      'relative inline-flex items-center border border-border bg-transparent p-0.5',
                      size.control,
                      shape.input,
                      inputs.triggerClassName,
                    ),
                    content: () => [
                      h.block(
                        Highlight.embedView({
                          slotId: model.highlight.id,
                          model: model.highlight,
                          viewInputs: {
                            className: cn('z-0', innerRadius),
                            mode: model.hover.mode,
                            animate: inputs.highlightMotion,
                          },
                        }),
                      ),
                      trigger,
                      h.button(
                        [
                          h.Type('button'),
                          h.DataAttribute('fluid-hover-index', '1'),
                          ...hoverItemAttributes(1, false, model.hover.activeIndex),
                          h.AriaLabel('Remove color'),
                          h.OnClick(Message.Removed()),
                          h.Class(
                            cn(
                              'relative z-[1] inline-flex h-full shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                              compact ? 'w-6' : 'w-7',
                              innerRadius,
                            ),
                          ),
                        ],
                        [icons.x({ size: 14, strokeWidth: 1.5 }, h)],
                      ),
                    ],
                  },
                }),
              ),
          }
        : popupContent

    return h.div(
      [h.Id(model.id), h.Class('inline-flex')],
      [
        h.block(
          Popup.embedView({
            slotId: model.popup.id,
            model: model.popup,
            viewInputs: popupInputs,
          }),
        ),
      ],
    )
  },
)

export const layer = ColorPickerPopoverBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(Layer.provide(Layer.mergeAll(pickerLayer, popupLayer, hoverLayer, highlightLayer)))

/** Native portal context is an explicit container id, carried across Block view inputs. */
export const ColorPickerPortalContainer = (id: string) => ({ portalContainerId: id })

export const hoverModeOf = (model: typeof ColorPickerPopoverBlock.Model.Type) => model.hover.mode
