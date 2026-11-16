import { DateTime } from 'effect'
import { curveNatural } from 'd3-shape'
import { LineChart, AreaChart } from './root'
import { Grid, Line, Area } from './layers'
import type { CartesianLoadingProps } from './loading-options'
import { SkeletonRow } from './skeleton'

function loading(family: 'line' | 'area', name: string, props: CartesianLoadingProps = {}) {
  const root =
    family === 'line'
      ? LineChart({ name, Row: SkeletonRow })
      : AreaChart({ name, Row: SkeletonRow })

  let grid: Parameters<typeof Grid>[0] = {
    horizontal: true,
    shimmer: props.loadingStyle === 'sweep' ? false : (props.gridShimmer ?? true),
    stroke: props.gridStroke ?? 'color-mix(in oklch, var(--chart-grid) 50%, transparent)',
    shimmerStroke:
      props.gridShimmerStroke ?? 'color-mix(in oklch, var(--bkm-foreground) 68%, transparent)',
    shimmerSync: props.gridShimmerSync ?? false,
  }

  if (props.gridShimmerLength !== undefined) {
    grid = { ...grid, shimmerLength: props.gridShimmerLength }
  }

  if (props.gridShimmerSpeed !== undefined) {
    grid = { ...grid, shimmerSpeed: props.gridShimmerSpeed }
  }

  const children = [Grid(grid)]

  const series = {
    dataKey: 'value',
    curve: curveNatural,
    fadeEdges: false,
    showHighlight: false,
    stroke: 'transparent',
    loadingStyle: props.loadingStyle ?? 'pulse',
    loadingStroke: props.stroke ?? 'var(--bkm-foreground)',
    loadingStrokeOpacity: props.strokeOpacity ?? 0.5,
  }

  const baseProps = {
    children: [
      ...children,
      family === 'line'
        ? Line({ ...series, strokeWidth: 2.5 })
        : Area({
            ...series,
            fill: 'transparent',
            fillOpacity: 0,
            loading: true,
            showLine: true,
            strokeWidth: 2,
          }),
    ],
    status: 'loading',
    animationDuration: 0,
    aspectRatio: props.aspectRatio ?? '2 / 1',
    className: props.className ?? '',
    loadingLabel: props.label ?? 'Loading',
  } satisfies Parameters<typeof root.inputs>[1]

  const chartProps = props.margin === undefined ? baseProps : { ...baseProps, margin: props.margin }

  const data = Array.from({ length: 7 }, (_, index) =>
    SkeletonRow.make({
      date: DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2025, 0, index + 1))),
      value: Math.round(110 + Math.sin(index * 1.15) * 36 + index * 9),
    }),
  )

  return {
    ...root,
    data,
    configuration: root.configuration(chartProps),
    inputs: (id: string) => root.inputs(id, chartProps),
  }
}

export const LineChartLoading = (name: string, props?: CartesianLoadingProps) =>
  loading('line', name, props)

export const AreaChartLoading = (name: string, props?: CartesianLoadingProps) =>
  loading('area', name, props)
