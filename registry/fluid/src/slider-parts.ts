import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { Option } from 'effect'
import { cssStyle } from './lib/css-style.js'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { fontWeights } from './lib/font-weight.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import type { MotionOptions } from './motion.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { nearestSliderStep, sliderValues } from './slider-state.js'
import type { SliderModel } from './slider-state.js'

export const sliderKeyboardView: <M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
) => Html = function sliderKeyboardView<M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
) {
  const { settings } = model
  const values = sliderValues(settings.value)
  const list = settings.steps.length > 1

  const attributes = [
    h.Class('absolute inset-0 opacity-0 pointer-events-none [&_*]:pointer-events-none'),
    h.Style({ height: settings.compact ? '20px' : '100%' }),
  ]

  const thumbs = values.map((value, index) => {
    let { label } = inputs

    if (values.length > 1) {
      const first = index === 0

      if (inputs.label !== undefined && inputs.label !== '') {
        label = `${inputs.label} ${first ? 'minimum' : 'maximum'}`
      } else {
        label = first ? 'Minimum' : 'Maximum'
      }
    }

    let valueText: string | undefined

    if (list) {
      valueText = (inputs.formatValue ?? String)(value)
    } else if (values.length === 2) {
      valueText = `${new Intl.NumberFormat().format(value)} ${index === 0 ? 'start' : 'end'} range`
    }

    const keyboardValue = list ? nearestSliderStep(value, settings.steps) : value

    const common = [
      h.Class('block outline-none'),
      h.DataAttribute('slider-keyboard', String(index)),
      h.Tabindex(settings.disabled ? -1 : 0),
      h.AriaValuemin(list ? 0 : settings.min),
      h.AriaValuemax(list ? settings.steps.length - 1 : settings.max),
      h.AriaValuenow(keyboardValue),
      h.AriaOrientation('horizontal'),
      h.AriaDisabled(settings.disabled),
      ...(label === undefined ? [] : [h.AriaLabel(label)]),
      ...(valueText === undefined ? [] : [h.AriaValuetext(valueText)]),
      h.Style({ width: '20px', height: '20px' }),
    ]

    return h.span(
      [],
      [
        h.input([
          ...common,
          h.Type('range'),
          h.Min(String(list ? 0 : settings.min)),
          h.Max(String(list ? settings.steps.length - 1 : settings.max)),
          h.Step(String(list ? 1 : settings.step)),
          h.Value(String(keyboardValue)),
          h.Disabled(settings.disabled),
          h.Role('slider'),
        ]),
      ],
    )
  })

  return h.div(attributes, [
    h.div([h.Class('w-full h-full')], [h.div([h.Class('w-full h-full')], [h.div([])]), ...thumbs]),
  ]) satisfies Html
}

