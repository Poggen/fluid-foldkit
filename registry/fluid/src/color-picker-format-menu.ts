import { HoverMode } from './hover-observation.js'

import { rectAt } from './lib/indexed-geometry.js'
import { Effect, Layer, Schema } from 'effect'
import type { ColorPickerEnvironment } from './color-picker-environment.js'
import { Block, Update } from 'foldkit'
import { createLazy } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { ColorFormat } from './color-picker-state.js'
import { ColorPopupBlock, layer as popupLayer } from './color-picker-popup.js'
import type { ColorPopupConfig } from './color-picker-popup.js'
import { HoverBlock, layer as hoverLayer, hoverItemAttributes } from './hover.js'
import { HoverHighlightBlock, layer as highlightLayer } from './hover-highlight.js'
import { popupShape, type ShapeVariant } from './lib/shape.js'
import type { SizeVariant } from './lib/size.js'
import type { Icon } from './presentation.js'
import { formatMenuTrigger } from './color-picker-format-menu-trigger.js'
import { resolvePresentation } from './presentation.js'
import { colorMenuLayer, colorMenuHoverLayer } from './color-picker-menu-layers.js'
import { cn } from './lib/utils.js'
import { surfaceClasses } from './lib/surface-classes.js'
import { fontWeights } from './lib/font-weight.js'
import type { ColorPickerProps } from './color-picker-parts.js'

const formats = ['hex', 'rgb', 'hsl', 'oklch'] satisfies ReadonlyArray<ColorFormat>

export const ColorFormatMenuModel = Schema.Struct({
  id: Schema.String,
  format: ColorFormat,
  popup: ColorPopupBlock.Model,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
  selected: HoverHighlightBlock.Model,
  focus: HoverHighlightBlock.Model,
})

const Model = ColorFormatMenuModel

const Settings = Schema.Struct({
  format: ColorFormat,
  open: Schema.OptionFromNullOr(Schema.Boolean),
})

const Message = defineMessageUnion({
  Selected: { format: ColorFormat },
})

const OutMessage = defineMessageUnion({ Selected: { format: ColorFormat } })

export interface ColorFormatMenuConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly format: ColorFormat
  readonly open?: boolean
  readonly defaultOpen?: boolean
}

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedSettings: { settings: Settings },
  RequestedDismiss: { restore: Schema.Boolean },
})

export const ColorFormatMenuKey = Symbol('ColorFormatMenu')

const effects = Block.makeEffectsContract<never, ColorPickerEnvironment>()

export const ColorFormatMenuBlock = Block.make('ColorFormatMenu', {
  key: ColorFormatMenuKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      format: ColorFormat,
      open: Schema.optionalKey(Schema.Boolean),
      defaultOpen: Schema.optionalKey(Schema.Boolean),
    }),
  ]),
  Model,
  Message,
  InMessage,
  OutMessage,
  inMessageOutputs: { RequestedDismiss: { outMessage: OutMessage.Selected } },
  view: { kind: 'Element', Inputs: Block.makeInputContract<ColorPickerProps>() },
  effects,
})

const Highlight = ColorFormatMenuBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: ColorFormatMenuConfig) => [
      {
        id: `${config.id}-highlight`,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
})

const Selected = ColorFormatMenuBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'selected',
  init: { contextToArgs: (config: ColorFormatMenuConfig) => [{ id: `${config.id}-selected` }] },
})

const Focus = ColorFormatMenuBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'focus',
  init: { contextToArgs: (config: ColorFormatMenuConfig) => [{ id: `${config.id}-focus` }] },
})

const Hover = ColorFormatMenuBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: ColorFormatMenuConfig) => [
      {
        id: `${config.id}-hover`,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: ColorFormatMenuBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      ColorFormatMenuBlock.makeStep((model) => {
        const rect = rectAt(snapshot.itemRects, model.popup.focusedIndex)

        return Update.combineSteps([
          Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
          Selected.requestRect({
            rect: rectAt(snapshot.itemRects, formats.indexOf(model.format)) ?? null,
            session: 0,
          }),
          Focus.requestRect({
            rect: rect
              ? {
                  left: rect.left - 2,
                  top: rect.top - 2,
                  width: rect.width + 4,
                  height: rect.height + 4,
                }
              : null,
            session: 0,
          }),
        ])
      }),
  }),
})

