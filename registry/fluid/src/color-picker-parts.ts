import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { fontWeights } from './lib/font-weight.js'
import type { ColorTooltipRenderer, ColorChannelTooltip } from './color-picker-tooltips.js'
import { displayColorNumber } from './color-number-locale.js'
import type { SliderViewInputs } from './slider-parts.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import type { MotionOptions } from './motion.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Option } from 'effect'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { cn } from './lib/utils.js'
import { cssStyle } from './lib/css-style.js'
import { nestedRadius } from './lib/shape.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { channelSpecs, colorParsed, currentFormat } from './color-picker-state.js'
import type { ColorState } from './color-picker-state.js'

export const CHECKER_BG = {
  backgroundImage:
    'conic-gradient(var(--checker-a) 0 25%, var(--checker-b) 0 50%, var(--checker-a) 0 75%, var(--checker-b) 0)',
  backgroundSize: '8px 8px',
}

export const swatchHairline = 'inset 0 0 0 1px rgba(127,127,127,0.25)'

export interface ColorTileProps extends Omit<Presentation, 'size'> {
  readonly color: string
  readonly size?: number
  readonly className?: string
  readonly style?: Readonly<Record<string, string | number>>
}

export function ColorTile<Message, R>(props: ColorTileProps, h: HtmlBuilder<Message, R>): Html {
  const context = props.context === undefined ? {} : { context: props.context }

  const { shape } = resolvePresentation(
    props.shape === undefined ? context : { ...context, shape: props.shape },
  )

  return h.span(
    [
      h.Class(cn('inline-block relative shrink-0 overflow-hidden', shape.bg, props.className)),
      h.Style({
        width: `${props.size ?? 24}px`,
        height: `${props.size ?? 24}px`,

        ...CHECKER_BG,
        boxShadow: swatchHairline,
        ...cssStyle(props.style),
      }),
    ],
    [h.span([h.Class('absolute inset-0'), h.Style({ backgroundColor: props.color })])],
  )
}

