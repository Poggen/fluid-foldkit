import { barEndValues } from './overlay-geometry'
import type { PulseClip } from './pulse-clips'
import type { DepthMotionTarget } from './depth-motion'
import { useChartConfig } from '../cartesian/chart-config'
import { buildBarDecorations } from './chart-decorations'
import { nativeBarMarks } from './chart-bars'
import { buildBarScales } from './chart-scales'
import { userGradients } from '../kit/gradients'
import { defineChart } from '@tanstack/charts'
import type {
  ChartDefinitionOptions,
  ChartMark,
  ChartSpec,
  DomChartDefinition,
} from '@tanstack/charts'
import { barPlot, barValueScales } from './plot'
import { fixedYDomains } from '../cartesian/domains'
import { sourceYAxisControl } from '../cartesian/y-axis-control'
import { referenceAreaConfigs } from '../cartesian/reference-area'
import type { BarChartProps } from './options'
import {
  configuredBarDomains,
  barAxisId,
  buildBarData,
  resolveBarSeries,
  flattenBarLayers,
} from './model'
import type { BarDatum } from './model'
import type { YScaleId } from '../cartesian/build-state'
import type { Domains, Interaction } from '../cartesian/state'
import { Option } from 'effect'
import { gridHostAttrs } from '../cartesian/grid-guides'
import type { HoverTarget } from './hover'
import type { Margin } from '../cartesian/context-types'
import type { ChartTooltipExtension } from '@tanstack/charts/tooltip'
import { mergeTooltipCarriers } from '../cartesian/tooltip-carriers'
import { tooltipBoxMotion } from '../cartesian/tooltip-motion'
import { barOverlay } from './overlay'
import type { HoverOverlayModel } from '../cartesian/hover-overlay'
import { barFocusStrategy } from './focus'

export interface BarSnapshot<Row> {
  readonly frontCss: string
  readonly overlay: HoverOverlayModel<Row> | null
  readonly data: ReadonlyArray<Row>
  readonly datums: ReadonlyArray<BarDatum<Row>>
  readonly categories: ReadonlyArray<string>
  readonly margin: Margin
  readonly width: number
  readonly height: number
  readonly valueDomain: readonly [number, number]
  readonly valueDomains: Domains
  readonly bandWidth: number
  readonly pulseClips: ReadonlyArray<PulseClip>
  readonly depthTargets: ReadonlyArray<DepthMotionTarget>
  readonly categoryStarts: ReadonlyArray<number>
  readonly labelXs: ReadonlyArray<number>
  readonly focusXs: ReadonlyArray<number>
  readonly hover: ReadonlyArray<HoverTarget>
  readonly tickPositions: ReadonlyArray<number>
  readonly gridAttrs: ReturnType<typeof gridHostAttrs>
}

export type BarValue = string | number

export type BarMark<Row> = ChartMark<
  BarDatum<Row>,
  BarValue,
  BarValue,
  BarValue,
  BarValue,
  'x',
  YScaleId
>

