import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import { sliderCss, sliderBubble, sliderKeyboardView, sliderValueDisplay } from './slider-parts.js'
import type { SliderViewInputs } from './slider-parts.js'
import type { SliderModel } from './slider-state.js'
import { sliderValues } from './slider-state.js'

const compactTrack: <M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
) => Html = function compactTrack<M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
) {
  const { appearance } = model.settings
  const { shape, reducedMotion } = resolvePresentation(inputs)
  const position = appearance.valuePosition ?? 'left'
  const preview = Option.getOrNull(model.preview)
  const values = sliderValues(model.settings.value)
  const dots = compactSteps(model)

  const thumb = (index: number) =>
    h.span(
      [
        h.Class('flex items-center justify-center pointer-events-none absolute left-0 z-10'),
        h.DataAttribute('slider-thumb', String(index)),
        h.Style({ width: '20px', height: '20px', marginTop: '-10px', top: '50%' }),
      ],
      [
        h.span([
          h.Class(cn('block', shape.variant === 'sharp' ? 'rounded-none' : 'rounded-full')),
          h.Style(
            appearance.thumbBorderColor === ''
              ? {
                  width: '16px',
                  height: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  backgroundColor: appearance.thumbColor ?? 'white',
                }
              : {
                  width: '16px',
                  height: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  backgroundColor: appearance.thumbColor ?? 'white',
                  border: `1px solid ${appearance.thumbBorderColor}`,
                },
          ),
        ]),
        inputs.animate(
          h.span([
            h.Class(
              cn(
                'absolute border border-[color:var(--focus-ring,#6B97FF)] pointer-events-none',
                shape.variant === 'sharp' ? 'rounded-none' : 'rounded-full',
              ),
            ),
          ]),
          {
            initial: false,
            animate: {
              opacity: Option.getOrNull(model.focusedThumb) === index ? 1 : 0,
              width: 24,
              height: 24,
            },
            transition: spring.fast,
            reducedMotion,
          },
        ),
      ],
    )

  return h.div(
    [
      h.Class('relative w-full cursor-ew-resize py-2'),
      h.DataAttribute('slider-track', ''),
      h.Style({ height: '36px', opacity: model.ready ? '1' : '0' }),
    ],
    [
      h.div([
        h.Class('absolute cursor-ew-resize'),
        h.Style({ top: '0px', bottom: '0px', left: '-8px', right: '-8px' }),
        h.DataAttribute('slider-hit', ''),
      ]),
      preview && position !== 'tooltip'
        ? sliderBubble(
            preview.value,
            inputs,
            h,
            [],
            -20,
            model.hovered && model.hoverDelayDone && model.drag === 'idle',
            preview.cursor,
          )
        : null,
      h.div(
        [
          h.Class(
            cn(
              'absolute border border-border overflow-hidden',
              shape.variant === 'sharp' ? 'rounded-none' : 'rounded-full',
              appearance.trackClassName,
              'left-px right-px bg-transparent',
            ),
          ),
          h.Style({ height: '18px', top: '9px', ...sliderCss(appearance.trackStyle) }),
        ],
        [
          appearance.hideFill
            ? null
            : h.div([
                h.DataAttribute('slider-fill', ''),
                h.Class(
                  cn('absolute h-full bg-selected/50 dark:bg-accent/40', appearance.fillClassName),
                ),
                h.Style(sliderCss(appearance.fillStyle)),
              ]),
          inputs.animate(
            h.div([
              h.Class('absolute h-full pointer-events-none z-[2]'),
              h.Style({
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 40%, transparent)',
                left: `${preview ? preview.left - 1 : 0}px`,
                width: `${preview?.width ?? 0}px`,
                borderRadius: compactPreviewRadius(
                  shape.variant === 'sharp',
                  preview !== null && preview.cursor > preview.left,
                ),
              }),
            ]),
            {
              initial: false,
              animate: { opacity: preview && model.drag === 'idle' ? 1 : 0 },
              transition: { opacity: { duration: 0.15 } },
              reducedMotion,
            },
          ),
        ],
      ),
      dots.length > 0
        ? h.div(
            [
              h.Class('absolute left-0 right-0 pointer-events-none'),
              h.DataAttribute('slider-dots', ''),
              h.Style({ top: '9px', height: '18px' }),
            ],
            dots.map((stepValue) => {
              const percent =
                (stepValue - model.settings.min) / (model.settings.max - model.settings.min)

              return h.div(
                [
                  h.Class('absolute pointer-events-none flex items-center justify-center w-0 h-0'),
                  h.Style({ top: '50%', left: `calc(10px + ${percent} * (100% - 20px))` }),
                ],
                [
                  inputs.animate(
                    h.div([
                      h.Class('rounded-full flex-shrink-0'),
                      h.Style({ backgroundColor: 'var(--muted-foreground)', opacity: '0.3' }),
                    ]),
                    {
                      initial: false,
                      animate: {
                        width: model.hovered ? 5 : 4,
                        height: model.hovered ? 5 : 4,
                      },
                      transition: spring.moderate,
                      reducedMotion,
                    },
                  ),
                ],
              )
            }),
          )
        : null,
      ...values.map((_, index) => thumb(index)),
    ],
  ) satisfies Html
}