export interface ColorSwatchProps extends ColorTileProps {
  readonly selected?: boolean
  readonly hovered?: boolean
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

export function ColorSwatch<Message, R>(props: ColorSwatchProps, h: HtmlBuilder<Message, R>): Html {
  const context = props.context === undefined ? {} : { context: props.context }

  const { shape } = resolvePresentation(
    props.shape === undefined ? context : { ...context, shape: props.shape },
  )

  let ring = swatchHairline

  if (props.selected === true) {
    ring = `${swatchHairline}, 0 0 0 2px var(--background), 0 0 0 4px var(--fluid-accent, #6B97FF)`
  } else if (props.hovered === true) {
    ring = `${swatchHairline}, 0 0 0 2px var(--background), 0 0 0 4px rgba(127,127,127,0.4)`
  }

  return h.button(
    sourceStyleAttributes(
      props.style === undefined
        ? {
            width: `${props.size ?? 28}px`,
            height: `${props.size ?? 28}px`,

            ...CHECKER_BG,
            boxShadow: ring,
          }
        : cssStyle(props.style),
      [
        h.Class(
          cn(
            'relative shrink-0 overflow-hidden cursor-pointer outline-none transition-shadow duration-100',
            shape.bg,
            props.className,
          ),
        ),
        h.Type('button'),
        h.AriaLabel(`Select color ${props.color}`),
        h.AriaPressed(props.selected === true ? 'true' : 'false'),
        ...(props.attributes ?? []),
      ],
    ),
    [h.span([h.Class('absolute inset-0'), h.Style({ backgroundColor: props.color })])],
  )
}

export function saturationSquare<Message, R>(
  state: ColorState,
  props: Presentation,
  h: HtmlBuilder<Message, R>,
): Html {
  const context = props.context === undefined ? {} : { context: props.context }

  const { shape } = resolvePresentation(
    props.shape === undefined ? context : { ...context, shape: props.shape },
  )

  const radius = `${nestedRadius(shape.containerRadius, 12)}px`
  const parsed = colorParsed(state)

  return h.div(
    [
      h.Class(cn('relative w-full select-none touch-none cursor-none outline-none')),
      h.Role('application'),
      h.AriaLabel('Saturation and brightness'),
      h.Tabindex(0),
      h.DataAttribute('color-square', ''),
      h.Style({
        height: '156px',
        borderRadius: radius,
        boxShadow: state.squareFocused ? '0 0 0 2px var(--focus-ring, #6B97FF)' : 'none',
      }),
    ],
    [
      h.div([
        h.Class('absolute inset-0 overflow-hidden'),
        h.Style({
          borderRadius: radius,
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${state.hsv.h}, 100%, 50%))`,
        }),
      ]),
      h.div([
        h.Class(
          cn(
            `absolute pointer-events-none ${shape.variant === 'sharp' ? 'rounded-none' : 'rounded-full'}`,
          ),
        ),
        h.Style({
          left: `${state.hsv.s * 100}%`,
          top: `${(1 - state.hsv.v) * 100}%`,
          width: '18px',
          height: '18px',
          transform: 'translate(-50%, -50%)',
          border: '1px solid white',
          boxShadow: '0 0 0 1px rgba(0,0,0,1)',
          backgroundColor: `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`,
        }),
      ]),
      ...(state.squareHovered && Option.isNone(state.dragging) && Option.isSome(state.cursor)
        ? [
            h.div([
              h.Class(
                cn(
                  `absolute pointer-events-none ${shape.variant === 'sharp' ? 'rounded-none' : 'rounded-full'}`,
                ),
              ),
              h.Style({
                width: '18px',
                height: '18px',
                transform: 'translate(-50%, -50%)',
                border: '2px solid rgba(255, 255, 255, 0.55)',
                boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.2)',
                left: `${state.cursor.value.x}%`,
                top: `${state.cursor.value.y}%`,
              }),
            ]),
          ]
        : []),
    ],
  )
}

export function colorFields<Message, R>(
  state: ColorState,
  props: Presentation,
  h: HtmlBuilder<Message, R>,
  tooltip: ColorTooltipRenderer,
): Html {
  const { shape, size } = resolvePresentation(props)

  return h.div(
    [h.Class(currentFormat(state) === 'hex' ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-4 gap-1')],
    channelSpecs(state).map((spec) => {
      const editing = Option.getOrNull(state.editing) === spec.channel

      const display =
        spec.channel === 'hex'
          ? spec.value
          : displayColorNumber(spec.value, spec.percent, state.numberDisplay)

      const draft = editing ? (state.drafts[spec.channel] ?? display) : display

      return tooltip(
        `${state.id}-tooltip-${spec.channel}`,
        spec.label === 'Hex value' ? 'Hex' : spec.label,
        ({ div }) =>
          div(
            [],
            [
              h.div(
                [
                  h.DataAttribute('color-channel', spec.channel),
                  h.DataAttribute('editing', String(editing)),
                  h.Class(
                    cn(
                      'flex items-center bg-transparent hover:bg-hover active:bg-active transition-colors duration-80 focus-within:ring-1 focus-within:ring-[color:var(--focus-ring,#6B97FF)] select-none',
                      size.control,
                      shape.input,
                      spec.channel === 'hex' && 'px-2 pointer-coarse:px-1',
                    ),
                  ),
                ],
                spec.channel === 'hex'
                  ? [
                      h.span(
                        [h.Class(cn('text-muted-foreground mr-1 select-none', size.type.caption))],
                        ['#'],
                      ),
                      h.input([
                        h.Class(
                          cn(
                            'flex-1 min-w-0 bg-transparent text-foreground outline-none tabular-nums',
                            size.field,
                          ),
                        ),
                        h.Value(draft),
                        h.AriaLabel(spec.label),
                        h.InputMode('text'),
                        h.Style({ fontVariationSettings: fontWeights.normal }),
                      ]),
                    ]
                  : [
                      h.div(
                        [
                          h.Class(
                            cn(
                              'flex flex-1 min-w-0 items-center self-stretch px-2 pointer-coarse:px-1',
                              !editing && 'cursor-ew-resize',
                            ),
                          ),
                        ],
                        [
                          h.input([
                            h.Class(
                              cn(
                                'flex-1 min-w-0 bg-transparent text-foreground outline-none tabular-nums text-center',
                                size.field,
                                !editing && 'pointer-events-none',
                              ),
                            ),
                            h.Value(draft),
                            h.DataAttribute('color-draft', draft),
                            h.AriaLabel(spec.label),
                            h.Type('text'),
                            h.Autocomplete('off'),
                            h.Autocorrect('off'),
                            h.Spellcheck(false),
                            h.AriaRoleDescription('Number field'),
                            h.InputMode(spec.mode),
                            h.Style({ fontVariationSettings: fontWeights.normal }),
                          ]),
                          h.input([
                            h.Type('number'),
                            h.Value(String(Number(spec.value.replace(/%$/u, '')))),
                            ...(spec.wrap
                              ? []
                              : [h.Min(String(spec.min)), h.Max(String(spec.max))]),
                            h.Step(String(spec.step)),
                            h.AriaHidden(true),
                            h.Tabindex(-1),
                            h.Class(
                              '[clip-path:inset(50%)] overflow-hidden whitespace-nowrap [border:0px] p-0 w-px h-px m-0 fixed top-0 left-0',
                            ),
                          ]),
                        ],
                      ),
                    ],
              ),
            ],
          ),
      )
    }),
  )
}

export interface ColorPickerProps extends Presentation {
  readonly channelTooltip?: ColorChannelTooltip
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly portalContainerId?: string
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly sliderMotion: SliderViewInputs['motionValues']
  readonly highlightMotion: HoverHighlightViewInputs['animate']
}
