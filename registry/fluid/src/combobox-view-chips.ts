// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { Block } from 'foldkit'
import type { Model, Composition } from './combobox-definition.js'
import { Message } from './combobox-definition.js'
import type { ComboboxViewInputs } from './combobox-view.js'
import { resolvePresentation } from './presentation.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'

export function comboboxChips(
  model: typeof Model.Type,
  inputs: ComboboxViewInputs,
  h: Block.ViewBuilderFor<typeof Composition>,
) {
  const { size, shape } = resolvePresentation(inputs)

  const chipLayout = JSON.stringify({
    values: model.values,
    labels: model.chips.filter((chip) => chip.present).map((chip) => chip.label),
    query: model.query,
    width: model.fieldWidth,
    rects: model.chips.filter((chip) => chip.present).map((chip) => chip.rect),
    size: size.variant,
    shape: shape.variant,
  })

  return model.multiple
    ? model.chips.map((chip) =>
        inputs.animate(
          h.span(
            [
              h.Class(
                cn(
                  'inline-flex max-w-full shrink-0',
                  chip.present
                    ? ''
                    : chip.rect === null
                      ? 'pointer-events-none'
                      : 'pointer-events-none absolute',
                ),
              ),
              h.Key(`chip:${chip.value}`),
              h.DataAttribute('combo-chip-motion', chip.value),
              h.DataAttribute('combo-chip-present', String(chip.present)),
              h.DataAttribute('combo-chip-generation', String(chip.generation)),
              ...(chip.present
                ? []
                : [
                    h.Inert(true),
                    h.AriaHidden(true),
                    h.Style(
                      chip.rect === null
                        ? {}
                        : {
                            left: `${chip.rect.left}px`,
                            top: `${chip.rect.top}px`,
                            width: `${chip.rect.width}px`,
                            height: `${chip.rect.height}px`,
                          },
                    ),
                  ]),
            ],
            [
              h.span(
                [
                  h.DataAttribute('combo-chip', chip.value),
                  h.Tabindex(-1),
                  h.AriaLabel(chip.label),
                  h.Class(
                    cn(
                      'inline-flex max-w-full shrink-0 items-center gap-0.5 bg-hover pl-2 pr-0.5 text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                      shape.variant === 'pill'
                        ? 'rounded-full'
                        : shape.variant === 'sharp'
                          ? 'rounded-[1px]'
                          : 'rounded-md',
                      size.variant === 'compact' ? 'h-5' : 'h-6',
                      size.type.caption,
                    ),
                  ),
                ],
                [
                  h.span([h.Class('truncate')], [chip.label]),
                  h.button(
                    [
                      h.Type('button'),
                      h.AriaLabel(`Remove ${chip.label}`),
                      h.Tabindex(-1),
                      h.Disabled(model.disabled || !chip.present),
                      h.OnClick(Message.Removed({ value: chip.value })),
                      h.Class(
                        cn(
                          'relative before:absolute before:-inset-0.5 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-active hover:text-foreground transition-[color,background-color]',
                          size.variant === 'compact' ? 'size-4' : 'size-5',
                          shape.variant === 'pill'
                            ? 'rounded-full'
                            : shape.variant === 'sharp'
                              ? 'rounded-[1px]'
                              : 'rounded',
                        ),
                      ),
                    ],
                    [
                      h.svg(
                        [
                          h.Width(size.variant === 'compact' ? '10' : '12'),
                          h.Height(size.variant === 'compact' ? '10' : '12'),
                          h.ViewBox('0 0 24 24'),
                          h.Fill('none'),
                          h.Stroke('currentColor'),
                          h.StrokeWidth('2'),
                          h.StrokeLinecap('round'),
                          h.StrokeLinejoin('round'),
                        ],
                        [h.path([h.D('M18 6 6 18M6 6l12 12')])],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          {
            initial: chip.initial ? false : { opacity: 0, scale: 0.9, originX: 0 },
            animate: { opacity: 1, scale: 1, originX: 0 },
            exit: { opacity: 0, scale: 0.9, transition: spring.fast.exit },
            transition: spring.fast,
            present: chip.present,
            layout: true,
            layoutDependency: chipLayout,
          },
        ),
      )
    : []
}
