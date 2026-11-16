import { Option, Predicate } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import { sliderBubble, sliderKeyboardView } from './slider-parts.js'
import type { SliderViewInputs } from './slider-parts.js'
import type { SliderModel } from './slider-state.js'

const hasLabel = (label: string | undefined): label is string => label !== undefined && label !== ''

function comfortableLabels<M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
) {
  const { settings } = model
  const { reducedMotion } = resolvePresentation(inputs)
  const format = inputs.formatValue ?? String
  const value = Predicate.isNumber(settings.value) ? settings.value : settings.value[0]
  const active = model.hovered || Option.isSome(model.focusedThumb)
  const textClass = 'text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)]'
  const color = active ? 'var(--foreground)' : 'var(--muted-foreground)'

  const text = (label: string, className: string, isValue: boolean, ghost: boolean) => {
    const node = h.span(
      [
        h.Class(cn(textClass, className)),
        ...(ghost ? [h.AriaHidden(true)] : []),
        h.Style(
          isValue
            ? ghost
              ? {
                  minWidth: `${Math.max(format(settings.min).length, format(settings.max).length)}ch`,
                }
              : {
                  minWidth: `${Math.max(format(settings.min).length, format(settings.max).length)}ch`,
                  textAlign: 'right',
                }
            : {},
        ),
      ],
      [label],
    )

    return ghost
      ? node
      : inputs.animate(node, {
          initial: false,
          animate: { color },
          transition: spring.fast,
          reducedMotion,
        })
  }

  const labelLayer = (ghost: boolean) =>
    h.div(
      [
        h.Class(
          cn(
            ghost
              ? 'absolute inset-0 flex items-center px-2 z-[2] pointer-events-none'
              : 'absolute inset-0 flex items-center px-2 z-[4] pointer-events-none',
          ),
        ),
        ...(ghost ? [h.AriaHidden(true)] : []),
      ],
      [
        inputs.label !== undefined && inputs.label !== ''
          ? text(
              inputs.label,
              cn('px-2', ghost && 'bg-background text-transparent select-none'),
              false,
              ghost,
            )
          : null,
        text(
          format(value),
          cn('tabular-nums ml-auto px-2', ghost && 'bg-background text-transparent select-none'),
          true,
          ghost,
        ),
      ],
    )

  return { text, labelLayer }
}

function comfortablePreview<M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
): Html {
  const preview = Option.getOrNull(model.preview)
  const { reducedMotion } = resolvePresentation(inputs)

  return inputs.animate(
    h.div([
      h.Class('absolute inset-y-0 pointer-events-none z-[3]'),
      h.Style({
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 40%, transparent)',
        left: `${preview?.left ?? 0}px`,
        width: `${preview?.width ?? 0}px`,
      }),
    ]),
    {
      initial: false,
      animate: { opacity: preview && model.drag === 'idle' ? 1 : 0 },
      transition: { opacity: { duration: 0.15 } },
      reducedMotion,
    },
  )
}

function comfortableLine<M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
): Html {
  const { reducedMotion } = resolvePresentation(inputs)
  const focused = Option.isSome(model.focusedThumb)
  const active = model.hovered || focused
  const pips = model.settings.variant === 'pips'

  const lineColor = model.hovered
    ? 'color-mix(in srgb, var(--foreground) 50%, transparent)'
    : 'color-mix(in srgb, var(--foreground) 25%, transparent)'

  return inputs.animate(
    h.div([
      h.Class(
        cn(
          pips
            ? 'absolute rounded-full pointer-events-none z-[3]'
            : 'absolute rounded-full pointer-events-none z-10',
        ),
      ),
      h.DataAttribute('slider-line', ''),
      h.Style({ width: '2px' }),
    ]),
    {
      initial: false,
      animate: {
        top: active ? 7 : 8,
        bottom: active ? 7 : 8,
        backgroundColor: focused ? 'var(--foreground)' : lineColor,
      },
      transition: spring.fast,
      reducedMotion,
    },
  )
}

