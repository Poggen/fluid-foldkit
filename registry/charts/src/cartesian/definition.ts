import { cartesianCssScope } from './css-scope'
import type { SpringConfig } from './series-options'
import type { TimeSeriesDomainFrame } from './time-series-domain-frame'
import { createTimeSeriesWrap, timeSeriesMotion } from './time-series-motion'
import {
  timeSeriesYScales,
  timeSeriesTicks,
  timeSeriesXScale,
  seriesYValues,
  timeSeriesYDomains,
} from './time-series-scales'
import { projectionExtents, projectionMarks, terminalMarks } from './projection-marks'
import { eventMarkerMarks } from './event-marker-marks'
import { referenceAreaMarks } from './reference-area'
import type { OverlayDot, HoverOverlayModel } from './hover-overlay'
import { generateChartSkeletonData } from './skeleton'
import type { ChartSkeletonDatum } from './skeleton'
import { backgroundCss, backgroundMarks } from './background'
import { resolveSegmentProps, segmentMarks } from './segment-marks'
import { userGradients } from '../kit/gradients'
import { Predicate, DateTime } from 'effect'
import { defineChart, areaY as importedArea, lineY as importedLine } from '@tanstack/charts'
import type {
  ChartBuildContext,
  ChartDefinitionOptions,
  ChartSpec,
  DomChartDefinition,
} from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { rowSets } from './decimate'
import { toDate, axisId, DEFAULT_Y_AXIS_ID, resolveSeries } from './series'
import type { ResolvedSeries } from './series'
import type { ChartTooltipExtension } from '@tanstack/charts/tooltip'
import { tooltipBoxMotion } from './tooltip-motion'
import { mergeTooltipCarriers } from './tooltip-carriers'
import { scaleLinear, scaleTime, scaleUtc } from 'd3-scale'
import type { CartesianLayer } from './layers'
import type { Margin } from './context-types'
import type { BuildState, SeriesMark } from './build-state'
import { cartesianFocus } from './focus'
import { fixedYDomains, toNumber, seriesValueOf, visibleRows } from './domains'
import { gridColumnGuides, gridHostAttrs, gridRowGuides, loadingGridProps } from './grid-guides'
import type { SourceGridMask } from './grid-mask'
import type { CandleProjection } from '../candlestick/body'
import type { ScatterPaintProjection } from '../scatter/paint'
import { pushSeriesMarks } from './series-marks'
import type { SeriesContext } from './series-marks'
import type { HoverVisuals } from './hover-css'

const requireTimeSeriesLayers: <Row>(children: ReadonlyArray<CartesianLayer<Row>>) => void =
  function requireTimeSeriesLayers<Row>(children: ReadonlyArray<CartesianLayer<Row>>) {
    for (const child of children) {
      if (child.kind === 'candlestick' || child.kind === 'scatter') {
        throw new TypeError(`Cartesian ${child.kind} requires its family compiler`)
      }
    }
  }

/** The source compiler preserves concrete row marks and engine-branded decorative grid marks. */
export const buildTimeSeriesDefinition: <
  Row extends Readonly<Record<string, unknown>>,
  ExtraDatum = never,
>(
  data: ReadonlyArray<Row>,
  options: CartesianCompilationOptions<Row, ExtraDatum>,
) => DomChartDefinition<Row | ExtraDatum, Date, number> = function buildTimeSeriesDefinition<
  Row extends Readonly<Record<string, unknown>>,
  ExtraDatum = never,
