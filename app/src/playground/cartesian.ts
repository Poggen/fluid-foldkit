import { Line, Area, Grid, XAxis, YAxis, ChartTooltip } from '@foldkit-visuals/charts/line'
import {
  Bar,
  Grid as BarGrid,
  BarXAxis,
  ChartTooltip as BarTooltip,
} from '@foldkit-visuals/charts/bar'
import { Scatter } from '@foldkit-visuals/charts/scatter'
import { Candlestick } from '@foldkit-visuals/charts/candlestick'
import { SeriesBar } from '@foldkit-visuals/charts/composed'
import {
  lineProps,
  areaProps,
  barProps,
  scatterProps,
  candleProps,
  composedProps,
} from '../gallery/cartesian-definitions'
import type { PreviewOptions } from './options'
const build = (options: PreviewOptions) => {
  const grid = options.showGrid === false ? [] : [Grid()]
  const axis = options.showAxis === false ? [] : [XAxis()]
  const tooltip = options.showTooltip === false ? [] : [ChartTooltip()]
  const height = options.height ?? 210
  return {
    line: {
      ...lineProps,
      height,
      children: [
        ...grid,
        Line({
          dataKey: 'revenue',
          stroke: 'var(--fluid-accent)',
          strokeWidth: options.strokeWidth ?? 2,
          fadeEdges: false,
        }),
        ...axis,
        ...tooltip,
      ],
    },
    area: {
      ...areaProps,
      height,
      children: [
        ...grid,
        Area({ dataKey: 'revenue', fill: 'var(--fluid-accent)' }),
        ...axis,
        ...tooltip,
      ],
    },
    bar: {
      ...barProps,
      height,
      children: [
        ...(options.showGrid === false ? [] : [BarGrid()]),
        Bar({ dataKey: 'revenue', fill: 'var(--fluid-accent)' }),
        ...(options.showAxis === false ? [] : [BarXAxis()]),
        ...(options.showTooltip === false ? [] : [BarTooltip()]),
      ],
    },
    composed: {
      ...composedProps,
      height,
      children: [
        ...grid,
        SeriesBar({ dataKey: 'cost', fill: 'var(--fluid-accent)' }),
        Line({ dataKey: 'revenue', stroke: 'var(--foreground)', fadeEdges: false }),
        ...axis,
        ...tooltip,
      ],
    },
    scatter: {
      ...scatterProps,
      height,
      children: [
        ...grid,
        Scatter({ dataKey: 'revenue', fill: 'var(--fluid-accent)' }),
        ...axis,
        ...tooltip,
      ],
    },
    candle: {
      ...candleProps,
      height,
      children: [
        ...grid,
        Candlestick(),
        ...(options.showAxis === false ? [] : [XAxis(), YAxis()]),
        ...tooltip,
      ],
    },
  }
}
const cache = new WeakMap<PreviewOptions, ReturnType<typeof build>>()
export const cartesianPreview = (options: PreviewOptions) => {
  const previous = cache.get(options)
  if (previous) return previous
  const props = build(options)
  cache.set(options, props)
  return props
}
