import { scatterPointer } from './pointer'
import { sourceYAxisControl } from '../cartesian/y-axis-control'
import { sourceGridCss, sourceGridMasks } from '../cartesian/grid-mask'
import { referenceAreaConfigs } from '../cartesian/reference-area'
import { scatterYScales } from './context-domains'
import { DateTime, Schema } from 'effect'
import { defineChart } from '@tanstack/charts'
import { focusGroupX } from '@tanstack/charts/focus'
import type {
  ChartDefinitionOptions,
  ChartLayerRenderer,
  ChartFocusResolveContext,
  ChartPoint,
  ChartSpec,
  ChartValue,
  DomChartDefinition,
} from '@tanstack/charts'
import { scaleLinear, scaleTime, scaleUtc } from 'd3-scale'
import { resolveScatterSeries, scatterYDomain } from './series'
import { seriesMarks } from './marks'
import { scatterSeriesScene } from './motion-scene'
import { scatterPaintMark } from './paint'
import type { ScatterPaintProjection } from './paint'
import { tooltipOverlay } from './overlay'
import type { ScatterChartProps } from './options'
import { Line } from '../cartesian/layers'
import { resolveSeries, axisId, toDate } from '../cartesian/series'
import type { SeriesMark } from '../cartesian/build-state'
import type { CartesianSnapshot } from '../cartesian/definition'
import type { Interaction } from '../cartesian/state'
import { gridColumnGuides, gridHostAttrs, gridRowGuides } from '../cartesian/grid-guides'
import { dataTickValues } from '../cartesian/data-ticks'
import { mergeTooltipCarriers } from '../cartesian/tooltip-carriers'
import type { ChartTooltipExtension } from '@tanstack/charts/tooltip'
import { tooltipBoxMotion } from '../cartesian/tooltip-motion'
import { userGradients } from '../kit/gradients'

export const buildScatterDefinition: <Row extends Readonly<Record<string, unknown>>>(
  data: ReadonlyArray<Row>,
  options: {
    readonly id: string
    readonly tooltipExtension?: ChartTooltipExtension
    readonly onPointerResolver: (
      resolve: (point: { readonly x: number; readonly y: number }) => number | null,
    ) => void
    readonly occurrences: WeakMap<ChartPoint, number>
    readonly renderer: ChartLayerRenderer<Row, Date, number>
    readonly props: ScatterChartProps<Row>
    readonly state: Interaction
    readonly clock: () => number
    readonly onBuilt: (snapshot: CartesianSnapshot<Row>) => void
  },
) => DomChartDefinition<Row, Date, number> = function buildScatterDefinition<
  Row extends Readonly<Record<string, unknown>>,
