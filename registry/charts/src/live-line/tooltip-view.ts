import { DateTime } from 'effect'
import { inertHtml as h } from 'foldkit/html'
import { chartChildren } from '../cartesian/content-types'
import { TooltipContent } from '../cartesian/tooltip-view'
import type { Momentum } from './momentum'
import type { LiveLineChartProps, LiveLineTooltipDatum } from './options'
import { defaultFormatTime, defaultFormatValue } from './live-format'

export interface LiveTooltipValue {
  readonly time: number
  readonly value: number
  readonly x: number
  readonly y: number
  readonly pinned: boolean
}

export function liveTooltipView(
  props: LiveLineChartProps,
  value: LiveTooltipValue | null,
  id: string,
  momentum?: Momentum,
) {
  const config = props.children.find((c) => c.kind === 'tooltip')?.props
  const line = props.children.find((c) => c.kind === 'liveLine')?.props
  const xAxis = props.children.find((c) => c.kind === 'liveXAxis')?.props
  const format = line?.formatValue ?? defaultFormatValue
  const time = xAxis?.formatTime ?? defaultFormatTime
  const key = line?.dataKey ?? props.dataKey ?? 'value'

  return h.div(
    [
      h.Id(`${id}-tooltip`),
      h.Class(
        'ts-chart-tooltip absolute bottom-auto m-0 max-w-none p-0 border-none rounded-none bg-transparent text-inherit shadow-none [font:inherit] pointer-events-none [overflow-wrap:anywhere] select-none data-[sticky=true]:pointer-events-auto data-[sticky=true]:select-text right-auto w-max z-[1] left-[var(--bkm-tooltip-left)] top-[var(--bkm-tooltip-top)]',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'ts-chart-tooltip__body min-w-[140px] overflow-hidden rounded-lg text-chart-tooltip-foreground shadow-lg bg-chart-tooltip-background backdrop-blur-md',
          ),
        ],
        value === null
          ? []
          : chartChildren(
              config?.content !== undefined
                ? config.content({
                    point: {
                      date: DateTime.toDateUtc(DateTime.makeUnsafe(value.time)),
                      time: value.time / 1000,
                      [key]: value.value,
                      value: value.value,
                    } satisfies LiveLineTooltipDatum,
                    index: 0,
                  })
                : TooltipContent({
                    title: time(value.time),
                    rows: [
                      {
                        label: key,
                        value: format(value.value),
                        color:
                          (momentum === undefined ? undefined : line?.momentumColors?.[momentum]) ??
                          line?.stroke ??
                          'var(--chart-line-primary)',
                      },
                    ],
                  }),
            ),
      ),
    ],
  )
}
