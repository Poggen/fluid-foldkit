import { createMark } from '@tanstack/charts'
import { barFrontClass, barFrontTargetCss } from './front-precision'
import type { BarFrontRect } from './front-precision'
import type { ChartPoint } from '@tanstack/charts'
import type { ScaleBand } from 'd3-scale'
import type { YScaleId } from '../cartesian/build-state'
import { yScaleForAxis } from '../cartesian/build-state'
import { scaleAt } from './marks'
import { projectBarFrame } from './geometry'
import type { BarSeries, BarDatum } from './model'
import type { BarMark, BarValue } from './definition'

interface NativeBarInputs<Row> {
  readonly id: string
  readonly onProjected: (css: string) => void
  readonly bars: ReadonlyArray<BarSeries>
  readonly series: ReadonlyArray<BarSeries>
  readonly datums: ReadonlyArray<BarDatum<Row>>
  readonly categoryBand: ScaleBand<string>
  readonly bandWidth: number
  readonly stacked: boolean
  readonly horizontal: boolean
  readonly loading: boolean
}

const pointPosition = (
  frame: ReturnType<typeof projectBarFrame>,
  end: number,
  horizontal: boolean,
) =>
  horizontal ? { x: end, y: frame.y + frame.height / 2 } : { x: frame.x + frame.width / 2, y: end }

export function nativeBarMarks<Row>(input: NativeBarInputs<Row>) {
  const { bars, series, datums, horizontal, stacked, loading, categoryBand } = input
  const fills = new Map(series.map((item) => [item.key, item.fill]))
  const byKey = new Map(series.map((item) => [item.key, item]))
  const rows = datums.filter((datum) => byKey.get(datum.series)?.kind === 'bar')
  const offsets = new Map<BarDatum<Row>, number>()
  const positive = new Map<number, number>()
  const negative = new Map<number, number>()

  for (const datum of datums) {
    const totals = horizontal && datum.value < 0 ? negative : positive
    const previous = totals.get(datum.index) ?? 0
    offsets.set(datum, previous)
    totals.set(datum.index, previous + (Number.isFinite(datum.value) ? datum.value : 0))
  }

  const mark = createMark<BarDatum<Row>, BarValue, BarValue, 'x', YScaleId>(() => ({
    id: 'bars',
    motion: false,
    channels: {
      color: { scale: 'color', values: rows.map((datum) => datum.series) },
      ...(horizontal
        ? {
            x: { scale: 'x', includeZero: true, values: rows.map((datum) => datum.value) },
            y: { scale: 'y', values: rows.map((datum) => datum.category) },
          }
        : {
            x: { scale: 'x', values: rows.map((datum) => datum.category) },
            ...Object.fromEntries(
              [...new Set(series.map((item) => item.yAxisId))].map((id) => [
                yScaleForAxis(id).yScale,
                {
                  scale: yScaleForAxis(id).yScale,
                  includeZero: true,
                  values: rows
                    .filter((datum) => byKey.get(datum.series)?.yAxisId === id)
                    .map((datum) => datum.value),
                },
              ]),
            ),
          }),
    },
    render: ({ scales, chart }) => {
      const category = scaleAt(scales, horizontal ? 'y' : 'x')
      const nodes: Array<BarFrontRect> = []
      const points: Array<ChartPoint<BarDatum<Row>, BarValue, BarValue>> = []

      if (category === undefined) {
        input.onProjected('')

        return { nodes, points }
      }

      for (const [datumIndex, datum] of rows.entries()) {
        const item = byKey.get(datum.series)

        if (item?.bar === undefined || !Number.isFinite(datum.value)) {
          continue
        }

        const valueScale = scaleAt(scales, horizontal ? 'x' : yScaleForAxis(item.yAxisId).yScale)

        if (valueScale === undefined) {
          continue
        }

        const value = loading ? 0 : datum.value
        const offset = stacked && !loading ? (offsets.get(datum) ?? 0) : 0

        const frame = projectBarFrame({
          value,
          offset,
          index: item.index,
          count: Math.max(1, series.length),
          bandStart: category.map(datum.category) - category.bandwidth / 2,
          bandwidth: input.bandWidth,
          step: categoryBand.step(),
          innerLeft: chart.x,
          innerTop: chart.y,
          innerWidth: chart.width,
          innerHeight: chart.height,
          horizontal,
          stacked,
          scale: (number) => valueScale.map(number),
          options: item.bar,
        })

        const key = `bars:${datum.index}:${datum.series}`
        const color = fills.get(datum.series) ?? 'var(--chart-line-primary)'
        const end = valueScale.map(offset + value)

        const interval: Pick<
          ChartPoint<BarDatum<Row>, BarValue, BarValue>,
          'x1Value' | 'x2Value' | 'xInterval' | 'y1Value' | 'y2Value' | 'yInterval'
        > = horizontal
          ? { x1Value: offset, x2Value: offset + value, xInterval: 'difference' }
          : { y1Value: offset, y2Value: offset + value, yInterval: 'difference' }

        const point: ChartPoint<BarDatum<Row>, BarValue, BarValue> = {
          key,
          markId: 'bars',
          group: datum.series,
          groupLabel: datum.series,
          datum,
          datumIndex,
          xValue: horizontal ? datum.value : datum.category,
          yValue: horizontal ? datum.category : datum.value,
          ...interval,
          ...pointPosition(frame, end, horizontal),
          color,
        }

        points.push(point)

        if (frame.painted) {
          nodes.push({
            kind: 'rect',
            key,
            className: barFrontClass(input.id, key),
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: frame.height,
            radius: frame.radius,
            interaction: { point, affinity: horizontal ? 'y' : 'x' },
            style: { fill: color },
          })
        }
      }

      input.onProjected(barFrontTargetCss(nodes))

      return {
        nodes: [
          {
            kind: 'group',
            key: 'bars',
            className: `ts-chart__bar ts-chart__bar-${horizontal ? 'x' : 'y'}`,
            ariaHidden: true,
            children: nodes,
          },
        ],
        points,
      }
    },
  }))

  const nativeBars: ReadonlyArray<BarMark<Row>> = bars.length === 0 ? [] : [mark]

  return { nativeBars }
}