>(
  data: ReadonlyArray<Row>,
  options: {
    readonly id: string
    readonly tooltipExtension?: ChartTooltipExtension
    readonly onPointerResolver: (
      resolve: (point: { readonly x: number; readonly y: number }) => number | null,
    ) => void
    readonly occurrences: WeakMap<ChartPoint, number>
    readonly renderer: ChartLayerRenderer<Row, Date, number>
    readonly props: ScatterChartProps<Row>
    readonly state: Interaction
    readonly clock: () => number
    readonly onBuilt: (snapshot: CartesianSnapshot<Row>) => void
  },
) {
  const { props, state } = options
  const { occurrences } = options
  const series = resolveScatterSeries(props.children)
  const gradients = userGradients(props.children.filter((child) => child.kind === 'gradient'))
  const tooltip = mergeTooltipCarriers(props.children)
  const grid = props.children.find((child) => child.kind === 'grid')?.props
  const xAxis = props.children.find((child) => child.kind === 'xAxis')?.props
  const yAxes = props.children.filter((child) => child.kind === 'yAxis').map((child) => child.props)
  const margin = { top: 40, right: 40, bottom: 40, left: 40, ...props.margin }
  const x = (row: Row) => toDate(row[props.xDataKey ?? 'date'])
  const times = data.map((row) => x(row).getTime())
  const minT = times.length > 0 ? Math.min(...times) : 0
  const maxT = times.length > 0 ? Math.max(...times) : 1
  const span = Math.max(1, maxT - minT)
  const xPad = (series.length > 0 ? Math.max(...series.map((s) => s.radius)) : 5) + 10

  const live = { innerWidth: 0, innerHeight: 0 }
  const pointer = scatterPointer(times, margin, live)
  options.onPointerResolver(pointer.resolve)

  const valuesByAxis = new Map<string, Array<number>>()

  for (const s of series) {
    const values = valuesByAxis.get(s.yAxisId) ?? []
    values.push(
      ...data.map((row) => {
        const coordinate = row[s.dataKey]

        return isScatterCoordinate(coordinate) ? coordinate : Number.NaN
      }),
    )
    valuesByAxis.set(s.yAxisId, values)
  }

  if (!valuesByAxis.has('left')) {
    valuesByAxis.set('left', [])
  }

  const domains = new Map([...valuesByAxis].map(([id, values]) => [id, scatterYDomain(values)]))
  const primaryAxis = yAxes.find((axis) => axisId(axis.yAxisId) === 'left')

  const guides = gridRowGuides(
    grid,
    scaleLinear().domain(domains.get('left') ?? [0, 100]),
    primaryAxis !== undefined,
    primaryAxis?.numTicks,
    { id: options.id },
  )

  const liveInput = {
    revealed: state.phaseClockReady,
  }

  const yAxisScales = new Map(
    [...domains].map(([id, domain]) => [id, scaleLinear().domain(domain)]),
  )

  const scales = scatterYScales(yAxisScales, yAxes, guides, grid)

  const count = xAxis?.numTicks ?? 5

  const ticks =
    xAxis?.tickMode === 'domain' ? { count } : { values: dataTickValues(data, x, count) }

  const formatX =
    xAxis?.formatValue ??
    ((value: Date) =>
      new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value))

  const xDomainAt: (width: number) => [Date, Date] = (width: number) => {
    const plot = Math.max(1, width - margin.left - margin.right - xPad * 2)

    if (maxT === minT) {
      return [date(minT - 1), date(maxT + 1)]
    }

    const padMs = (xPad * span) / plot

    return [date(minT - padMs), date(maxT + padMs)]
  }

  type Marks = Array<SeriesMark<Row> | ReturnType<typeof gridColumnGuides>[number]>

  const chart: (argument0: { width: number; height: number }) => ChartSpec<Marks> = ({
    width,
    height,
  }: {
    width: number
    height: number
  }) => {
    const sourceGrid = sourceGridMasks(options.id, width, height, margin, grid)
    live.innerWidth = Math.max(1, width - margin.left - margin.right)
    live.innerHeight = height - margin.top - margin.bottom
    const xDomain = xDomainAt(width)
    const dim = series.find((s) => s.dim)

    const publish = (scatterPaint: ScatterPaintProjection) => {
      options.onBuilt({
        scatterPaint,
        sourceGrid,
        width,
        height,
        innerWidth: live.innerWidth,
        innerHeight: live.innerHeight,
        margin,
        domains: { x: xDomain, y: Object.fromEntries(domains) },
        targetY: Object.fromEntries(domains),
        rows: data,
        rowIndices: scatterPaint.rowIndices,
        series: resolveSeries(
          series.map((s) =>
            Line({
              dataKey: s.dataKey,
              stroke: s.tooltipColor,
              yAxisId: s.yAxisId,
              showHighlight: false,
            }),
          ),
        ),
        overlayModel:
          tooltip === undefined
            ? null
            : tooltipOverlay({
                tooltipProps: tooltip,
                paintScope: options.id,
                series,
                data,
                xOf: x,
                pill: null,
              }),
        tickTimes: ('values' in ticks ? ticks.values : scaleUtc().domain(xDomain).ticks(count)).map(
          (value) => value.getTime(),
        ),
        gridAttrs: gridHostAttrs(grid),
        resourceAttrs: { 'data-bkm-chart': 'scatter' },
        resourceCss: sourceGridCss(sourceGrid) + scatterPaint.css,
        resourceStyle: {
          '--bkm-inactive': String(dim?.inactiveOpacity ?? 1),
          '--bkm-blur': String(dim?.inactiveBlur ?? 0),
          '--bkm-enter-blur': String(series[0]?.enterBlur ?? 2),
        },
        hoverEnabled: dim !== undefined,
        hover: {
          dim: [],
          highlights: [],
          pl: [],
          times,
          plSigns: [],
          segmentLeft: null,
          bandClip: `${options.id}-hlband`,
        },
      })
    }

    const colorDomain: Array<string> = []
    const colorRange: Array<string> = []
    const colors = { domain: colorDomain, range: colorRange }
    const projections: Array<ScatterPaintProjection> = []
    const marks: Array<SeriesMark<Row>> = []
    let projectionCount = 0

    const collectProjection = (projection: ScatterPaintProjection) => {
      projections.push(projection)

      if (projections.length === projectionCount) {
        publish({
          rowIndices: [...new Set(projections.flatMap((value) => value.rowIndices))].toSorted(
            (left, right) => left - right,
          ),
          css: projections.map((value) => value.css).join(''),
          gradients: projections.flatMap((value) => value.gradients),
          entrance: projections.flatMap((value) => value.entrance),
        })
        projections.length = 0
      }
    }

    for (const [index, s] of series.entries()) {
      const children = seriesMarks(s, {
        input: liveInput,
        data,
        xOf: x,
        present: (mark, role, indices) =>
          scatterPaintMark(
            mark,
            s,
            options.id,
            index,
            role,
            collectProjection,
            indices,
            margin,
            (props.enterTransition?.duration ?? 1.1) * 1000,
            occurrences,
            pointer.project,
          ),
        colorDomain: colors.domain,
        colorRange: colors.range,
      })

      projectionCount += children.length
      marks.push(
        scatterSeriesScene(
          children,
          data,
          s,
          options.id,
          index,
          margin,
          s.animate && !state.revealReady,
          state.generation,
          options.renderer,
          occurrences,
        ),
      )
    }

    if (marks.length === 0) {
      publish({ rowIndices: [], css: '', gradients: [], entrance: [] })
    }

    const specification: ChartSpec<Marks> = {
      marks: [
        ...guides.marks,
        ...gridColumnGuides(grid, scaleTime().domain(xDomain), { id: options.id }),
        ...marks,
      ],
      gradients,
      margin,
      theme: {
        foreground: 'var(--chart-foreground)',
        muted: 'var(--chart-label)',
        grid: 'var(--chart-grid)',
        background: 'transparent',
        palette: [
          'var(--chart-1)',
          'var(--chart-2)',
          'var(--chart-3)',
          'var(--chart-4)',
          'var(--chart-5)',
        ],
      },
      scales: {
        x: {
          scale: scaleUtc().domain(xDomain),
          grid: false,
          axis:
            xAxis === undefined
              ? false
              : {
                  line: false,
                  ticks: { ...ticks, size: 0, padding: 14.4, format: formatX },
                  tickLabels: { fontSize: 12, opacity: 1, thin: false },
                },
        },
        ...scales,
        y: scales.y ?? { scale: scaleLinear().domain([0, 100]), axis: false },
      },
    }

    return (
      colors.domain.length === 0 ? specification : { ...specification, color: colors }
    ) satisfies ChartSpec<Marks>
  }

  const focus = {
    ...focusGroupX,
    resolve<Datum, X extends ChartValue, Y extends ChartValue>(
      points: ReadonlyArray<ChartPoint<Datum, X, Y>>,
      context: ChartFocusResolveContext,
    ) {
      const occurrence = pointer.resolve(context)

      return (
        occurrence === null
          ? []
          : focusGroupX.resolve(
              points.filter((point) => occurrences.get(point) === occurrence),
              context,
            )
      ) satisfies ReadonlyArray<ChartPoint<Datum, X, Y>>
    },
  }

  const chartOptionsBase = {
    controls: [
      sourceYAxisControl({
        id: options.id,
        axes: yAxes,
        referenceAreas: referenceAreaConfigs(props.children),
      }),
    ],
    motion: false,
    focusRing: false,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    tooltip:
      tooltip === undefined || options.tooltipExtension === undefined
        ? false
        : {
            use: options.tooltipExtension,
            anchor: { x: 'value', y: 'plot-top' },
            offset: 16,
            sticky: false,
            motion: tooltipBoxMotion(tooltip),
          },
  } satisfies ChartDefinitionOptions<Row, Date, number>

  const chartOptions = tooltip === undefined ? chartOptionsBase : { focus, ...chartOptionsBase }

  return defineChart<Marks, ChartSpec<Marks>, typeof chartOptions>(
    { chart },
    chartOptions,
  ) satisfies DomChartDefinition<Row, Date, number>
}

const date = (value: number) => DateTime.toDateUtc(DateTime.makeUnsafe(Math.trunc(value)))

const isScatterCoordinate = Schema.is(Schema.Finite)
