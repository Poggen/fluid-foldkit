import type { BarChartProps, BarLayer, BarProps, BarSquaresProps } from './options'
import { bklitYDomain, fixedYDomains } from '../cartesian/domains'
import { Schema } from 'effect'
import { scaleLinear } from 'd3-scale'
import type { Domains } from '../cartesian/state'

const isBarValue = Schema.is(Schema.Number)

export interface BarSeries {
  readonly kind: 'bar' | 'squares'
  readonly key: string
  readonly fill: string
  readonly index: number
  readonly yAxisId: string
  readonly bar?: BarProps
  readonly squares?: BarSquaresProps
}

export interface BarDatum<Row> {
  readonly category: string
  readonly series: string
  readonly value: number
  readonly index: number
  readonly seriesIndex: number
  readonly source: Row
}

export function flattenBarLayers<Row>(
  children: ReadonlyArray<BarLayer<Row>>,
): ReadonlyArray<BarLayer<Row>> {
  return children.flatMap((child): ReadonlyArray<BarLayer<Row>> =>
    child.kind === 'barDepthProvider'
      ? [
          { kind: 'barDepthProvider', props: { ...child.props, children: [] } },
          ...flattenBarLayers(child.props.children ?? []),
        ]
      : [child],
  )
}

export function resolveBarSeries<Row>(
  children: ReadonlyArray<BarLayer<Row>>,
): ReadonlyArray<BarSeries> {
  const layers = flattenBarLayers(children)
  return layers
    .flatMap((child): Array<Omit<BarSeries, 'index'>> => {
      if (child.kind === 'bar') {
        const bar = child.props
        return [
          {
            kind: 'bar',
            key: bar.dataKey,
            fill: bar.fill ?? 'var(--chart-line-primary)',
            yAxisId: barAxisId(bar.yAxisId),
            bar,
          },
        ]
      }
      if (child.kind === 'barSquares') {
        const squares = child.props
        return [
          {
            kind: 'squares',
            key: squares.dataKey,
            fill: squares.fill ?? 'var(--chart-line-primary)',
            yAxisId: barAxisId(squares.yAxisId),
            squares,
          },
        ]
      }
      return []
    })
    .map((item, index) => ({ ...item, index }))
}

export function buildBarData<Row extends Readonly<Record<string, unknown>>>(
  data: ReadonlyArray<Row>,
  xKey: string,
  series: ReadonlyArray<BarSeries>,
  missingValues?: 'gap',
): ReadonlyArray<BarDatum<Row>> {
  return data.flatMap((source, index) =>
    series.flatMap((item) => {
      const value = source[item.key]

      if (missingValues === 'gap' && (value === null || value === undefined)) return []

      return [
        {
          source,
          index,
          category: String(source[xKey]),
          series: item.key,
          seriesIndex: item.index,
          value: isBarValue(value) ? value : 0,
        },
      ]
    }),
  )
}

export function barValueDomain<Row>(
  datums: ReadonlyArray<BarDatum<Row>>,
  categories: ReadonlyArray<string>,
  stacked: boolean,
): readonly [number, number] {
  const values = stacked
    ? categories.map((category) =>
        datums
          .filter((datum) => datum.category === category && Number.isFinite(datum.value))
          .reduce((total, datum) => total + datum.value, 0),
      )
    : datums.map((datum) => datum.value)

  return bklitYDomain(values)
}

export const barAxisId = (id: string | number | undefined): string =>
  id === undefined || id === '' ? 'left' : String(id)

/** Original vertical Bar resolves each registered axis from its largest individual value, including stacked charts. */
export function barValueDomains<Row>(
  datums: ReadonlyArray<BarDatum<Row>>,
  categories: ReadonlyArray<string>,
  series: ReadonlyArray<BarSeries>,
  horizontal: boolean,
  stacked: boolean,
): Domains {
  if (horizontal) {
    return { left: barValueDomain(datums, categories, stacked) }
  }
  const domains = new Map<string, readonly [number, number]>()
  for (const id of new Set(series.map((item) => item.yAxisId))) {
    const keys = new Set(series.filter((item) => item.yAxisId === id).map((item) => item.key))
    let maximum = 0
    for (const datum of datums) {
      if (keys.has(datum.series) && Number.isFinite(datum.value) && datum.value > maximum) {
        maximum = datum.value
      }
    }
    const domain = scaleLinear()
      .domain([0, (maximum || 100) * 1.1])
      .nice()
      .domain()
    domains.set(id, [domain[0] ?? 0, domain[1] ?? 110])
  }
  if (!domains.has('left')) {
    domains.set('left', [0, 100])
  }
  return Object.fromEntries(domains)
}

/** Shared by native marks, public context and sibling square paint resources. */
export function configuredBarDomains<Row>(
  datums: ReadonlyArray<BarDatum<Row>>,
  categories: ReadonlyArray<string>,
  series: ReadonlyArray<BarSeries>,
  props: BarChartProps<Row>,
): Domains {
  const horizontal = props.orientation === 'horizontal'
  const axes = flattenBarLayers(props.children)
    .filter((child) => child.kind === 'yAxis')
    .map((child) => child.props)
  const fixed = fixedYDomains(axes, props.yDomain)
  const inferred = barValueDomains(datums, categories, series, horizontal, props.stacked === true)
  return horizontal ? { left: fixed.left ?? inferred.left ?? [0, 100] } : { ...inferred, ...fixed }
}
