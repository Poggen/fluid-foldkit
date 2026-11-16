import { Predicate } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ScaleBand, ScaleLinear, ScaleTime } from 'd3-scale'
import type { ChartPhase, ChartStatus } from '../kit/motion/phase'
import type { ChartSelection } from './tooltip-options'
import type { Margin, RegisteredLineConfig, ReferenceAreaConfig } from './context-types'
import { DEFAULT_Y_AXIS_ID } from './series'

export const chartCssVars = {
  background: 'var(--chart-background)',
  foreground: 'var(--chart-foreground)',
  foregroundMuted: 'var(--chart-foreground-muted)',
  label: 'var(--chart-label)',
  linePrimary: 'var(--chart-line-primary)',
  lineSecondary: 'var(--chart-line-secondary)',
  crosshair: 'var(--chart-crosshair)',
  grid: 'var(--chart-grid)',
  indicatorColor: 'var(--chart-indicator-color)',
  indicatorSecondaryColor: 'var(--chart-indicator-secondary-color)',
  markerBackground: 'var(--chart-marker-background)',
  markerBorder: 'var(--chart-marker-border)',
  markerForeground: 'var(--chart-marker-foreground)',
  badgeBackground: 'var(--chart-marker-badge-background)',
  badgeForeground: 'var(--chart-marker-badge-foreground)',
  segmentBackground: 'var(--chart-segment-background)',
  segmentLine: 'var(--chart-segment-line)',
  brushBorder: 'var(--chart-brush-border)',
  tooltipBackground: 'var(--chart-tooltip-background)',
}

export const defaultScatterColors: readonly [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export interface ChartContainerRef {
  current: HTMLDivElement | null
}

export interface TooltipData<Row = object> {
  readonly point: Row
  readonly index: number
  readonly x: number
  readonly yPositions: Readonly<Record<string, number>>
  readonly xPositions?: Readonly<Record<string, number>>
}

export type TooltipUpdate<Row> =
  | TooltipData<Row>
  | null
  | ((previous: null) => TooltipData<Row> | null)

export interface ChartHoverContextValue<Row = object, Action = void> {
  readonly tooltipData: TooltipData<Row> | null
  readonly setTooltipData: (next: TooltipUpdate<Row>) => Action
  readonly selection?: ChartSelection | null
  readonly clearSelection?: () => Action
  readonly hoveredBarIndex?: number | null
  readonly setHoveredBarIndex?: (index: number | null) => Action
  readonly hoveredCandleIndex?: number | null
  readonly setHoveredCandleIndex?: (index: number | null) => Action
}

export interface ChartStableContextValue<Row = object> {
  readonly data: ReadonlyArray<Row>
  readonly renderData: ReadonlyArray<Row>
  readonly xScale: ScaleTime<number, number>
  readonly yScale: ScaleLinear<number, number>
  readonly yScales: Readonly<Record<string, ScaleLinear<number, number>>>
  readonly width: number
  readonly height: number
  readonly innerWidth: number
  readonly innerHeight: number
  readonly margin: Margin
  readonly containerRef: Readonly<ChartContainerRef>
  readonly lines: ReadonlyArray<RegisteredLineConfig>
  readonly animationDuration: number
  readonly isLoaded: boolean
  readonly chartPhase: ChartPhase
  readonly chartStatus: ChartStatus
  readonly yDomainTargetByAxis: Readonly<Record<string, readonly [number, number]>>
  readonly referenceAreas: ReadonlyArray<ReferenceAreaConfig>
  readonly xAccessor: (row: Row) => Date
  readonly dateLabels: ReadonlyArray<string>
  readonly xDomain?: readonly [Date, Date]
  readonly xDomainSlotCount?: number | undefined
  readonly columnWidth?: number
  readonly bandWidth?: number
  readonly barScale?: ScaleBand<string>
  readonly barXAccessor?: (row: Row) => string
  readonly orientation?: 'vertical' | 'horizontal'
  readonly stacked?: boolean
  readonly stackOffsets?: ReadonlyMap<number, ReadonlyMap<string, number>> | undefined
  readonly composedBarDataKeys?: ReadonlyArray<string>
  readonly composedBarSize?: number | undefined
  readonly composedMaxBarSize?: number | undefined
  readonly composedBarGap?: number
  readonly composedStacked?: boolean
  readonly composedStackGap?: number
}

export type ChartContextValue<Row = object, Action = void> = ChartStableContextValue<Row> &
  ChartHoverContextValue<Row, Action>

export interface ChartViewContext<Row = object, Action = void> {
  readonly stable: ChartStableContextValue<Row>
  readonly hover: ChartHoverContextValue<Row, Action>
}

/** The registered parent supplies both slices and public-operation capabilities; no ambient owner is created. */
export function ChartProvider<Row, Action, Result>(props: {
  readonly value: ChartViewContext<Row, Action>
  readonly children: (context: ChartViewContext<Row, Action>) => Result
}): Result {
  return props.children(props.value)
}

const missing =
  ' must be used within a ChartProvider. Make sure your component is rendered inside the tooltip content or children of <LineChart> or <AreaChart>.'

export function useChartStable<Row = object, Action = void>(
  context?: ChartViewContext<Row, Action>,
): ChartStableContextValue<Row> {
  if (context === undefined) {
    throw new Error(`useChartStable${missing}`)
  }

  return context.stable
}

export function useChartHover<Row = object, Action = void>(
  context?: ChartViewContext<Row, Action>,
): ChartHoverContextValue<Row, Action> {
  if (context === undefined) {
    throw new Error(`useChartHover${missing}`)
  }

  return context.hover
}

export function useChart<Row = object, Action = void>(
  context?: ChartViewContext<Row, Action>,
): ChartContextValue<Row, Action> {
  return { ...useChartStable(context), ...useChartHover(context) }
}

export function useYScale<Row, Action>(
  context: ChartViewContext<Row, Action>,
  yAxisId?: string | number,
): ScaleLinear<number, number> {
  const { yScales, yScale } = useChartStable(context)
  const id = yAxisId === undefined || yAxisId === '' ? DEFAULT_Y_AXIS_ID : String(yAxisId)

  return yScales[id] ?? yScale
}

/** Source updater semantics: the renderer owns focus, so updater functions receive null. */
export function tooltipSetter<Row, Action>(
  focusRow: (index: number | null) => Action,
): (next: TooltipUpdate<Row>) => Action {
  return (update) => {
    const value = Predicate.isFunction(update) ? update(null) : update

    return focusRow(value === null ? null : value.index)
  }
}

export interface ChartContextCapabilities<Row, Message> {
  readonly focusRow: (index: number | null) => Message
  readonly setTooltipData: (next: TooltipUpdate<Row>) => Message
  readonly clearSelection: () => Message
}

export type ChartContextRenderer<Row> = <Message, Mounts>(
  context: ChartViewContext<Row, Message>,
  h: HtmlBuilder<Message, Mounts>,
) => Html