export const sliderCompactView: <M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  attributes: NonNullable<Parameters<HtmlBuilder<M, R>['div']>[0]>,
  h: HtmlBuilder<M, R>,
) => Html = function sliderCompactView<M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  attributes: NonNullable<Parameters<HtmlBuilder<M, R>['div']>[0]>,
  h: HtmlBuilder<M, R>,
) {
  const { appearance } = model.settings
  const values = sliderValues(model.settings.value)
  const position = appearance.valuePosition ?? 'left'
  const inline = position === 'left' || position === 'right'
  const interacting = model.hovered || model.drag !== 'idle'

  const value =
    (appearance.showValue ?? true) && position !== 'tooltip'
      ? sliderValueDisplay(model, inputs, h)
      : null

  return inputs.motionValues(
    h.div(
      [
        h.Id(model.id),
        ...attributes,
        h.AriaDisabled(model.settings.disabled),
        h.DataAttribute('slider-engine', 'compact'),
        h.Class(
          cn(
            'flex flex-col gap-0 w-full select-none touch-none overflow-visible',
            inline ? 'flex-row items-center gap-2 mb-2' : 'flex-col',
            model.settings.disabled && 'opacity-50 pointer-events-none',
            inputs.className,
          ),
        ),
        ...(inputs.attributes ?? []),
      ],
      [
        position === 'top' || position === 'left' ? value : null,
        h.div(
          [
            h.Class('relative flex-1 overflow-visible'),
            h.Style({
              height: `${inline ? 36 : 20 + (position === 'tooltip' ? 16 : 0)}px`,
              paddingTop: position === 'tooltip' ? '16px' : '0',
            }),
          ],
          [
            ...(position === 'tooltip' && (appearance.showValue ?? true)
              ? values.map((entry, index) =>
                  sliderBubble(
                    entry,
                    inputs,
                    h,
                    [h.DataAttribute('slider-tooltip', String(index))],
                    -16,
                    interacting,
                  ),
                )
              : []),
            sliderKeyboardView(model, inputs, h),
            compactTrack(model, inputs, h),
          ],
        ),
        position === 'bottom' || position === 'right' ? value : null,
      ],
    ),
    model,
  ) satisfies Html
}

const compactPreviewRadius = (sharp: boolean, curvesRight: boolean) => {
  if (sharp) {
    return '0'
  }

  return curvesRight ? '0 9999px 9999px 0' : '9999px 0 0 9999px'
}

function compactSteps(model: SliderModel) {
  const { settings } = model

  if (!settings.appearance.showSteps) {
    return []
  }

  if (settings.steps.length > 1) {
    return settings.steps
  }

  return Array.from(
    { length: Math.round((settings.max - settings.min) / settings.step) + 1 },
    (_, index) => settings.min + index * settings.step,
  )
}
