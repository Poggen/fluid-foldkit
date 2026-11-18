import type { Html, HtmlBuilder } from 'foldkit/html'
import { chartLegendItemContext } from './contexts'
import type { LegendItemData } from './contexts'
import type { ChartLegendProps } from './options'
import { legendChildren } from './content'
import { cn } from '../kit/classes'
import { formatLegendValue, legendProgress } from './parts'
import type { LegendRowMessages } from './parts'

export const chartLegendRow: <Message, Mounts, Item extends LegendItemData>(
  h: HtmlBuilder<Message, Mounts>,
  id: string,
  item: Item,
  index: number,
  hoveredIndex: number | null,
  props: ChartLegendProps<Item>,
  messages: LegendRowMessages<Message>,
) => Html = function chartLegendRow<Message, Mounts, Item extends LegendItemData>(
  h: HtmlBuilder<Message, Mounts>,
  id: string,
  item: Item,
  index: number,
  hoveredIndex: number | null,
  props: ChartLegendProps<Item>,
  messages: LegendRowMessages<Message>,
) {
  const context = chartLegendItemContext(item, index, hoveredIndex)

  const common = [
    h.Id(`${id}-item-${index}`),
    h.Type('button'),
    h.AriaLabel(item.label),
    h.DataAttribute('bkm-legend-index', String(index)),
    ...(context.isHovered ? [h.DataAttribute('hovered', '')] : []),
    h.OnMouseEnter(messages.pointer(index)),
    h.OnMouseLeave(messages.pointer(null)),
    h.OnFocus(messages.focus(index)),
    h.OnBlur(messages.focus(null)),
  ]

  if (props.renderItem !== undefined) {
    return h.keyed('button')(
      `legend-${item.label}-${item.value}`,
      [
        h.Class(
          '[border:none] text-inherit [cursor:inherit] [font:inherit] [margin:0] [padding:0] [text-align:left]',
        ),
        ...common,
      ],
      legendChildren(props.renderItem(context)),
    ) satisfies Html
  }

  const marker =
    props.showMarker === false
      ? []
      : [
          h.div([
            h.Class(
              'bk-marker-size bk-legend-marker [background-color:var(--bkm-legend-marker-color)]',
            ),
            h.Style({ '--bkm-legend-marker-color': item.color }),
          ]),
        ]

  const format = props.formatValue ?? formatLegendValue
  const labelClass = props.labelClassName ?? 'bk-text-sm bk-font-medium'
  const valueClass = props.valueClassName ?? 'bk-text-sm bk-tabular-nums'

  const value =
    props.showValue === false
      ? []
      : [h.span([h.Class(cn('bk-legend-muted-fg', valueClass))], [format(item.value)])]

  const body =
    props.showProgress === true && (item.maxValue ?? 0) !== 0
      ? legendProgress(h, item, {
          rootClassName: 'bk-legend-progress',
          slot: 'legend-item',
          label: item.label,
          labelId: `${id}-progress-label-${index}`,
          labelClassName: labelClass,
          trackClassName: 'bk-legend-progress-track',
          indicatorClassName: 'bk-legend-indicator',
          children: marker,
          afterLabel: value,
          after:
            (props.showPercentage ?? props.showProgress)
              ? [
                  h.span(
                    [h.Class('bk-legend-progress-percent')],
                    [`${context.percentage.toFixed(0)}%`],
                  ),
                ]
              : [],
        })
      : h.div(
          [h.Class('bk-legend-row'), h.DataAttribute('slot', 'legend-item')],
          [
            ...marker,
            h.span([h.Class(cn('bk-legend-grow bk-legend-fg', labelClass))], [item.label]),
            ...value,
          ],
        )

  return h.keyed('button')(
    `legend-${item.label}-${item.value}`,
    [
      ...common,
      h.Class(
        [
          '[border:none] text-inherit [font:inherit] [margin:0] [text-align:left]',
          cn(
            'box-border cursor-pointer [border-radius:var(--radius,_0.5rem)] [padding-block:0.375rem] [padding-inline:0.5rem] bg-transparent [transition-property:all] [transition-timing-function:cubic-bezier(0,_0,_0.2,_1)] [transition-duration:150ms]',
            context.isHovered && '[background-color:var(--legend-muted)]',
            context.isFaded && 'bk-faded',
            props.itemClassName ?? '',
          ),
        ]
          .filter(Boolean)
          .join(' '),
      ),
    ],
    [body],
  ) satisfies Html
}
