// Data and authored examples derived from toomingos/bklit-tanstack-charts-migration. MIT.
import { DateTime, Schema } from 'effect'
import { Block } from 'foldkit'
import {
  LineChart,
  AreaChart,
  LineChartLoading,
  AreaChartLoading,
  Line,
  Area,
  Grid,
  XAxis,
  ChartTooltip,
  ChartMarkers,
  BarChartLoading,
} from '@foldkit-visuals/charts/line'
import { BarChart, Bar, BarXAxis } from '@foldkit-visuals/charts/bar'
import {
  HeatmapChart,
  HeatmapChartLoading,
  HeatmapCells,
  HeatmapXAxis,
  HeatmapYAxis,
  HeatmapTooltip,
} from '@foldkit-visuals/charts/heatmap'
import type { TimeSeriesProps } from '@foldkit-visuals/charts/line'
import type { BarChartProps } from '@foldkit-visuals/charts/bar'
import type { HeatmapChartProps } from '@foldkit-visuals/charts/heatmap'
import captured from './chart-scene-data.json' with { type: 'json' }
export const LineRow = Schema.Struct({
  date: Schema.DateFromString,
  users: Schema.Finite,
  pageviews: Schema.Finite,
})
export const AreaRow = Schema.Struct({
  date: Schema.DateFromString,
  revenue: Schema.Finite,
  costs: Schema.Finite,
})
export const BarRow = Schema.Struct({
  month: Schema.String,
  revenue: Schema.Finite,
  profit: Schema.Finite,
})
// The source's time-relative fixtures are captured once, keeping SSR and hydration deterministic.
export const lineData = captured.line.map((row) =>
  LineRow.make({ ...row, date: DateTime.toDateUtc(DateTime.makeUnsafe(row.date)) }),
)
export const areaData = captured.area.map((row) =>
  AreaRow.make({ ...row, date: DateTime.toDateUtc(DateTime.makeUnsafe(row.date)) }),
)
export const barData = captured.bar
export const heatData = captured.heatmap.map((column) => ({
  ...column,
  bins: column.bins.map((bin) => ({
    ...bin,
    date: DateTime.toDateUtc(DateTime.makeUnsafe(bin.date)),
  })),
}))
export const line = LineChart({ name: 'authored-line', Row: LineRow })
export const area = AreaChart({ name: 'authored-area', Row: AreaRow })
export const bar = BarChart({ name: 'authored-bar', Row: BarRow })
export const heat = HeatmapChart({ name: 'authored-heat' })
export const lineLoading = LineChartLoading('authored-line-placeholder', { aspectRatio: '2/1' })
export const areaLoading = AreaChartLoading('authored-area-placeholder', { aspectRatio: '2/1' })
export const barLoading = BarChartLoading('authored-bar-placeholder', { aspectRatio: '2/1' })
const lineKey = Symbol('AuthoredLine'),
  areaKey = Symbol('AuthoredArea'),
  barKey = Symbol('AuthoredBar'),
  heatKey = Symbol('AuthoredHeat')
const lineLoadingKey = Symbol('AuthoredLineLoading'),
  areaLoadingKey = Symbol('AuthoredAreaLoading'),
  barLoadingKey = Symbol('AuthoredBarLoading')