>(data: ReadonlyArray<Row>, options: CartesianCompilationOptions<Row, ExtraDatum>) {
  const margin: Margin = { top: 40, right: 40, bottom: 40, left: 40, ...options.margin }

  requireTimeSeriesLayers(options.children)

  const projections = projectionExtents(options.children)

  const series = resolveSeries(options.children, options.chartLoading)
  const xAxis = options.children.find((child) => child.kind === 'xAxis')?.props

  const yAxes = options.children
    .filter((child) => child.kind === 'yAxis')
    .map((child) => child.props)

  const gridCarrier = options.children.find((child) => child.kind === 'grid')?.props

  const grid =
    (options.gridLoading ?? options.chartLoading) === true
      ? loadingGridProps(gridCarrier)
      : gridCarrier

  const rows = visibleRows(data, options.x, options.xDomain)
  const skeletonKey = series.find((item) => item.kind !== 'pattern')?.dataKey

  const emptySkeleton = emptySkeletonRows(data.length, options.skeletonRows, skeletonKey)

  const valueOf: (row: Row, item: ResolvedSeries) => number = (row: Row, item: ResolvedSeries) =>
    options.skeletonRows === true && item.dataKey === skeletonKey
      ? Math.round(95 + Math.sin(data.indexOf(row) * 1.05) * 28 + data.indexOf(row) * 7)
      : seriesValueOf(item.kind)(row[item.dataKey])

  const values = seriesYValues(rows, emptySkeleton, series, valueOf)

  const references = options.children.flatMap((child, position) =>
    child.kind === 'referenceArea' ? [{ props: child.props, position }] : [],
  )

  const referenceValues = references.flatMap(({ props }) =>
    [props.y1, props.y2].filter((value) => value !== undefined),
  )

  const fixed = fixedYDomains(yAxes, options.yDomain)
  const { targetY, yDomains: targetDomains } = timeSeriesYDomains(
    values,
    [...(options.extraYValues ?? []), ...referenceValues],
    projections.yValues,
    options.yDomainFrom,
    fixed,
  )

  const yDomains = options.domainFrame?.resolve(targetY, fixed) ?? targetDomains

  const times = [
    ...data.map((row) => options.x(row).getTime()),
    ...projections.xValues.map((value) => value.getTime()),
    ...emptySkeleton.map((row) => toDate(row.date).getTime()),
  ]

  const first = times.length === 0 ? 0 : Math.min(...times)
  const last = times.length === 0 ? 1 : Math.max(...times)

  const xDomain: readonly [Date, Date] = options.xDomain ?? [
    date(first === last ? first - 43_200_000 : first),
    date(first === last ? last + 43_200_000 : last),
  ]

  const segmentProps = resolveSegmentProps(options.children, {
    explicit: options.xDomain !== undefined,
    count: times.length,
    first,
    last,
  })

  const segments = segmentProps !== null

  const formatX =
    xAxis?.formatValue ??
    ((value: Date) =>
      new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value))

  let plotSize = { innerWidth: 0, innerHeight: 0 }

  type SkeletonMark = ReturnType<typeof decorative<SeriesMark<ChartSkeletonDatum>>>

  type Marks = Array<
    | SeriesMark<Row>
    | SeriesMark<ExtraDatum>
    | SkeletonMark
    | ReturnType<typeof referenceAreaMarks>[number]
    | ReturnType<typeof backgroundMarks<Row>>[number]
    | ReturnType<typeof gridColumnGuides>[number]
    | ReturnType<typeof projectionMarks>[number]
    | ReturnType<typeof terminalMarks<Row>>[number]
    | ReturnType<typeof eventMarkerMarks>[number]
    | ReturnType<typeof segmentMarks>[number]
  >

  const chart: (argument0: ChartBuildContext) => ChartSpec<Marks> = ({
    width,
    height,
  }: ChartBuildContext) => {
    plotSize = {
      innerWidth: width - margin.left - margin.right,
      innerHeight: height - margin.top - margin.bottom,
    }
    const primaryAxis = yAxes.find((axis) => axisId(axis.yAxisId) === DEFAULT_Y_AXIS_ID)
    const primaryDomain = yDomains.get(DEFAULT_Y_AXIS_ID) ?? [0, 100]

    const rowGuides = gridRowGuides(
      grid,
      scaleLinear().domain(primaryDomain),
      primaryAxis !== undefined,
      primaryAxis?.numTicks,
    )

    const wrap = createTimeSeriesWrap(options, plotSize, margin)

    const state: BuildState<Row> = {
      marks: [],
      gradients: userGradients(options.children.filter((child) => child.kind === 'gradient')),
      hoverDim: [],
      hoverHighlights: [],
      plRules: [],
    }

    const rowInput = {
      data,
      x: options.x,
      innerWidth: plotSize.innerWidth,
      valueKeys: series.map((item) => item.dataKey),
    }

    const drawingRows = rowSets(
      options.xDomain === undefined ? rowInput : { ...rowInput, xDomain: options.xDomain },
    )

    if (emptySkeleton.length === 0) {
      const context: SeriesContext<Row> = {
        wrap,
        valueOf,
        input: { data, uid: options.id, plotHeight: plotSize.innerHeight, series },
        rows: drawingRows.pathRows,
        pathIndices: drawingRows.pathIndices,
        markerRows: drawingRows.rows,
        yDomains,
        fadeDomain: [xDomain[0], xDomain[1]],
        xAccessor: options.x,
        keyOf: (row) => options.x(row).getTime(),
        lineY: importedLine,
        areaY: importedArea,
        state,
      }

      pushSeriesMarks(
        drawingRows.pathRows === drawingRows.rows
          ? context
          : { ...context, focusRows: drawingRows.rows },
      )
    }

    const skeletonState: BuildState<ChartSkeletonDatum> = {
      marks: [],
      gradients: state.gradients,
      hoverDim: [],
      hoverHighlights: [],
      plRules: [],
    }

    if (emptySkeleton.length > 0) {
      pushSeriesMarks({
        wrap,
        valueOf: (row, item) => toNumber(row[item.dataKey]),
        input: { data: emptySkeleton, uid: options.id, plotHeight: plotSize.innerHeight, series },
        rows: emptySkeleton,
        markerRows: emptySkeleton,
        yDomains,
        fadeDomain: [xDomain[0], xDomain[1]],
        xAccessor: (row) => toDate(row.date),
        keyOf: (row) => toDate(row.date).getTime(),
        lineY: importedLine,
        areaY: importedArea,
        state: skeletonState,
      })
    }

    const firstSeries = options.children.findIndex(
      (child) => child.kind === 'line' || child.kind === 'area' || child.kind === 'patternArea',
    )

    const referenceBoundary = firstSeries === -1 ? Number.POSITIVE_INFINITY : firstSeries

    const referenceMarks = references.map((child, index) => ({
      before: child.position < referenceBoundary,
      marks: referenceAreaMarks(child.props, {
        index,
        uid: options.id,
        xDomain,
        yDomain: yDomains.get(DEFAULT_Y_AXIS_ID) ?? [0, 100],
      }),
    }))

    const marks: Marks = [
      ...backgroundMarks<Row>(options.children, options.id),
      ...rowGuides.marks,
      ...gridColumnGuides(grid, scaleTime().domain(xDomain)),
      ...referenceMarks.filter((entry) => entry.before).flatMap((entry) => entry.marks),
      ...state.marks,
      ...referenceMarks.filter((entry) => !entry.before).flatMap((entry) => entry.marks),
      ...projectionMarks(options.children, {
        uid: options.id,
        xDomain,
        innerWidth: plotSize.innerWidth,
        gradients: state.gradients,
        wrap,
      }),
      ...terminalMarks(options.children, data, options.x),
      ...eventMarkerMarks(options.children),
      ...(options
        .extraMarks?.({
          ...plotSize,
          xDomain,
          yDomain: yDomains.get(DEFAULT_Y_AXIS_ID) ?? [0, 100],
        })
        .map((mark) => wrap(mark, 'extra')) ?? []),
      ...(segments
        ? segmentMarks(segmentProps, {
            uid: options.id,
            xDomain,
            yDomain: primaryDomain,
            plotWidth: plotSize.innerWidth,
            gradients: state.gradients,
          })
        : []),
      ...skeletonState.marks.map((mark) => decorative(mark)),
    ]

    const { scales, primaryY } = timeSeriesYScales(yDomains, yAxes, rowGuides, grid)
    const ticks = timeSeriesTicks(
      rows,
      options.x,
      xAxis,
      xDomain,
      options.xDomain,
      projections.xValues.length > 0,
    )

    const xScale = timeSeriesXScale(
      xAxis,
      xDomain,
      ticks,
      formatX,
      plotSize.innerHeight,
      options.xDomain !== undefined,
    )

    if (options.onBuilt !== undefined) {
      const extra =
        options.extraDots === undefined
          ? undefined
          : {
              extraDots: options.extraDots({
                ...plotSize,
                xDomain,
                yDomain: yDomains.get(DEFAULT_Y_AXIS_ID) ?? [0, 100],
              }),
            }

      const snapshot: CartesianSnapshot<Row> = {
        resourceCss: backgroundCss(cartesianCssScope(options.id).selector, options.children),
        width,
        height,
        ...plotSize,
        margin,
        domains: { x: xDomain, y: Object.fromEntries(yDomains) },
        targetY,
        series,
        rows,
        gridAttrs: gridHostAttrs(grid),
        tickTimes:
          'values' in ticks
            ? ticks.values.map((value) => value.getTime())
            : scaleUtc()
                .domain(xDomain)
                .ticks(ticks.count)
                .map((value) => value.getTime()),
        hover: {
          dim: state.hoverDim,
          highlights: state.hoverHighlights,
          pl: state.plRules,
          times: rows.map((row) => options.x(row).getTime()),
          plSigns: rows.map((row) => {
            const item = series.find((candidate) => candidate.profitLoss !== undefined)
            const value = item === undefined ? undefined : row[item.dataKey]

            if (!Predicate.isNumber(value)) {
              return null
            }

            return value >= 0 ? 0 : 1
          }),
          segmentLeft: segments ? margin.left : null,
          bandClip: `${options.id}-hlband`,
        },
      }

      options.onBuilt(extra === undefined ? snapshot : { ...extra, ...snapshot })
    }

    return {
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
      margin,
      marks,
      gradients: state.gradients,
      clip: false,
      scales: {
        ...scales,
        x: xScale,
        y: primaryY ?? { scale: scaleLinear().domain([0, 100]), axis: false },
      },
    } satisfies ChartSpec<Marks>
  }

  const chartOptions = {
    focus: cartesianFocus(margin, () => plotSize),
    tooltip:
      options.tooltipExtension === undefined
        ? false
        : {
            use: options.tooltipExtension,
            anchor: { x: 'value', y: 'plot-top' },
            offset: 16,
            sticky: false,
            motion: tooltipBoxMotion(mergeTooltipCarriers(options.children), options.tooltipSpring),
          },
    focusRing: options.sourceHover === true ? false : {},
    maxFocusDistance: Number.POSITIVE_INFINITY,
    motion: timeSeriesMotion<Row | ExtraDatum>(options),
  } satisfies ChartDefinitionOptions<Row | ExtraDatum, Date, number>

  return defineChart<Marks, ChartSpec<Marks>, typeof chartOptions>(
    { chart },
    chartOptions,
  ) satisfies DomChartDefinition<Row | ExtraDatum, Date, number>
}

