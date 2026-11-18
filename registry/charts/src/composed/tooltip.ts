import { resolveSeries } from '../cartesian/series'
import { toNumber } from '../cartesian/domains'
import type { TooltipRow } from '../cartesian/tooltip-view'
import type { ComposedChartProps } from './options'

/** Source keeps the first declared slot and lets the bar's color override its shared key. */
export const composedTooltipRows: <Row extends Readonly<Record<string, unknown>>>(
  children: ComposedChartProps<Row>['children'],
) => (row: Row) => ReadonlyArray<TooltipRow> = function composedTooltipRows<
  Row extends Readonly<Record<string, unknown>>,
>(children: ComposedChartProps<Row>['children']) {
  const order = [
    ...new Set(
      children.flatMap((child) =>
        child.kind === 'line' || child.kind === 'area' || child.kind === 'seriesBar'
          ? [child.props.dataKey]
          : [],
      ),
    ),
  ]
  const colors = new Map(
    resolveSeries(children.filter((child) => child.kind !== 'seriesBar')).map((series) => [
      series.dataKey,
      series.stroke,
    ]),
  )

  for (const child of children) {
    if (child.kind === 'seriesBar') {
      colors.set(
        child.props.dataKey,
        child.props.stroke ?? child.props.fill ?? 'var(--chart-line-primary)',
      )
    }
  }

  return ((row) =>
    order.map((key) => ({
      color: colors.get(key) ?? 'var(--chart-line-primary)',
      label: key,
      value: toNumber(row[key]),
    }))) satisfies (row: Row) => ReadonlyArray<TooltipRow>
}