export const LineBlock = Block.make(line.namespace, { ...line.contract, key: lineKey })
export const AreaBlock = Block.make(area.namespace, { ...area.contract, key: areaKey })
export const BarBlock = Block.make(bar.namespace, { ...bar.contract, key: barKey })
export const HeatBlock = Block.make(heat.namespace, { ...heat.contract, key: heatKey })
export const LineLoadingBlock = Block.make(lineLoading.namespace, {
  ...lineLoading.contract,
  key: lineLoadingKey,
})
export const AreaLoadingBlock = Block.make(areaLoading.namespace, {
  ...areaLoading.contract,
  key: areaLoadingKey,
})
export const BarLoadingBlock = Block.make(barLoading.namespace, {
  ...barLoading.contract,
  key: barLoadingKey,
})
const lineCache = new Map<string, TimeSeriesProps<typeof LineRow.Type>>()
const areaCache = new Map<string, TimeSeriesProps<typeof AreaRow.Type>>()
const barCache = new Map<boolean, BarChartProps<typeof BarRow.Type>>()
const heatCache = new Map<boolean, HeatmapChartProps>()
export const lineProps = (loading: boolean, sweep: boolean) => {
  const key = `${loading}:${sweep}`,
    previous = lineCache.get(key)
  if (previous !== undefined) return previous
  const props: TimeSeriesProps<typeof LineRow.Type> = {
    aspectRatio: '2/1',
    status: loading ? 'loading' : 'ready',
    children: [
      Grid({ horizontal: true }),
      Line({
        dataKey: 'users',
        stroke: 'var(--chart-line-primary)',
        loadingStyle: sweep ? 'sweep' : 'pulse',
      }),
      Line({
        dataKey: 'pageviews',
        stroke: 'var(--chart-line-secondary)',
        loadingStyle: sweep ? 'sweep' : 'pulse',
      }),
      XAxis(),
      ChartTooltip(),
      ChartMarkers({
        items: captured.markers.map((marker) => ({
          ...marker,
          date: DateTime.toDateUtc(DateTime.makeUnsafe(marker.date)),
          target: marker.target === '_blank' ? '_blank' : '_self',
        })),
      }),
    ],
  }
  lineCache.set(key, props)
  return props
}
export const areaProps = (loading: boolean, sweep: boolean) => {
  const key = `${loading}:${sweep}`,
    previous = areaCache.get(key)
  if (previous !== undefined) return previous
  const props: TimeSeriesProps<typeof AreaRow.Type> = {
    aspectRatio: '2/1',
    status: loading ? 'loading' : 'ready',
    children: [
      Grid({ horizontal: true }),
      Area({
        dataKey: 'revenue',
        fill: 'var(--chart-line-primary)',
        fillOpacity: 0.3,
        fadeEdges: true,
        loadingStyle: sweep ? 'sweep' : 'pulse',
      }),
      Area({
        dataKey: 'costs',
        fill: 'var(--chart-line-secondary)',
        fillOpacity: 0.3,
        fadeEdges: true,
        loadingStyle: sweep ? 'sweep' : 'pulse',
      }),
      XAxis(),
      ChartTooltip(),
    ],
  }
  areaCache.set(key, props)
  return props
}
export const barProps = (loading: boolean) => {
  const previous = barCache.get(loading)
  if (previous !== undefined) return previous
  const props: BarChartProps<typeof BarRow.Type> = {
    xDataKey: 'month',
    aspectRatio: '2/1',
    status: loading ? 'loading' : 'ready',
    children: [
      Grid({ horizontal: true }),
      Bar({ dataKey: 'revenue', fill: 'var(--chart-line-primary)', lineCap: 'round' }),
      Bar({ dataKey: 'profit', fill: 'var(--chart-line-secondary)', lineCap: 'round' }),
      BarXAxis(),
      ChartTooltip(),
    ],
  }
  barCache.set(loading, props)
  return props
}
export const heatProps = (loading: boolean) => {
  const previous = heatCache.get(loading)
  if (previous !== undefined) return previous
  const props: HeatmapChartProps = {
    data: heatData,
    layout: 'fluid',
    status: loading ? 'loading' : 'ready',
    children: [
      HeatmapCells({ inactiveOpacity: 1, inactiveScale: 1 }),
      HeatmapXAxis(),
      HeatmapYAxis(),
      HeatmapTooltip({ instant: true }),
    ],
  }
  heatCache.set(loading, props)
  return props
}
export const heatPlaceholder = HeatmapChartLoading({ data: heatData, className: 'w-full' })
export const loadingScenes = [
  { key: 'pulse', title: 'Loading state', sweep: false },
  { key: 'sweep', title: 'Sweep loading style', sweep: true },
] as const