export const sliderValueDisplay: <M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
) => Html = function sliderValueDisplay<M, R>(
  model: SliderModel,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
) {
  const format = inputs.formatValue ?? String
  const values = sliderValues(model.settings.value)
  const { shape } = resolvePresentation(inputs)
  const editing = Option.getOrNull(model.editingIndex)
  const hasLabel = inputs.label !== undefined && inputs.label !== ''

  const label = hasLabel ? `${inputs.label}: ` : ''

  const ghostValues = [model.settings.min, model.settings.max].map((value) => [
    `${label}${format(value)}`,
    ...(values.length > 1 ? [h.span([h.Class('mx-1')], ['–']), format(value)] : []),
  ])

  const render = (value: number, index: number) => {
    const endpoint = index === 0 ? ' (start)' : ' (end)'

    return editing === index
      ? h.span(
          [h.Class('inline-grid text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)]')],
          [
            ...[model.settings.min, model.settings.max].map((end) =>
              h.span(
                [
                  h.Class('col-start-1 row-start-1 invisible'),
                  h.AriaHidden(true),
                  h.Style({ fontVariationSettings: fontWeights.normal }),
                ],
                [`${label}${format(end)}`],
              ),
            ),
            h.span(
              [h.Class('col-start-1 row-start-1 flex items-center gap-1')],
              [
                hasLabel ? h.span([h.Class('text-muted-foreground')], [`${inputs.label}:`]) : null,
                h.span(
                  [h.Class('inline-flex w-[5ch] shrink-0')],
                  [
                    h.input([
                      h.Class(
                        cn(
                          'w-full min-w-0 bg-transparent text-foreground outline-none border-b border-border text-center',
                          'pointer-coarse:text-[16px]',
                          shape.input,
                        ),
                      ),
                      h.DataAttribute('slider-input', ''),
                      h.Type('number'),
                      h.Value(model.draft),
                      h.Min(String(model.settings.min)),
                      h.Max(String(model.settings.max)),
                      h.Step(model.settings.steps.length > 1 ? 'any' : String(model.settings.step)),
                      h.AriaLabel(`Edit slider value${values.length > 1 ? endpoint : ''}`),
                      h.Style({ fontVariationSettings: fontWeights.normal }),
                    ]),
                  ],
                ),
              ],
            ),
          ],
        )
      : h.span(
          [h.DataAttribute('slider-edit', String(index)), h.Class('cursor-text select-none')],
          [format(value)],
        )
  }

  return h.span(
    [
      h.Class(
        'inline-grid shrink-0 text-[length:var(--fs-body,13px)] leading-none text-muted-foreground transition-[font-variation-settings] duration-100 tabular-nums',
      ),
      h.Style({
        fontVariationSettings:
          model.hovered || model.drag !== 'idle' ? fontWeights.semibold : fontWeights.normal,
      }),
    ],
    [
      ...ghostValues.map((ghost) =>
        h.span(
          [
            h.Class('col-start-1 row-start-1 invisible whitespace-nowrap'),
            h.AriaHidden(true),
            h.Style({ fontVariationSettings: fontWeights.semibold }),
          ],
          ghost,
        ),
      ),
      h.span(
        [h.Class('col-start-1 row-start-1 whitespace-nowrap')],
        [
          editing === null && hasLabel ? h.span([h.Class('text-muted-foreground')], [label]) : null,
          ...values.flatMap((value, index) => [
            index > 0 ? h.span([h.Class('mx-1 text-muted-foreground')], ['–']) : null,
            render(value, index),
          ]),
        ],
      ),
    ],
  ) satisfies Html
}

export const sliderBubble: <M, R>(
  value: number,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
  attributes: ReadonlyArray<Attribute<M> | ChildAttribute>,
  top: number,
  present: boolean,
  left?: number,
) => Html = function sliderBubble<M, R>(
  value: number,
  inputs: SliderViewInputs,
  h: HtmlBuilder<M, R>,
  attributes: ReadonlyArray<Attribute<M> | ChildAttribute>,
  top: number,
  present: boolean,
  left?: number,
) {
  const { shape, reducedMotion } = resolvePresentation(inputs)

  return inputs.animate(
    h.div(
      sourceStyleAttributes(
        {
          top: `${top}px`,
          ...(left === undefined ? {} : { left: `${left}px` }),
        },
        [h.Class('absolute -translate-x-1/2 pointer-events-none z-20'), ...attributes],
      ),
      [
        h.span(
          [
            h.Class(
              cn(
                'text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] text-background tabular-nums whitespace-nowrap bg-foreground px-2 py-1',
                shape.bg,
              ),
            ),
            h.Style({ fontVariationSettings: fontWeights.normal }),
          ],
          [(inputs.formatValue ?? String)(value)],
        ),
      ],
    ),
    {
      initial: { opacity: 0, y: 4 },
      animate: { opacity: present ? 1 : 0, y: present ? 0 : 4 },
      transition: present ? spring.fast : spring.fast.exit,
      reducedMotion,
    },
  ) satisfies Html
}

export const sliderCss: (
  style: Readonly<Record<string, string | number>> | undefined,
) => Record<string, string> = function sliderCss(
  style: Readonly<Record<string, string | number>> | undefined,
) {
  return cssStyle(style)
}

export interface SliderViewInputs extends Presentation {
  readonly label?: string
  readonly formatValue?: (value: number) => string
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly motionValues: (node: Html, state: SliderModel) => Html
}