export { bklitYDomain } from './domains'

export { axisId, DEFAULT_Y_AXIS_ID } from './series'

export interface CartesianSnapshot<Row> {
  readonly rowIndices?: ReadonlyArray<number>
  readonly scatterPaint?: ScatterPaintProjection
  readonly candleGeometry?: CandleProjection
  readonly sourceGrid?: ReadonlyArray<SourceGridMask>
  readonly extraDots?: ReadonlyArray<OverlayDot<Row>>
  readonly overlayModel?: HoverOverlayModel<Row> | null
  readonly resourceCss?: string
  readonly resourceAttrs?: Readonly<Record<string, string>>
  readonly resourceStyle?: Readonly<Record<string, string>>
  readonly hoverEnabled?: boolean
  readonly width: number
  readonly height: number
  readonly innerWidth: number
  readonly innerHeight: number
  readonly margin: Margin
  readonly domains: {
    readonly x: readonly [Date, Date]
    readonly y: Readonly<Record<string, readonly [number, number]>>
  }
  readonly targetY: Readonly<Record<string, readonly [number, number]>>
  readonly series: ReadonlyArray<ResolvedSeries>
  readonly rows: ReadonlyArray<Row>
  readonly hover: HoverVisuals
  readonly tickTimes: ReadonlyArray<number>
  readonly gridAttrs: ReturnType<typeof gridHostAttrs>
}