const Popup = ColorFormatMenuBlock.makeRequiredFieldBinding(ColorPopupBlock, {
  field: 'popup',
  init: {
    contextToArgs: (config: ColorFormatMenuConfig) => {
      const popup: ColorPopupConfig = { id: config.id, kind: 'menu' }
      const configured = config.open === undefined ? popup : { ...popup, open: config.open }

      return [
        config.defaultOpen === undefined
          ? configured
          : { ...configured, defaultOpen: config.defaultOpen },
      ] satisfies [ColorPopupConfig]
    },
  },
}).withOutMessagePolicy({
  fold: ColorFormatMenuBlock.makeOutMessageFold(ColorPopupBlock, {
    OpenChanged: () => Hover.requestRemeasure(),
    FocusChanged: ({ index }) =>
      ColorFormatMenuBlock.makeStep((model) => {
        const rect = rectAt(model.hover.itemRects, index)

        return Update.combineSteps([
          Hover.requestHighlight({ index: index < 0 ? null : index }),
          Focus.requestRect({
            rect: rect
              ? {
                  left: rect.left - 2,
                  top: rect.top - 2,
                  width: rect.width + 4,
                  height: rect.height + 4,
                }
              : null,
            session: 0,
          }),
        ])
      }),
    Selected: ({ index }) =>
      ColorFormatMenuBlock.makeStep((model) => {
        const format = formats[index]

        return format ? { model, outMessage: OutMessage.Selected({ format }) } : { model }
      }),
  }),
})

const ColorFormatMenuComposition = ColorFormatMenuBlock.makeComposition({
  bindings: [Popup, Hover, Highlight, Selected, Focus],
})

const init = ColorFormatMenuComposition.makeInit((config: ColorFormatMenuConfig) => ({
  model: { id: config.id, format: config.format },
  childInitContext: config,
}))

const inMessageUpdate = ColorFormatMenuComposition.makeInMessageUpdate({
  RequestedHoverMode: ColorFormatMenuBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Hover.requestConfigure({
        options: { mode, axis: 'y', nearest: false, gapClick: true, maxDistance: Infinity },
      }),
  ),
  RequestedSettings: ColorFormatMenuBlock.makeStep(
    (model, { settings }: typeof InMessage.RequestedSettings.Type) =>
      Update.combineSteps([
        ColorFormatMenuBlock.makeFieldsStep(() => ({ format: () => settings.format })),
        Popup.requestConfigure({ open: settings.open }),
        Selected.requestRect({
          rect: rectAt(model.hover.itemRects, formats.indexOf(settings.format)) ?? null,
          session: 0,
        }),
      ]),
  ),
  RequestedDismiss: ColorFormatMenuBlock.makeStep(
    (_model, { restore }: typeof InMessage.RequestedDismiss.Type) =>
      Popup.requestDismiss({ restore }),
  ),
})

const update = ColorFormatMenuComposition.makeUpdate({
  Selected: ColorFormatMenuBlock.makeStep((model, { format }: typeof Message.Selected.Type) => ({
    model,
    outMessage: OutMessage.Selected({ format }),
  })),
})