function comfortablePips<M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
): Html {
  const { settings } = model
  const value = Predicate.isNumber(settings.value) ? settings.value : settings.value[0]
  const { reducedMotion } = resolvePresentation(inputs)

  return h.div(
    [
      h.DataAttribute('slider-dots', ''),
      h.Class('absolute inset-0 flex justify-between items-center px-3 pointer-events-none z-[1]'),
    ],
    Array.from(
      { length: Math.round((settings.max - settings.min) / settings.step) + 1 },
      (_, index) => {
        const pip = settings.min + index * settings.step

        return h.div(
          [
            h.Class('relative flex items-center justify-center'),
            h.Style({ width: '5px', height: '5px' }),
          ],
          [
            inputs.animate(
              h.div([h.Class('rounded-full'), h.Style({ width: '5px', height: '5px' })]),
              {
                initial: false,
                animate: {
                  backgroundColor: pip === value ? 'var(--foreground)' : 'var(--muted-foreground)',
                  opacity: pip === value ? 1 : 0.3,
                },
                transition: spring.fast,
                reducedMotion,
              },
            ),
          ],
        )
      },
    ),
  )
}

export function sliderComfortableView<M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  attributes: NonNullable<Parameters<HtmlBuilder<M, R>['div']>[0]>,
  h: HtmlBuilder<M, R>,
): Html {
  const { shape, reducedMotion } = resolvePresentation(inputs)
  const { settings } = model
  const format = inputs.formatValue ?? String
  const value = Predicate.isNumber(settings.value) ? settings.value : settings.value[0]
  const pips = settings.variant === 'pips'
  const focused = Option.isSome(model.focusedThumb)
  const preview = Option.getOrNull(model.preview)
  const { text, labelLayer } = comfortableLabels(model, inputs, h)

  return inputs.motionValues(
    h.div(
      [
        h.Id(model.id),
        ...attributes,
        h.Class('relative w-full touch-none'),
        h.DataAttribute('slider-engine', 'comfortable'),
        h.AriaDisabled(settings.disabled),
      ],
      [
        h.div([
          h.Class('absolute cursor-ew-resize'),
          h.DataAttribute('slider-hit', ''),
          h.Style({ left: '-8px', right: '-8px', top: '0px', bottom: '0px' }),
        ]),
        preview
          ? sliderBubble(
              preview.value,
              inputs,
              h,
              [],
              -30,
              model.hovered && model.hoverDelayDone && model.drag === 'idle',
              preview.cursor,
            )
          : null,
        inputs.animate(
          h.keyed('div')(
            'slider-track',
            [
              h.DataAttribute('slider-track', ''),
              h.Class(
                cn(
                  'relative w-full h-8 select-none touch-none border border-border overflow-hidden outline-offset-2',
                  pips ? 'cursor-ew-resize' : 'flex items-center gap-3 px-4 cursor-ew-resize',
                  shape.bg,
                  settings.disabled && 'opacity-50 pointer-events-none',
                  inputs.className,
                ),
              ),
              ...(inputs.attributes ?? []),
            ],
            [
              sliderKeyboardView(model, inputs, h),
              comfortablePreview(model, inputs, h),
              pips ? comfortablePips(model, inputs, h) : null,
              pips ? labelLayer(true) : null,
              h.div([
                h.Class(cn('absolute left-0 top-0 bottom-0 pointer-events-none', pips && 'z-[3]')),
                h.DataAttribute('slider-fill', ''),
                h.Style({ backgroundColor: 'var(--active)' }),
              ]),
              comfortableLine(model, inputs, h),
              pips ? labelLayer(false) : null,
              pips || !hasLabel(inputs.label)
                ? null
                : text(inputs.label, 'shrink-0 z-10', false, false),
              pips ? null : h.div([h.Class('flex-1')]),
              pips
                ? null
                : text(format(value), 'shrink-0 tabular-nums text-right z-10', true, false),
              pips
                ? null
                : h.div([
                    h.DataAttribute('slider-handle', ''),
                    h.Class('absolute top-0 bottom-0 w-2 cursor-ew-resize z-20'),
                  ]),
            ],
          ),
          {
            initial: false,
            animate: {
              outline: focused ? '1px solid var(--focus-ring, #6B97FF)' : '1px solid transparent',
            },
            transition: spring.fast,
            reducedMotion,
          },
        ),
      ],
    ),
    model,
  )
}