export interface CartesianCompilationOptions<Row, ExtraDatum = never> {
  readonly tooltipSpring?: SpringConfig
  readonly extraYValues?: ReadonlyArray<number>
  readonly wipePadding?: (innerWidth: number) => number
  readonly wipeArmedAt?: number | null
  readonly extraDots?: (plot: {
    readonly innerWidth: number
    readonly innerHeight: number
    readonly xDomain: readonly [Date, Date]
    readonly yDomain: readonly [number, number]
  }) => ReadonlyArray<OverlayDot<Row>>
  readonly extraMarks?: (plot: {
    readonly innerWidth: number
    readonly innerHeight: number
    readonly xDomain: readonly [Date, Date]
    readonly yDomain: readonly [number, number]
  }) => ReadonlyArray<SeriesMark<ExtraDatum>>
  readonly id: string
  readonly x: (row: Row) => Date
  readonly children: ReadonlyArray<CartesianLayer<Row>>
  readonly margin?: Partial<Margin>
  readonly xDomain?: readonly [Date, Date]
  readonly yDomain?: readonly [number, number]
  readonly gridLoading?: boolean
  readonly chartLoading?: boolean
  readonly skeletonRows?: boolean
  readonly animationDuration?: number
  readonly wipe?: {
    readonly progress: number
    readonly duration: number
    readonly conceal?: boolean
  }
  readonly clock?: () => number
  readonly sourceHover?: boolean
  readonly physicalReveal?: boolean
  readonly tooltipExtension?: ChartTooltipExtension
  readonly domainFrame?: TimeSeriesDomainFrame<Row>
  readonly updateStep?: 'snap' | 'glide' | 'window'
  readonly yDomainFrom?: Readonly<Record<string, readonly [number, number]>>
  readonly onBuilt?: (snapshot: CartesianSnapshot<Row>) => void
}

const date: (milliseconds: number) => Date = (milliseconds: number) =>
  DateTime.toDateUtc(DateTime.makeUnsafe(milliseconds))

const emptySkeletonRows: (
  length: number,
  enabled: boolean | undefined,
  key: string | undefined,
) => ReadonlyArray<ChartSkeletonDatum> = (
  length: number,
  enabled: boolean | undefined,
  key: string | undefined,
) =>
  length === 0 && enabled === true ? generateChartSkeletonData({ dataKey: key ?? 'value' }) : []