const makeView = () => {
  const lazyClosedPopup = createLazy()
  const renderClosedPopup = (
    popup: (typeof Model.Type)['popup'],
    format: ColorFormat,
    shape: ShapeVariant,
    size: SizeVariant,
    chevron: Icon,
    className: string | undefined,
    h: Block.ViewBuilderFor<typeof ColorFormatMenuComposition>,
  ) =>
    h.block(
      Popup.embedView({
        slotId: popup.id,
        model: popup,
        viewInputs: {
          body: 'absent',
          ...formatMenuTrigger(format, false, shape, size, chevron, h),
          ...(className === undefined ? {} : { className }),
        },
      }),
    )

  return ColorFormatMenuComposition.makeView.withInputs<ColorPickerProps>((model, inputs, h) => {
    const { shape, size, surface, icons } = resolvePresentation(inputs)
    const menuShape = popupShape(shape.variant)
    const { format } = model
    if (!model.popup.open && !model.popup.present) {
      return lazyClosedPopup(renderClosedPopup, [
        model.popup,
        format,
        shape.variant,
        size.variant,
        icons['chevron-down'],
        inputs.className,
        h,
      ])
    }

    return h.block(
      Popup.embedView({
        slotId: model.popup.id,
        model: model.popup,
        viewInputs: {
          ...inputs,
          ...formatMenuTrigger(
            format,
            model.popup.open,
            shape.variant,
            size.variant,
            icons['chevron-down'],
            h,
          ),
          contentClassName: cn(
            'relative flex flex-col min-w-[var(--anchor-width)] p-1 select-none outline-none',
            menuShape.container,
            surfaceClasses(Math.min(Math.max(surface, 3) + 2, 8), 3),
          ),
          content: () => [
            h.block(
              Hover.embedView({
                slotId: model.hover.id,
                model: model.hover,
                viewInputs: {
                  className: 'relative flex flex-col',
                  content: () => [
                    h.block(
                      Selected.embedView({
                        slotId: model.selected.id,
                        model: model.selected,
                        viewInputs: {
                          className: cn(menuShape.bg, 'bg-active!'),
                          animate: colorMenuLayer(inputs.animate, false),
                        },
                      }),
                    ),
                    h.block(
                      Focus.embedView({
                        slotId: model.focus.id,
                        model: model.focus,
                        viewInputs: {
                          className: cn(
                            menuShape.focusRing,
                            'bg-transparent! z-20 border border-[color:var(--focus-ring,#6B97FF)]',
                          ),
                          animate: colorMenuLayer(inputs.animate, true),
                        },
                      }),
                    ),
                    h.block(
                      Highlight.embedView({
                        slotId: model.highlight.id,
                        model: model.highlight,
                        viewInputs: {
                          className: menuShape.bg,
                          mode: model.hover.mode,
                          animate: colorMenuHoverLayer(
                            inputs.animate,
                            rectAt(model.hover.itemRects, formats.indexOf(format)),
                          ),
                        },
                      }),
                    ),
                    ...formats.map((value, index) =>
                      h.div(
                        [
                          h.Role('menuitemradio'),
                          h.AriaChecked(value === format),
                          h.Tabindex(-1),
                          h.DataAttribute('color-format-index', String(index)),
                          h.DataAttribute('fluid-hover-index', String(index)),
                          ...hoverItemAttributes(index, false, model.hover.activeIndex),
                          h.OnClick(Message.Selected({ format: value })),
                          h.Class(
                            cn(
                              'relative z-10 flex items-center cursor-pointer outline-none',
                              size.variant === 'compact' ? 'px-2.5 py-1.5' : 'px-3 py-2',
                              size.text,
                              shape.item,
                            ),
                          ),
                        ],
                        [
                          h.span(
                            [h.Class('inline-grid')],
                            [
                              h.span(
                                [
                                  h.Class('col-start-1 row-start-1 invisible'),
                                  h.AriaHidden(true),
                                  h.Style({ fontVariationSettings: fontWeights.semibold }),
                                ],
                                [value.toUpperCase()],
                              ),
                              h.span(
                                [
                                  h.Class(
                                    cn(
                                      'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80',
                                      value === format || index === model.hover.activeIndex
                                        ? 'text-foreground'
                                        : 'text-muted-foreground',
                                    ),
                                  ),
                                  h.Style({
                                    fontVariationSettings:
                                      value === format ? fontWeights.semibold : fontWeights.normal,
                                  }),
                                ],
                                [value.toUpperCase()],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                },
              }),
            ),
          ],
        },
      }),
    )
  })
}

const plans = Effect.gen(function* () {
  const children = yield* ColorFormatMenuComposition.acquireChildren()
  return { init, update, inMessageUpdate, children, view: makeView(), EffectsLayer: Layer.empty }
})

export const layer = ColorFormatMenuBlock.makeLayer(plans).pipe(
  Layer.provide(Layer.mergeAll(popupLayer, hoverLayer, highlightLayer)),
)
