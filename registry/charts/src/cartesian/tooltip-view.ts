import { inertHtml as h } from 'foldkit/html'
import type { ChartContent } from './content-types'
import { chartChildren } from './content-types'
import { chartStyleProperties } from './style'
import { cn } from '../kit/classes'
import type { ChartTooltipProps } from './tooltip-options'

export interface TooltipRow {
  readonly color: string
  readonly label: string
  readonly value: string | number
}

export interface TooltipContentProps {
  readonly title?: string
  readonly rows: ReadonlyArray<TooltipRow>
  readonly children?: ChartContent
  readonly className?: string
}

export function TooltipContent({ title, rows, children, className }: TooltipContentProps) {
  const format = new Intl.NumberFormat('en-US')

  return h.div(
    [h.Class(cn('[min-width:140px] [padding:10px_12px] [font-size:14px]', className ?? ''))],
    [
      ...(title === undefined || title.trim() === ''
        ? []
        : [
            h.div(
              [
                h.Class(
                  '[font-size:12px] [line-height:16px] [font-weight:500] [margin-bottom:8px] [text-align:left]',
                ),
              ],
              [title],
            ),
          ]),
      h.div(
        [h.Class('flex flex-col [gap:6px]')],
        rows.map((row) =>
          h.div(
            [h.Class('flex items-center [justify-content:space-between] [gap:16px]')],
            [
              h.span(
                [h.Class('flex items-center [gap:8px]')],
                [
                  h.span([
                    h.Class(
                      '[width:10px] [height:10px] shrink-0 [border-radius:50%] [background:var(--bkm-tooltip-row-color)]',
                    ),
                    h.Style({ '--bkm-tooltip-row-color': row.color }),
                  ]),
                  h.span(
                    [
                      h.Class(
                        '[color:var(--chart-tooltip-muted,_var(--chart-foreground-muted))] [line-height:20px]',
                      ),
                    ],
                    [row.label],
                  ),
                ],
              ),
              h.span(
                [
                  h.Class(
                    '[font-variant-numeric:tabular-nums] [font-weight:500] [line-height:20px]',
                  ),
                ],
                [typeof row.value === 'number' ? format.format(row.value) : row.value],
              ),
            ],
          ),
        ),
      ),
      ...(!children ? [] : [h.div([h.Class('[margin-top:8px]')], chartChildren(children))]),
    ],
  )
}

const dateValue = (value: Date | string): Date | undefined =>
  typeof value === 'string' ? undefined : value

export function tooltipView<Row extends Readonly<Record<string, unknown>>>(
  id: string,
  data: ReadonlyArray<Row>,
  index: number | null,
  tooltip: ChartTooltipProps<Row> | undefined,
  rows: (row: Row) => ReadonlyArray<TooltipRow>,
  x: (row: Row) => Date | string,
  ready: boolean,
) {
  const row = index === null ? undefined : data[index]
  const { ['transform-origin']: declaredOrigin, ...panelStyle } = chartStyleProperties({
    ...tooltip?.panelStyle,
  })
  const origin = Object.hasOwn(tooltip?.panelStyle ?? {}, 'transformOrigin')
    ? (declaredOrigin ?? '')
    : undefined

  const content =
    row === undefined || tooltip === undefined
      ? h.empty
      : tooltip.content === undefined
        ? TooltipContent({
            title:
              typeof x(row) === 'string'
                ? String(x(row))
                : new Intl.DateTimeFormat('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  }).format(dateValue(x(row))),
            rows: tooltip.rows?.(row) ?? rows(row),
            ...(tooltip.children === undefined ? {} : { children: tooltip.children }),
          })
        : tooltip.content({ point: row, index: index ?? 0 })

  return h.div(
    [h.Class('contents')],
    [
      h.div(
        [
          h.Id(id),
          h.Class(
            [
              'ts-chart-tooltip absolute z-[50] max-w-none p-0 border-none rounded-none bg-transparent text-inherit shadow-none [font:inherit] pointer-events-none [overflow-wrap:anywhere] select-none data-[sticky=true]:pointer-events-auto data-[sticky=true]:select-text',
              ready ? '' : 'invisible!',
              tooltip?.className ?? '',
            ]
              .filter(Boolean)
              .join(' '),
          ),
        ],
        [
          h.div(
            [
              h.Class(
                cn(
                  'ts-chart-tooltip__body min-w-[140px] overflow-hidden rounded-lg text-chart-tooltip-foreground shadow-lg',
                  !Object.hasOwn(tooltip?.panelStyle ?? {}, 'backgroundColor') &&
                    (tooltip?.backgroundColor === undefined ||
                      tooltip.backgroundColor === 'var(--chart-tooltip-background)') &&
                    'bg-chart-tooltip-background',
                  !Object.hasOwn(tooltip?.panelStyle ?? {}, 'backdropFilter') && 'backdrop-blur-md',
                  tooltip?.backgroundColor !== undefined &&
                    tooltip.backgroundColor.trim() !== '' &&
                    !Object.hasOwn(tooltip.panelStyle ?? {}, 'backgroundColor') &&
                    '[background-color:var(--bkm-tooltip-panel-background)]',
                ),
              ),
              h.Style({
                ...(tooltip?.backgroundColor === undefined
                  ? {}
                  : { '--bkm-tooltip-panel-background': tooltip.backgroundColor }),
                ...panelStyle,
              }),
              ...(panelStyle.opacity === undefined
                ? []
                : [h.Attribute('data-bkm-tooltip-opacity', panelStyle.opacity)]),
              ...(panelStyle.transform === undefined
                ? []
                : [h.Attribute('data-bkm-tooltip-transform', panelStyle.transform)]),
              ...(origin === undefined
                ? []
                : [h.Attribute('data-bkm-tooltip-transform-origin', origin)]),
            ],
            chartChildren(content),
          ),
        ],
      ),
    ],
  )
}