export function buildBarDefinition<Row extends Readonly<Record<string, unknown>>>(
  data: ReadonlyArray<Row>,
  options: {
    readonly id: string
    readonly tooltipExtension?: ChartTooltipExtension
    readonly props: BarChartProps<Row>
    readonly state: Interaction
    readonly onBuilt?: (snapshot: BarSnapshot<Row>) => void
    readonly clock?: () => number
  },
): DomChartDefinition<BarDatum<Row>, BarValue, BarValue> {
  const { props: sourceProps, state } = options
  const props = { ...sourceProps, children: flattenBarLayers(sourceProps.children) }

  const tooltip = mergeTooltipCarriers(
    props.children.filter(
      (child) =>
        child.kind === 'tooltip' ||
        child.kind === 'tooltipDot' ||
        child.kind === 'tooltipIndicator',
    ),
  )

  const series = resolveBarSeries(props.children)
  const bars = series.filter((item) => item.kind === 'bar')
  const horizontal = props.orientation === 'horizontal'
  const stacked = props.stacked === true
  const loading = state.configuration.status === 'loading'
  const categories = data.map((row) => String(row[props.xDataKey ?? 'name']))
  const datums = buildBarData(data, props.xDataKey ?? 'name', series, props.missingValues)

  const domains = configuredBarDomains(datums, categories, series, props)
  const domain: readonly [number, number] = domains.left ?? [0, 100]
  const margin = { top: 40, right: 40, bottom: 40, left: 40, ...props.margin }
  const xAxis = props.children.find((child) => child.kind === 'barXAxis')?.props
  const yAxis = props.children.find((child) => child.kind === 'barYAxis')?.props

  const numericAxes = props.children
    .filter((child) => child.kind === 'yAxis')
    .map((child) => child.props)

  const fixedDepthAxes = new Set(Object.keys(fixedYDomains(numericAxes)))
  const numericAxis = numericAxes.find((axis) => barAxisId(axis.yAxisId) === 'left')
  const grid = props.children.find((child) => child.kind === 'grid')?.props

  const depthOn =
    !horizontal &&
    !stacked &&
    props.children.some(
      (child) => child.kind === 'barDepthProvider' || child.kind === 'barDepthBack',
    )

  const needsSeed =
    depthOn ||
    series.some((item) => item.kind === 'squares') ||
    props.children.some((child) => child.kind === 'barColumnTrack')

  const seed = needsSeed && !state.phaseClockReady
  const duration = state.configuration.animationDuration
  const clock = options.clock ?? (() => 0)

  let plot = { left: margin.left, top: margin.top, width: 0, height: 0 }

  const chart = ({
    width,
    height,
  }: {
    width: number
    height: number
  }): ChartSpec<ReadonlyArray<BarMark<Row>>> => {
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom
    plot = { left: margin.left, top: margin.top, width: innerWidth, height: innerHeight }

    const {
      categoryBand,
      bandWidth,
      valueScale: primaryScale,
    } = barPlot(categories, domain, innerWidth, innerHeight, props)

    const depthScales = barValueScales(domains, innerWidth, innerHeight, horizontal)
    const common = {
      bandWidth,
      depthFrame: {
        bandWidth,
        bandStep: categoryBand.step(),
        categoryStart: (category: string) => (categoryBand(category) ?? Number.NaN) + margin.left,
        valueY: (value: number, key?: string) => {
          const axis = series.find((item) => item.key === key)?.yAxisId ?? 'left'
          const scale = fixedDepthAxes.has(axis)
            ? (depthScales[axis] ?? primaryScale)
            : primaryScale
          return scale(value) + margin.top
        },
        innerWidth,
        plotLeft: margin.left,
      },
      revealed: state.revealReady && state.configuration.status === 'ready',
      datums,
      series,
      categories,
      children: props.children,
      animationDuration: duration,
      faded: bars[0]?.bar?.fadedOpacity ?? 0.3,
      uid: options.id,
      stacked,
      seed,
      clock: { at: Option.getOrNull(state.phaseClockAt), now: clock },
    }

    const { marks, hover, gradients, pulseClips, depthTargets } = buildBarDecorations({
      common,
      bars,
      horizontal,
      loading,
      innerHeight,
    })

    const { categoryScale, valueScale, valueScales, rowGuides, tickValues } = buildBarScales({
      xAxis,
      yAxis,
      numericAxis,
      numericAxes,
      domains,
      grid,
      horizontal,
      categories,
      categoryBand,
      bandWidth,
      domain,
      innerHeight,
    })

    const categoryStarts = categories.map((category) => categoryBand(category) ?? Number.NaN)
    const labelXs = categoryStarts.map((start) => start + bandWidth / 2 + margin.left)
    const ends = horizontal ? barEndValues(datums, stacked) : undefined

    const focusXs = horizontal
      ? categories.map(
          (category) => Math.max(0, primaryScale(ends?.get(category) ?? 0)) + margin.left,
        )
      : labelXs

    function publish(frontCss: string) {
      options.onBuilt?.({
        frontCss,
        categoryStarts,
        labelXs,
        focusXs,
        pulseClips,
        depthTargets,
        overlay:
          tooltip === undefined || loading
            ? null
            : barOverlay(props, datums, categories, series, domain, tooltip),
        hover,
        tickPositions: categories.map((category, index) =>
          tickValues === undefined ? index : tickValues.indexOf(category),
        ),
        data,
        datums,
        categories,
        margin,
        width,
        height,
        valueDomain: domain,
        valueDomains: domains,
        bandWidth,
        gridAttrs: gridHostAttrs(grid),
      })
    }

    const { nativeBars } = nativeBarMarks({
      id: options.id,
      onProjected: (css) => {
        publish(css)
      },
      bars,
      series,
      datums,
      categoryBand,
      bandWidth,
      stacked,
      horizontal,
      loading,
    })

    if (nativeBars.length === 0) {
      publish('')
    }

    return {
      marks: [...(rowGuides?.marks ?? []), ...nativeBars, ...marks],
      margin,
      gradients: [
        ...gradients,
        ...userGradients(props.children.filter((child) => child.kind === 'gradient')),
      ],
      theme: {
        foreground: 'var(--chart-foreground)',
        muted: 'var(--chart-label)',
        grid: 'var(--chart-grid)',
        background: 'transparent',
        palette: [],
      },
      scales: horizontal
        ? { x: valueScale, y: categoryScale }
        : { x: categoryScale, y: valueScale, ...valueScales },
    }
  }

  const chartOptions = {
    controls: [
      sourceYAxisControl({
        id: options.id,
        axes: numericAxes,
        referenceAreas: referenceAreaConfigs(
          props.children.filter((child) => child.kind === 'referenceArea'),
        ),
        ...(horizontal ? { horizontalBarDomains: domains } : {}),
      }),
    ],
    focus: barFocusStrategy<BarDatum<Row>, BarValue, BarValue>({
      categories,
      horizontal,
      plot: () => plot,
    }),
    tooltip:
      tooltip === undefined || loading || options.tooltipExtension === undefined
        ? false
        : {
            use: options.tooltipExtension,
            anchor: { x: 'value', y: 'plot-top' },
            offset: 16,
            sticky: false,
            motion: tooltipBoxMotion(tooltip, useChartConfig(props.environment).tooltipSpring),
          },
    focusRing: false,
    maxFocusDistance: Number.POSITIVE_INFINITY,
    motion: (context) =>
      loading ||
      context.phase === 'update' ||
      (state.updateStep !== 'none' &&
        ['axis', 'axis-label', 'grid', 'tick', 'tick-label'].includes(context.role))
        ? false
        : undefined,
  } satisfies ChartDefinitionOptions<BarDatum<Row>, BarValue, BarValue>

  return defineChart<
    ReadonlyArray<BarMark<Row>>,
    ChartSpec<ReadonlyArray<BarMark<Row>>>,
    typeof chartOptions
  >({ chart }, chartOptions)
}
