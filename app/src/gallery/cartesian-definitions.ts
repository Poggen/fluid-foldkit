import type { BarChartProps } from '@foldkit-visuals/charts/bar'
import {
  Bar,
  BarChart,
  Grid as BarGrid,
  ChartTooltip as BarTooltip,
  BarXAxis,
} from '@foldkit-visuals/charts/bar'
import { Candlestick, CandlestickChart } from '@foldkit-visuals/charts/candlestick'
import { ComposedChart, SeriesBar } from '@foldkit-visuals/charts/composed'
import type { TimeSeriesProps } from '@foldkit-visuals/charts/line'
import {
  Area,
  AreaChart,
  ChartTooltip,
  Grid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from '@foldkit-visuals/charts/line'
import { Scatter, ScatterChart } from '@foldkit-visuals/charts/scatter'
import { DateTime, Schema } from 'effect'
import { Block } from 'foldkit'

export const Row = Schema.Struct({
  date: Schema.DateFromString,
  name: Schema.String,
  revenue: Schema.Finite,
  cost: Schema.Finite,
  open: Schema.Finite,
  high: Schema.Finite,
  low: Schema.Finite,
  close: Schema.Finite,
  volume: Schema.Finite,
})
export const data = [42, 48, 44, 64, 57, 72, 69, 84, 75, 91, 86, 98].map((revenue, index) =>
  Row.make({
    date: DateTime.toDateUtc(
      DateTime.makeUnsafe(`2026-01-${String(index + 1).padStart(2, '0')}T00:00:00Z`),
    ),
    name:
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index] ??
      '',
    revenue,
    cost: revenue * 0.55,
    open: revenue - 3,
    high: revenue + 9,
    low: revenue - 8,
    close: revenue + 5,
    volume: 120 + index * 13,
  }),
)
export const line = LineChart({ name: 'showcase-line', Row })
export const area = AreaChart({ name: 'showcase-area', Row })
export const bar = BarChart({ name: 'showcase-bar', Row })
export const composed = ComposedChart({ name: 'showcase-composed', Row })
export const scatter = ScatterChart({ name: 'showcase-scatter', Row })
export const candle = CandlestickChart({ name: 'showcase-candle', Row })
const lineKey = Symbol('ShowcaseLine')
const areaKey = Symbol('ShowcaseArea')
const barKey = Symbol('ShowcaseBar')
const composedKey = Symbol('ShowcaseComposed')
const scatterKey = Symbol('ShowcaseScatter')
const candleKey = Symbol('ShowcaseCandle')
export const LineBlock = Block.make(line.namespace, { ...line.contract, key: lineKey })
export const AreaBlock = Block.make(area.namespace, { ...area.contract, key: areaKey })
export const BarBlock = Block.make(bar.namespace, { ...bar.contract, key: barKey })
export const ComposedBlock = Block.make(composed.namespace, {
  ...composed.contract,
  key: composedKey,
})
export const ScatterBlock = Block.make(scatter.namespace, { ...scatter.contract, key: scatterKey })
export const CandleBlock = Block.make(candle.namespace, { ...candle.contract, key: candleKey })
export const lineProps = {
  height: 210,
  xDataKey: 'date',
  children: [
    Grid(),
    Line({ dataKey: 'revenue', stroke: 'var(--fluid-accent)', fadeEdges: false }),
    XAxis(),
    ChartTooltip(),
  ],
} satisfies TimeSeriesProps<typeof Row.Type>
export const areaProps = {
  height: 210,
  xDataKey: 'date',
  children: [
    Grid(),
    Area({ dataKey: 'revenue', fill: 'var(--fluid-accent)' }),
    XAxis(),
    ChartTooltip(),
  ],
} satisfies TimeSeriesProps<typeof Row.Type>
export const barProps = {
  height: 210,
  xDataKey: 'name',
  children: [
    BarGrid(),
    Bar({ dataKey: 'revenue', fill: 'var(--fluid-accent)' }),
    BarXAxis(),
    BarTooltip(),
  ],
} satisfies BarChartProps<typeof Row.Type>
export const composedProps = {
  height: 210,
  x: (row: typeof Row.Type) => row.date,
  children: [
    Grid(),
    SeriesBar({ dataKey: 'cost', fill: 'var(--fluid-accent)' }),
    Line({ dataKey: 'revenue', stroke: 'var(--foreground)', fadeEdges: false }),
    XAxis(),
    ChartTooltip(),
  ],
}
export const scatterProps = {
  height: 210,
  children: [
    Grid(),
    Scatter({ dataKey: 'revenue', fill: 'var(--fluid-accent)' }),
    XAxis(),
    ChartTooltip(),
  ],
}
export const candleProps = {
  height: 210,
  children: [Grid(), Candlestick(), XAxis(), YAxis(), ChartTooltip()],
}
export const lineInputs = line.inputs('preview-line', lineProps)
export const areaInputs = area.inputs('preview-area', areaProps)
export const barInputs = bar.inputs('preview-bar', barProps)
export const composedInputs = composed.inputs('preview-composed', composedProps)
export const scatterInputs = scatter.inputs('preview-scatter', scatterProps)
export const candleInputs = candle.inputs('preview-candlestick', candleProps)
export const LineLayer = LineBlock.makeLayer(line.plans(LineBlock))
export const AreaLayer = AreaBlock.makeLayer(area.plans(AreaBlock))
export const BarLayer = BarBlock.makeLayer(bar.plans(BarBlock))
export const ComposedLayer = ComposedBlock.makeLayer(composed.plans(ComposedBlock))
export const ScatterLayer = ScatterBlock.makeLayer(scatter.plans(ScatterBlock))
export const CandleLayer = CandleBlock.makeLayer(candle.plans(CandleBlock))
