import { DateTime } from 'effect'
import { createMark, defineChart } from '@tanstack/charts'
import type { DomChartDefinition } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleUtc } from 'd3-scale'
import type { ChartMargin } from './types'
import type { LiveRow } from './definition'
import { clampedOffset, edgeOpacity, Y_TICK_SPRING } from './live-yaxis'
import { bklitTheme } from './theme'

/** The y labels as their own chart (live-line-chart.tsx LiveYLabels says why): the same margins and native y axis as the line's chart, no series, focus or tooltip. */
export const buildLiveYAxisDefinition: (
  input: Readonly<LiveYAxisInput>,
) => DomChartDefinition<LiveRow, Date, number> = function buildLiveYAxisDefinition(
  input: Readonly<LiveYAxisInput>,
) {
  const definition = defineChart({
    marks: [
      createMark<LiveRow, Date, number>(() => ({
        id: 'live:ylabels-domain',
        channels: {},
        render: () => ({ nodes: [] }),
      })),
    ],
    scales: {
      x: {
        scale: scaleUtc().domain([
          DateTime.toDateUtc(DateTime.makeUnsafe(input.xDomain[0])),
          DateTime.toDateUtc(DateTime.makeUnsafe(input.xDomain[1])),
        ]),
        axis: { line: false, ticks: false, tickLabels: false },
      },
      y: {
        scale: scaleLinear().domain([input.yDomain[0], input.yDomain[1]]),
        side: input.yPosition,
        axis: {
          line: false,
          ticks: {
            values: input.yTicks,
            size: 0,
            padding: input.yLabelPad,
            format: (v: number) => input.formatValue(v),
          },
          tickLabels: {
            fontSize: 12,
            fontWeight: 400,
            fill: 'var(--chart-label)',

            thin: false,

            dy: ({ position }: { position: number }) =>
              Y_LABEL_DY + clampedOffset(position - input.margin.top, input.plotHeight),

            opacity: ({ value, position }: { value: number; position: number }) =>
              input.yLeaving.includes(value)
                ? 0
                : edgeOpacity(position - input.margin.top, input.plotHeight),

            motion: { transition: Y_TICK_SPRING },
          },
        },
      },
    },
    margin: input.margin,
    theme: bklitTheme,
    focus: false satisfies false,
    tooltip: false satisfies false,
  })

  return definition
}

const Y_LABEL_DY = 12.5

export interface LiveYAxisInput {
  readonly xDomain: readonly [number, number]
  readonly yDomain: readonly [number, number]
  readonly margin: ChartMargin
  readonly formatValue: (v: number) => string
  readonly yPosition: 'left' | 'right'
  readonly yTicks: ReadonlyArray<number>
  /** Ticks that left the set this frame: still drawn, fading out (live-line-chart.tsx LiveYLabels). */
  readonly yLeaving: ReadonlyArray<number>
  /** Gap between the y tick labels and the plot edge (shrunk when a label is wider than the margin). */
  readonly yLabelPad: number
  /** Plot height in px (y tick edge fade). */
  readonly plotHeight: number
}
