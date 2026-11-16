import { sourceYAxisControl } from '../cartesian/y-axis-control'
import { referenceAreaConfigs, referenceAreaMarks } from '../cartesian/reference-area'
import { scopedGradientId } from '../kit/gradient-resources'
import type { CartesianLayer } from '../cartesian/layers'
import { userGradients } from '../kit/gradients'
import { DateTime, Option } from 'effect'
import { defineChart } from '@tanstack/charts'
import type {
  ChartDefinitionOptions,
  ChartLinearGradient,
  ChartMark,
  ChartSpec,
  DomChartDefinition,
} from '@tanstack/charts'
import { scaleLinear, scaleTime, scaleUtc } from 'd3-scale'
import { candleMarks } from './marks'
import type { OHLCValues } from './marks'
import type { CandleProjection } from './body'
import { candlestickDomains, yExtent } from './domains'
import type { CandlestickChartProps } from './options'
import { sourceGridCss, sourceGridMasks } from '../cartesian/grid-mask'
import {
  gridColumnGuides,
  gridHostAttrs,
  gridLineStyle,
  gridRowGuides,
} from '../cartesian/grid-guides'
import { dataTickValues } from '../cartesian/data-ticks'
import { cartesianFocus } from '../cartesian/focus'
import { resolveSeries, toDate } from '../cartesian/series'
import { Line } from '../cartesian/layers'
import type { CartesianSnapshot } from '../cartesian/definition'
import type { Interaction } from '../cartesian/state'
import type { ChartTooltipExtension } from '@tanstack/charts/tooltip'
import { mergeTooltipCarriers } from '../cartesian/tooltip-carriers'
import { tooltipBoxMotion } from '../cartesian/tooltip-motion'

const POSITIVE = 'var(--color-emerald-500, oklch(69.6% 0.17 162.48))'

const NEGATIVE = 'var(--color-red-500, oklch(63.7% 0.237 25.331))'

const date = (value: number) => DateTime.toDateUtc(DateTime.makeUnsafe(value))

function assertCandlestickLayers<Row>(children: ReadonlyArray<CartesianLayer<Row>>): void {
  for (const child of children) {
    if (
      ![
        'candlestick',
        'referenceArea',
        'gradient',
        'pattern',
        'grid',
        'xAxis',
        'yAxis',
        'tooltip',
        'tooltipDot',
        'tooltipIndicator',
      ].includes(child.kind)
    ) {
      throw new TypeError(`Candlestick ${child.kind} compilation is not ported yet`)
    }
  }
}

