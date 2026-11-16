import { inertHtml as h } from 'foldkit/html'
import type { ChartContent, ChartStyle } from './content-types'
import { chartChildren } from './content-types'
import { chartStyleText } from './style'
import { cn } from '../kit/classes'
export interface TooltipPanelProps {
  readonly className?: string
  readonly children?: ChartContent
  readonly panelStyle?: ChartStyle
  readonly backgroundColor?: string
}

export function TooltipPanel(props: TooltipPanelProps) {
  const hasBackground =
    props.backgroundColor !== undefined &&
    props.backgroundColor.trim() !== '' &&
    !Object.hasOwn(props.panelStyle ?? {}, 'backgroundColor')

  return h.div(
    [
      h.Class(
        cn(
          '[min-width:140px] overflow-hidden',
          hasBackground && '[background-color:var(--bkm-tooltip-panel-background)]',
          props.className ?? '',
        ),
      ),
      h.Attribute(
        'style',
        chartStyleText({
          ...(hasBackground ? { '--bkm-tooltip-panel-background': props.backgroundColor } : {}),
          ...props.panelStyle,
        }),
      ),
    ],
    chartChildren(props.children),
  )
}

export interface DateTickerProps {
  readonly currentIndex: number
  readonly labels: ReadonlyArray<string>
  readonly visible: boolean
}

export function DateTicker({ currentIndex, labels, visible }: DateTickerProps) {
  return !visible || labels.length === 0
    ? h.empty
    : h.div(
        [
          h.Class(
            'inline-block [border-radius:9999px] [padding:4px_16px] [font-size:14px] [font-weight:500] whitespace-nowrap [background:var(--chart-date-pill-background)] [color:var(--chart-date-pill-foreground)]',
          ),
        ],
        [labels[currentIndex] ?? labels[0] ?? ''],
      )
}

export interface MarkerTooltipItem {
  readonly title: string
  readonly description?: string
  readonly icon?: ChartContent
  readonly color?: string
  readonly content?: ChartContent
  readonly onClick?: () => void
  readonly href?: string
}

export interface MarkerTooltipContentProps {
  readonly markers: ReadonlyArray<MarkerTooltipItem>
}

export function MarkerTooltipContent({ markers }: MarkerTooltipContentProps) {
  if (markers.length === 0) {
    return h.empty
  }

  return h.div(
    [
      h.Class(
        '[margin-top:8px] flex flex-col [gap:8px] [padding-top:8px] [border-top:1px_solid_var(--chart-tooltip-muted,_var(--chart-foreground-muted))]',
      ),
    ],
    [
      ...markers.slice(0, 2).map((marker) =>
        h.div(
          [h.Class('flex [align-items:flex-start] [gap:8px]')],
          [
            h.div(
              [
                h.Class(
                  'flex [width:20px] [height:20px] shrink-0 items-center justify-center [border-radius:50%] [border:1px_solid_var(--chart-marker-border)] [background-color:var(--bkm-tooltip-marker-background)]',
                ),
                h.Style({
                  '--bkm-tooltip-marker-background':
                    marker.color === undefined || marker.color.trim() === ''
                      ? 'var(--chart-marker-background)'
                      : marker.color,
                }),
              ],
              [
                h.span(
                  [h.Class('[font-size:12px] [color:var(--chart-marker-foreground)]')],
                  chartChildren(marker.icon),
                ),
              ],
            ),
            h.div(
              [h.Class('min-w-0 [flex:1]')],
              marker.content === null || marker.content === undefined
                ? [
                    h.div(
                      [
                        h.Class(
                          'flex items-center [gap:6px] overflow-hidden [text-overflow:ellipsis] whitespace-nowrap [font-size:14px] [font-weight:500]',
                        ),
                      ],
                      [
                        marker.title,
                        ...(marker.onClick !== undefined ||
                        (marker.href !== undefined && marker.href.trim() !== '')
                          ? [
                              h.span(
                                [
                                  h.Class(
                                    '[font-size:10px] [color:var(--chart-tooltip-muted,_var(--chart-foreground-muted))]',
                                  ),
                                ],
                                ['↗'],
                              ),
                            ]
                          : []),
                      ],
                    ),
                    ...(marker.description === undefined || marker.description.trim() === ''
                      ? []
                      : [
                          h.div(
                            [
                              h.Class(
                                'overflow-hidden [text-overflow:ellipsis] whitespace-nowrap [font-size:12px] [color:var(--chart-tooltip-muted,_var(--chart-foreground-muted))]',
                              ),
                            ],
                            [marker.description],
                          ),
                        ]),
                  ]
                : chartChildren(marker.content),
            ),
          ],
        ),
      ),
      ...(markers.length > 2
        ? [
            h.div(
              [
                h.Class(
                  '[padding-left:28px] [font-size:12px] [color:var(--chart-tooltip-muted,_var(--chart-foreground-muted))]',
                ),
              ],
              [`+${markers.length - 2} more...`],
            ),
          ]
        : []),
    ],
  )
}
