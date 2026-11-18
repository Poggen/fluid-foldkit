import { layer as hoverLayer } from './hover.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { childAttributes, createLazy } from 'foldkit/html'
import { Effect, Option, Layer } from 'effect'
import { colorScrubCursor } from './color-picker-cursor.js'
import { layer as sliderLayer } from './slider.js'
import { layer as highlightLayer } from './hover-highlight.js'
import { layer as formatMenuLayer } from './color-picker-format-menu.js'
import { layer as tooltipsLayer } from './tooltip-native/document.js'
import type { TooltipViewInputs } from './tooltip-native/interaction.js'
import type { ColorTooltipRenderer } from './color-picker-tooltips.js'
import { colorParsed } from './color-picker-state.js'
import { saturationSquare, colorFields } from './color-picker-parts.js'
import { colorPickerSwatches, isLabeledSwatch } from './color-picker-tooltips.js'
import { renderSwatchTriggers } from './color-picker-swatch-view.js'
import type { ColorPickerProps } from './color-picker-parts.js'
import { resolvePresentation } from './presentation.js'
import { surfaceClasses } from './lib/surface-classes.js'
import { cn } from './lib/utils.js'
import {
  ColorPickerBlock,
  Message,
  SelectMenu,
  Tooltips,
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
} from './color-picker-block.js'
import { update, inMessageUpdate } from './color-picker-update.js'

const makeView = () => {
  const lazySwatchTriggers = createLazy()

  return ColorPickerComposition.makeView.withInputs<ColorPickerProps>((model, inputs, h) => {
    const { shape, size, surface, icons, reducedMotion } = resolvePresentation(inputs)

    const { color } = model
    const parsed = colorParsed(color)

    const menu = h.block(
      Menu.embedView({ slotId: model.menu.id, model: model.menu, viewInputs: inputs }),
    )

    const { swatches } = color.settings

    const normalized = colorPickerSwatches(color.id, swatches)
    const selectedIndex = normalized.findIndex(
      (swatch) => color.resolvedSwatches[swatch.color] === parsed.hex.toLowerCase(),
    )
    const litSelected = model.swatches.activeIndex === selectedIndex
    const swatchTriggers =
      swatches.length === 0
        ? h.empty
        : lazySwatchTriggers(renderSwatchTriggers, [
            model.tooltips,
            swatches,
            color.id,
            selectedIndex,
            model.swatches.activeIndex,
            color.pressed,
            shape.variant,
            h,
          ])
    const swatchPopups =
      swatches.length === 0
        ? h.empty
        : h.block(
            Tooltips.embedView({
              slotId: 'swatch-popups',
              model: model.tooltips,
              viewInputs: {
                part: 'popups',
                entries: normalized.filter(isLabeledSwatch).map((swatch) => ({
                  key: swatch.key,
                  content: swatch.label,
                  shapeClass: shape.bg,
                  reducedMotion,
                  ...(inputs.portalContainerId === undefined
                    ? {}
                    : { portalContainerId: inputs.portalContainerId }),
                })),
                animate: inputs.animate,
                renderPopups: (popups) => h.div([h.Class('contents')], popups),
              },
            }),
          )

    if ((color.channelTooltipProvider === 'ancestor') !== (inputs.channelTooltip !== undefined)) {
      throw new Error(
        'ColorPicker ancestor channelTooltipProvider requires channelTooltip; local mode must omit it',
      )
    }

    const cursorAttributes = childAttributes([h.OnMount(CursorPortal())])

    const panelAttributes = [
      ...childAttributes([
        h.Class(
          cn(
            'flex flex-col gap-2 p-3',
            surfaceClasses(Math.max(surface, 3), 1),
            shape.container,
            inputs.className,
          ),
        ),
        h.Style({ width: '280px' }),
        h.Id(color.id),
        ...(Option.isSome(color.scrub)
          ? [h.DataAttribute('color-scrubbing', String(color.scrub.value.pointer))]
          : []),
        h.OnMount(Observe()),
        ...(typeof window === 'undefined' ? [] : [h.OnUnmount(Message.Unmounted())]),
      ]),
      ...(inputs.attributes ?? []),
    ]

    const triggers = new Map<string, TooltipViewInputs['trigger']>()

    return h.block(
      Tooltips.embedView({
        slotId: 'tooltips',
        model: model.tooltips,
        viewInputs: {
          render: ({ tooltip: renderTooltip }) => {
            const tooltip: ColorTooltipRenderer = (key, label, trigger) => {
              triggers.set(key, trigger)

              const tooltipInputs = {
                content: label,
                shapeClass: shape.bg,
                animate: inputs.animate,
                reducedMotion,
              }

              return renderTooltip(
                key,
                inputs.portalContainerId === undefined
                  ? tooltipInputs
                  : { ...tooltipInputs, portalContainerId: inputs.portalContainerId },
              )
            }

            const panel = h.div(panelAttributes, [
              saturationSquare(color, inputs, h),
              colorScrubCursor(color, cursorAttributes, h),
              h.div(
                [h.Class('flex flex-col [&>*]:mb-0 [&>*+*]:-mt-px')],
                [
                  h.block(
                    Hue.embedView({
                      slotId: model.hue.id,
                      model: model.hue,
                      viewInputs: { ...inputs, label: 'Hue', motionValues: inputs.sliderMotion },
                    }),
                  ),
                  h.block(
                    Alpha.embedView({
                      slotId: model.alpha.id,
                      model: model.alpha,
                      viewInputs: { ...inputs, label: 'Alpha', motionValues: inputs.sliderMotion },
                    }),
                  ),
                ],
              ),
              h.div(
                [h.Class('grid grid-cols-2 gap-2')],
                [
                  menu,
                  ...(!color.settings.hideEyedropper && color.eyedropperSupported
                    ? [
                        h.button(
                          [
                            h.Type('button'),
                            h.AriaLabel('Pick color from screen'),
                            h.OnClick(Message.Screen()),
                            h.Class(
                              cn(
                                'flex items-center justify-center text-muted-foreground bg-transparent hover:bg-hover hover:text-foreground active:bg-active transition-colors duration-80 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] cursor-pointer',
                                size.control,
                                size.px,
                                shape.input,
                              ),
                            ),
                          ],
                          [icons.pipette({ size: size.icon, strokeWidth: 1.5 }, h)],
                        ),
                      ]
                    : []),
                ],
              ),
              colorFields(color, inputs, h, (key, content, render) =>
                inputs.channelTooltip === undefined
                  ? tooltip(key, content, render)
                  : inputs.channelTooltip({ key, content, render }),
              ),
              ...(swatches.length
                ? [
                    h.block(
                      Swatches.embedView({
                        slotId: model.swatches.id,
                        model: model.swatches,
                        viewInputs: {
                          className: 'relative -m-1 flex flex-wrap',
                          content: () => [
                            h.block(
                              SwatchHighlight.embedView({
                                slotId: model.swatchHighlight.id,
                                model: model.swatchHighlight,
                                viewInputs: {
                                  animate: inputs.highlightMotion,
                                  mode: model.swatches.mode,
                                  className: cn(
                                    'bg-transparent before:pointer-events-none before:absolute before:inset-[3px] before:bg-[var(--swatch-press)] before:transition-[box-shadow,background-color] before:[transition-duration:180ms,80ms] before:[transition-timing-function:cubic-bezier(0.23,1,0.32,1),ease]',
                                    shape.container,
                                    shape.variant === 'sharp'
                                      ? 'before:rounded-none'
                                      : shape.variant === 'pill'
                                        ? 'before:rounded-full'
                                        : 'before:rounded-[9px]',
                                    color.pressed && !litSelected
                                      ? '[--swatch-press:var(--active)] before:shadow-[0_0_0_0px_var(--swatch-press)] before:[transition-duration:80ms,80ms]'
                                      : '[--swatch-press:var(--hover)] before:shadow-[0_0_0_1px_var(--swatch-press)]',
                                  ),
                                },
                              }),
                            ),
                            swatchTriggers,
                          ],
                        },
                      }),
                    ),
                  ]
                : []),
            ])

            return panel
          },
          renderTrigger: (key, context) => {
            const trigger = triggers.get(key)

            if (trigger === undefined) {
              throw new Error(`Unknown ColorPicker tooltip ${key}`)
            }

            return trigger(context)
          },
          renderDocument: (content, popups) =>
            h.div([h.Class('contents')], [content, ...popups, swatchPopups]),
        },
      }),
    )
  })
}

