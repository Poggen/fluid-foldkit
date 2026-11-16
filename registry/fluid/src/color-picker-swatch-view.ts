// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { childAttributes } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import { ColorPickerBlock, Message, Tooltips } from './color-picker-block.js'
import type { ColorPickerViewBuilder } from './color-picker-block.js'
import { CHECKER_BG, swatchHairline } from './color-picker-parts.js'
import { colorPickerSwatches, isLabeledSwatch } from './color-picker-tooltips.js'
import type { ColorPickerSwatch } from './color-picker-tooltips.js'
import { hoverItemAttributes } from './hover.js'
import { nestedRadius, shapeMap } from './lib/shape.js'
import type { ShapeVariant } from './lib/shape.js'
import { cn } from './lib/utils.js'
import type { TooltipButtonRenderer } from './tooltip-native/interaction.js'

type Model = typeof ColorPickerBlock.Model.Type

const swatchButton = (
  swatch: ColorPickerSwatch,
  selectedIndex: number,
  activeIndex: Model['swatches']['activeIndex'],
  isPressed: boolean,
  variant: ShapeVariant,
  button: TooltipButtonRenderer,
  h: ColorPickerViewBuilder,
): Html => {
  const shape = shapeMap[variant]
  const lit = activeIndex === swatch.index
  const pressed = lit && isPressed

  return button(
    childAttributes([
      h.Type('button'),
      h.DataAttribute('fluid-hover-index', String(swatch.index)),
      h.AriaLabel(swatch.label ?? `Select color ${swatch.color}`),
      h.AriaPressed(String(swatch.index === selectedIndex)),
      h.OnClick(Message.Whole({ value: swatch.color })),
      h.Class(
        cn(
          'relative z-10 shrink-0 cursor-pointer p-1 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
          shape.container,
        ),
      ),
      ...hoverItemAttributes(swatch.index, false, activeIndex),
    ]),
    [
      h.span([
        h.Class(
          cn(
            'absolute bg-foreground transition-[opacity,inset,border-radius] duration-80',
            pressed ? 'inset-[3px]' : 'inset-0.5',
            swatch.index === selectedIndex
              ? lit && !pressed
                ? 'opacity-80'
                : 'opacity-100'
              : 'opacity-0',
          ),
        ),
        h.AriaHidden(true),
        h.Style({
          borderRadius: `${nestedRadius(shape.containerRadius, pressed ? 3 : 2)}px`,
        }),
      ]),
      h.span(
        [
          h.Class(cn('relative block size-7 overflow-hidden', shape.bg)),
          h.Style({ ...CHECKER_BG, boxShadow: swatchHairline }),
        ],
        [h.span([h.Class('absolute inset-0'), h.Style({ backgroundColor: swatch.color })])],
      ),
    ],
  )
}

export const renderSwatchTriggers = (
  tooltips: Model['tooltips'],
  swatches: Model['color']['settings']['swatches'],
  pickerId: string,
  selectedIndex: number,
  activeIndex: Model['swatches']['activeIndex'],
  pressed: boolean,
  shape: ShapeVariant,
  h: ColorPickerViewBuilder,
): Html => {
  const descriptors = colorPickerSwatches(pickerId, swatches)
  const byKey = new Map(descriptors.map((swatch) => [swatch.key, swatch]))

  return h.block(
    Tooltips.embedView({
      slotId: 'swatch-triggers',
      model: tooltips,
      viewInputs: {
        part: 'triggers',
        render: ({ tooltip }) =>
          h.div(
            [h.Class('contents')],
            descriptors.map((swatch) =>
              isLabeledSwatch(swatch)
                ? tooltip(swatch.key)
                : swatchButton(
                    swatch,
                    selectedIndex,
                    activeIndex,
                    pressed,
                    shape,
                    (attributes, children) => h.button(attributes, children),
                    h,
                  ),
            ),
          ),
        renderTrigger: (key, { button }) => {
          const swatch = byKey.get(key)
          if (swatch === undefined) throw new Error(`Unknown ColorPicker tooltip ${key}`)
          return swatchButton(swatch, selectedIndex, activeIndex, pressed, shape, button, h)
        },
      },
    }),
  )
}
