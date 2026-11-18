import { legendChildren } from './content'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { legendItemContext } from './contexts'
import type { LegendItemData } from './contexts'
import type { LegendItemProps, LegendProps, LegendPresentation } from './options'
import { chartLegendRow } from './chart-view'
import { cn } from '../kit/classes'
import {
  LegendItemComponent,
  LegendMarker,
  LegendLabel,
  LegendValue,
  LegendProgress,
} from './parts'
import type { LegendRowMessages } from './parts'

export const legendView: <Message, Mounts, Item extends LegendItemData>(
  h: HtmlBuilder<Message, Mounts>,
  id: string,
  items: ReadonlyArray<Item>,
  hoveredIndex: number | null,
  presentation: LegendPresentation<Item>,
  messages: LegendRowMessages<Message>,
  mounted: Parameters<HtmlBuilder<Message, Mounts>['div']>[0],
) => Html = function <Message, Mounts, Item extends LegendItemData>(
  h: HtmlBuilder<Message, Mounts>,
  id: string,
  items: ReadonlyArray<Item>,
  hoveredIndex: number | null,
  presentation: LegendPresentation<Item>,
  messages: LegendRowMessages<Message>,
  mounted: Parameters<HtmlBuilder<Message, Mounts>['div']>[0],
) {
  if (presentation.kind === 'profitLoss') {
    const alignment = {
      start: 'bk-justify-start',
      center: 'bk-justify-center',
      end: 'bk-justify-end',
    }

    return h.div(
      [
        h.Class(
          cn(
            'bk-pl-legend',
            alignment[presentation.props.align ?? 'start'],
            presentation.props.className,
          ),
        ),
      ],
      [
        legendView(
          h,
          id,
          items,
          hoveredIndex,
          {
            kind: 'composable',
            props: {
              className: 'bk-legend-inline',
              children: {
                className: 'bk-legend-item-flex',
                children: (_context, parts) => [
                  parts.marker({ className: 'bk-marker-size' }),
                  parts.label({ className: 'bk-text-xs' }),
                ],
              },
            },
          },
          messages,
          mounted,
        ),
      ],
    ) satisfies Html
  }

  const { props } = presentation
  const { title } = props
  const context = { items, hoveredIndex, setHoveredIndex: messages.pointer }

  const itemRow: (index: number, itemProps: LegendItemProps<Item>) => Html = (
    index: number,
    itemProps: LegendItemProps<Item>,
  ) => {
    const item = items[index]

    if (item === undefined || !Number.isInteger(index)) {
      return h.empty
    }

    const itemContext = legendItemContext(item, index, hoveredIndex)
    const { className } = itemProps

    const children = itemProps.children(
      itemContext,
      {
        marker: (partProps) => LegendMarker(h, itemContext, partProps),
        label: (partProps) => LegendLabel(h, itemContext, partProps),
        value: (partProps) => LegendValue(h, itemContext, partProps),
        progress: (partProps) => LegendProgress(h, itemContext, partProps),
      },
      context,
      h,
    )

    return LegendItemComponent(
      h,
      itemContext,
      messages,
      className === undefined ? { children } : { className, children },
      item.label,
    )
  }

  const composableRows = (children: LegendProps<Item>['children']) => {
    if ('children' in children) {
      return items.map((_item, index) => itemRow(index, children))
    }

    return legendChildren(children(context, itemRow, h))
  }

  const rows =
    presentation.kind === 'chart'
      ? items.map((item, index) =>
          chartLegendRow(h, id, item, index, hoveredIndex, presentation.props, messages),
        )
      : composableRows(presentation.props.children)

  return h.div(
    [
      ...mounted,
      h.Id(id),
      h.DataAttribute('bkm-legend-owner', id),
      h.Class(cn('legend-container bk-legend', props.className ?? '')),
      ...(hoveredIndex === null ? [] : [h.DataAttribute('hovered-any', '')]),
      ...(presentation.kind === 'chart' ? [h.DataAttribute('slot', 'legend')] : []),
    ],
    [
      ...(title === undefined || title === ''
        ? []
        : [
            h.h3(
              [
                h.Class(
                  cn('bk-legend-title', props.titleClassName ?? 'bk-text-sm bk-font-semibold'),
                ),
              ],
              [title],
            ),
          ]),
      ...rows,
    ],
  ) satisfies Html
}
