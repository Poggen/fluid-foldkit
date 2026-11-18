import type { Html, HtmlBuilder } from 'foldkit/html'
import type { LegendItemContextValue, LegendItemData } from './contexts'
import type { LegendContent } from './content'
import { legendChildren } from './content'
import { cn } from '../kit/classes'
import { hasLegendMaximum, legendProgressState } from './progress'
import type {
  LegendLabelProps,
  LegendMarkerProps,
  LegendProgressProps,
  LegendValueProps,
} from './options'

export const LegendMarker: <Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  context: LegendItemContextValue,
  props?: LegendMarkerProps,
) => Html = function LegendMarker<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  context: LegendItemContextValue,
  props: LegendMarkerProps = {},
) {
  return h.div([
    h.Class(
      cn(
        'bk-legend-marker [background-color:var(--bkm-legend-marker-color)]',
        props.className ?? 'bk-marker-size',
      ),
    ),
    h.Style({ '--bkm-legend-marker-color': context.item.color }),
  ]) satisfies Html
}

export const LegendLabel: <Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  context: LegendItemContextValue,
  props?: LegendLabelProps,
) => Html = function LegendLabel<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  context: LegendItemContextValue,
  props: LegendLabelProps = {},
) {
  return h.span(
    [h.Class(cn('bk-legend-fg', props.className ?? 'bk-text-sm bk-font-medium'))],
    [context.item.label],
  ) satisfies Html
}

export const LegendValue: <Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  context: LegendItemContextValue,
  props?: LegendValueProps,
) => Html = function LegendValue<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  context: LegendItemContextValue,
  props: LegendValueProps = {},
) {
  const format = props.formatValue ?? formatLegendValue
  const percentage = props.formatPercentage ?? ((value: number) => `${value.toFixed(0)}%`)

  return h.span(
    [h.Class(cn('bk-legend-value', props.className ?? 'bk-text-sm bk-tabular-nums'))],
    [
      h.span([], [format(context.item.value)]),
      ...(props.showPercentage === true && hasLegendMaximum(context.item.maxValue)
        ? [
            h.span(
              [h.Class(props.percentageClassName ?? 'bk-text-xs bk-tabular-nums')],
              [percentage(context.percentage)],
            ),
          ]
        : []),
    ],
  ) satisfies Html
}

/** Base UI's public DOM/accessibility contract; the native legend retains no second progress owner. */
export const legendProgress: <Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  item: LegendItemData,
  props: ProgressParts,
) => Html = function legendProgress<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  item: LegendItemData,
  props: ProgressParts,
) {
  const maximum = item.maxValue ?? 100
  const state = legendProgressState(item.value, maximum)
  const status = () => h.DataAttribute(state.status, '')

  const track = h.div(
    [h.Class(props.trackClassName), status()],
    [
      h.div([
        h.Class(
          [
            props.indicatorClassName,
            '[background-color:var(--bkm-legend-color)]',
            state.percentage === null
              ? ''
              : '[inset-inline-start:0] [height:inherit] [width:var(--bkm-legend-percentage)]',
          ]
            .filter(Boolean)
            .join(' '),
        ),
        status(),
        h.Style({
          '--bkm-legend-color': item.color,
          ...(state.percentage === null
            ? {}
            : { '--bkm-legend-percentage': `${state.percentage}%` }),
        }),
      ]),
    ],
  )

  return h.div(
    [
      h.Role('progressbar'),
      status(),
      h.Attribute('aria-valuemax', String(maximum)),
      h.Attribute('aria-valuemin', '0'),
      h.Attribute('aria-valuetext', state.ariaValueText),
      ...(state.value === null ? [] : [h.Attribute('aria-valuenow', String(state.value))]),
      ...(props.labelId === undefined
        ? [h.AriaLabel(item.label)]
        : [h.AriaLabelledBy(props.labelId)]),
      ...(props.rootClassName === undefined ? [] : [h.Class(props.rootClassName)]),
      ...(props.slot === undefined ? [] : [h.DataAttribute('slot', props.slot)]),
    ],
    [
      ...(props.children ?? []),
      ...(props.label === undefined
        ? []
        : [
            h.span(
              [
                h.Role('presentation'),
                status(),
                ...(props.labelId === undefined ? [] : [h.Id(props.labelId)]),
                h.Class(cn('bk-legend-fg', props.labelClassName ?? '')),
              ],
              [props.label],
            ),
          ]),
      ...(props.afterLabel ?? []),
      track,
      ...(props.after ?? []),
      h.span([h.Role('presentation'), h.Class(visuallyHiddenClasses)], ['x']),
    ],
  ) satisfies Html
}

export const LegendProgress: <Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  context: LegendItemContextValue,
  props?: LegendProgressProps,
) => Html = function LegendProgress<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  context: LegendItemContextValue,
  props: LegendProgressProps = {},
) {
  if (!hasLegendMaximum(context.item.maxValue)) {
    return h.empty satisfies Html
  }

  return legendProgress(h, context.item, {
    trackClassName: cn('bk-legend-track', props.height ?? 'bk-h-1-5', props.trackClassName ?? ''),
    indicatorClassName: cn('bk-legend-indicator', props.indicatorClassName ?? ''),
  }) satisfies Html
}

export const LegendItemComponent: <Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  context: LegendItemContextValue,
  messages: LegendRowMessages<Message>,
  props: { readonly className?: string; readonly children: LegendContent },
  key: string,
) => Html = function LegendItemComponent<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  context: LegendItemContextValue,
  messages: LegendRowMessages<Message>,
  props: { readonly className?: string; readonly children: LegendContent },
  key: string,
) {
  return h.keyed('div')(
    key,
    [
      h.Class(
        cn(
          'bk-legend-item bg-transparent',
          context.isHovered && 'bk-legend-item-hovered',
          props.className ?? '',
        ),
      ),
      h.DataAttribute('bkm-legend-index', String(context.index)),
      ...(context.isHovered ? [h.DataAttribute('hovered', '')] : []),
      h.OnMouseEnter(messages.pointer(context.index)),
      h.OnMouseLeave(messages.pointer(null)),
    ],
    legendChildren(props.children),
  ) satisfies Html
}

export const legendCssVars = {
  background: 'var(--legend)',
  foreground: 'var(--legend-foreground)',
  muted: 'var(--legend-muted)',
  mutedForeground: 'var(--legend-muted-foreground)',
  track: 'var(--legend-track)',
}

const integerFormat = new Intl.NumberFormat('en-US')

export const formatLegendValue: (value: number) => string = (value: number) =>
  integerFormat.format(value)

const visuallyHiddenClasses =
  '[clip-path:inset(50%)] overflow-hidden whitespace-nowrap border-0 p-0 [width:1px] [height:1px] fixed m-0 top-0 left-0'

export interface ProgressParts {
  readonly trackClassName: string
  readonly indicatorClassName: string
  readonly rootClassName?: string
  readonly label?: string
  readonly labelId?: string
  readonly labelClassName?: string
  readonly afterLabel?: ReadonlyArray<Html | string>
  readonly children?: ReadonlyArray<Html | string>
  readonly after?: ReadonlyArray<Html | string>
  readonly slot?: string
}

export interface LegendRowMessages<Message> {
  readonly pointer: (index: number | null) => Message
  readonly focus: (index: number | null) => Message
}