export function buildCandlestickDefinition<Row extends OHLCValues>(
  data: ReadonlyArray<Row>,
  options: {
    readonly id: string
    readonly tooltipExtension?: ChartTooltipExtension
    readonly props: CandlestickChartProps<Row>
    readonly state: Interaction
    readonly clock: () => number
    readonly onBuilt: (snapshot: CartesianSnapshot<Row>) => void
  },
): DomChartDefinition<Row, Date, number> {
  const { props, state } = options

  assertCandlestickLayers(props.children)

  const candle = props.children.find((child) => child.kind === 'candlestick')?.props ?? {}

  const defaultGradients: ReadonlyArray<ChartLinearGradient> = [
    { id: scopedGradientId(options.id, 'candlestick-positive'), color: POSITIVE },
    { id: scopedGradientId(options.id, 'candlestick-negative'), color: NEGATIVE },
  ].map(({ id, color }) => ({
    id,
    x1: 0,
    x2: 0,
    y1: 1,
    y2: 0,
    stops: [
      { offset: 0, color },
      { offset: 1, color },
    ],
  }))

  const defaultPaints = new Map(
    defaultGradients.map((gradient, index) => [
      index === 0 ? 'url(#candlestick-positive)' : 'url(#candlestick-negative)',
      `url(#${gradient.id})`,
    ]),
  )

  const paint = (value: string | undefined, fallback: string): string => {
    const source = value ?? fallback

    return defaultPaints.get(source) ?? source
  }

  const grid = props.children.find((child) => child.kind === 'grid')?.props
  const xAxis = props.children.find((child) => child.kind === 'xAxis')?.props
  const yAxis = props.children.find((child) => child.kind === 'yAxis')?.props
  const tooltip = mergeTooltipCarriers(props.children)
  const margin = { top: 40, right: 40, bottom: 40, left: 40, ...props.margin }
  const xKey = props.xDataKey ?? 'date'
  const x = (row: Row) => toDate(row[xKey])

  const xDomain = Option.isSome(state.brush)
    ? ([date(state.brush.value.start), date(state.brush.value.end)] satisfies readonly [Date, Date])
    : props.xDomain

  const domains = candlestickDomains(data, xKey, xDomain, props.xDomainSlotCount)
  const yDomain = yExtent(data)
  const yScale = scaleLinear().domain(yDomain).nice()

  const rowGuides = gridRowGuides(grid, yScale, yAxis !== undefined, yAxis?.numTicks, {
    id: options.id,
  })

  const columns = gridColumnGuides(grid, scaleTime().domain(domains.x), { id: options.id })
  const count = xAxis?.numTicks ?? 5

  const ticks =
    xAxis?.tickMode === 'domain' ? { count } : { values: dataTickValues(data, x, count) }

  const formatX =
    xAxis?.formatValue ??
    ((value: Date) =>
      new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value))

  const formatY = (value: number) =>
    yAxis?.formatValue?.(value) ??
    (yAxis?.formatLargeNumbers !== false && Math.abs(value) >= 1000
      ? `${(value / 1000).toFixed(0)}k`
      : String(value))

  let focusPlot = { innerWidth: 0, innerHeight: 0 }

  type Marks = Array<
    | ChartMark<Row, Date, number>
    | ReturnType<typeof gridColumnGuides>[number]
    | ReturnType<typeof referenceAreaMarks>[number]
  >

  const chart = ({ width, height }: { width: number; height: number }): ChartSpec<Marks> => {
    const sourceGrid = sourceGridMasks(options.id, width, height, margin, grid)

    const plot = {
      innerWidth: width - margin.left - margin.right,
      innerHeight: height - margin.top - margin.bottom,
    }

    focusPlot = plot

    const slotWidth =
      Math.max(0, plot.innerWidth) / Math.max(props.xDomainSlotCount ?? data.length, 1)

    const gap = props.candleGap ?? 0.2

    const bodyWidth = Math.min(props.candleWidth ?? slotWidth * (1 - gap), slotWidth)

    const publish = (candleGeometry: CandleProjection) => {
      options.onBuilt({
        candleGeometry,
        sourceGrid,
        width,
        height,
        ...plot,
        margin,
        domains: { x: domains.x, y: { left: domains.y } },
        targetY: { left: domains.y },
        rows: data,
        series: resolveSeries([
          Line({ dataKey: 'close', stroke: 'var(--chart-line-primary)', showHighlight: false }),
        ]),
        tickTimes: ('values' in ticks
          ? ticks.values
          : scaleUtc().domain(domains.x).ticks(count)
        ).map((value) => value.getTime()),
        gridAttrs: gridHostAttrs(grid),
        resourceCss: sourceGridCss(sourceGrid) + candleGeometry.css,
        resourceAttrs: { 'data-bkm-chart': 'candlestick' },
        resourceStyle: { '--bkm-faded': String(candle.fadedOpacity ?? 0.3) },
        hoverEnabled: candle.showHoverFade !== false,
        hover: {
          dim: [],
          highlights: [],
          pl: [],
          times: data.map((row) => x(row).getTime()),
          plSigns: [],
          segmentLeft: null,
          bandClip: `${options.id}-hlband`,
        },
      })
    }

    const marks: Marks = [
      ...rowGuides.marks,
      ...columns,
      ...candleMarks({
        id: options.id,
        onProjected: publish,
        rows: data,
        xKey,
        positiveFill: paint(candle.positiveFill, 'url(#candlestick-positive)'),
        negativeFill: paint(candle.negativeFill, 'url(#candlestick-negative)'),
        candleWidth: bodyWidth,
        entrance: !state.revealReady && candle.animate !== false,
        generation: state.generation,
        bodyPatternPositive:
          candle.bodyPatternPositive === undefined
            ? undefined
            : paint(candle.bodyPatternPositive, candle.bodyPatternPositive),
        bodyPatternNegative:
          candle.bodyPatternNegative === undefined
            ? undefined
            : paint(candle.bodyPatternNegative, candle.bodyPatternNegative),
        insideStrokeWidth: candle.insideStrokeWidth ?? 0,
        solidPositiveFill: POSITIVE,
        solidNegativeFill: NEGATIVE,
      }),
      ...props.children
        .filter((child) => child.kind === 'referenceArea')
        .flatMap(({ props: reference }, index) =>
          referenceAreaMarks(reference, { index, uid: options.id, xDomain: domains.x, yDomain }),
        ),
    ]

    return {
      marks,
      gradients: [
        ...defaultGradients,
        ...userGradients(props.children.filter((child) => child.kind === 'gradient')),
      ],
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
          scale: scaleUtc().domain(domains.x),
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
        y: {
          scale: yScale,
          grid: rowGuides.native && grid ? gridLineStyle(grid) : false,
          axis:
            yAxis === undefined
              ? false
              : {
                  line: false,
                  ticks: { count: rowGuides.count, size: 0, format: formatY },
                  tickLabels: false,
                },
        },
      },
    }
  }

  const chartOptions = {
    controls: [
      sourceYAxisControl({
        id: options.id,
        axes: props.children.filter((child) => child.kind === 'yAxis').map((child) => child.props),
        referenceAreas: referenceAreaConfigs(props.children),
      }),
    ],
    focus: cartesianFocus(margin, () => focusPlot),
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

  return defineChart<Marks, ChartSpec<Marks>, typeof chartOptions>({ chart }, chartOptions)
}