const plans = Effect.gen(function* () {
  const children = yield* ColorPickerComposition.acquireChildren()
  const view = makeView()

  return {
    children,
    init,
    update,
    inMessageUpdate,
    view,
    EffectsLayer: Layer.mergeAll(
      Observe.layer,
      SelectMenu.layer,
      CursorPortal.layer,
      ResolveWhole.layer,
      ResolveSwatches.layer,
      Pick.layer,
      Field.layer,
    ),
  }
})

export const layer = ColorPickerBlock.makeLayer(plans).pipe(
  Layer.provide(
    Layer.mergeAll(sliderLayer, hoverLayer, highlightLayer, formatMenuLayer, tooltipsLayer),
  ),
)

export { ColorPickerBlock, ColorPickerKey, InMessage } from './color-picker-block.js'

export { ColorPickerConfigSchema } from './color-picker-state.js'

export { createColorPickerLayer, ColorPickerEnvironment } from './color-picker-environment.js'

export { ColorTile, ColorSwatch } from './color-picker-parts.js'

export { parseColor, buildParsed } from './color-picker-math.js'

export { colorSettings } from './color-picker-state.js'

export type { ParsedColor } from './color-picker-math.js'

export type { ColorPickerConfig } from './color-picker-state.js'

export type { ColorFormat, ColorSwatchItem } from './color-picker-state.js'

export type { ColorPickerProps } from './color-picker-parts.js'

export { createColorPickerNumberDisplay } from './color-number-locale.js'

export { colorPickerChannelTooltipEntries } from './color-picker-tooltips.js'

export type { ColorChannelTooltip } from './color-picker-tooltips.js'

export const hoverModeOf = (model: typeof ColorPickerBlock.Model.Type) => model.swatches.mode

export const settingsOf = (model: typeof ColorPickerBlock.Model.Type) => model.color.settings
export const colorValueOf = (model: typeof ColorPickerBlock.Model.Type) =>
  colorParsed(model.color).hex
