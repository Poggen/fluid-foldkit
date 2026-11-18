import { scaleLinear, scaleUtc } from 'd3-scale'
import type { ScaleLinear, ScaleTime } from 'd3-scale'
import type { ChartContextValue, ChartStableContextValue, TooltipData } from './chart-context'
import { tooltipSetter } from './chart-context'
import { DEFAULT_Y_AXIS_ID } from './series'
import { isNumber } from '../kit/guards'

export const valueScale: (
  domain: readonly [number, number],
  innerHeight: number,
  nice?: boolean,
) => ScaleLinear<number, number> = function (
  domain: readonly [number, number],
  innerHeight: number,
  nice = false,
) {
  const scale = scaleLinear()
    .domain([...domain])
    .range([innerHeight, 0])

  return (nice ? scale.nice() : scale) satisfies ScaleLinear<number, number>
}

/** Derived presentation only. The checked parent owns inputs, focus and operation capabilities. */
export const useBridgedContext: <Row extends Readonly<Record<string, unknown>>, Action>(
  input: BridgeInput<Row, Action>,
) => ChartContextValue<Row, Action> = function useBridgedContext<
  Row extends Readonly<Record<string, unknown>>,
  Action,
>(input: BridgeInput<Row, Action>) {
  const { data, margin, size, containerRef, xScale, yScales, lines, focused, xAccessor } = input
  const innerWidth = Math.max(0, size.width - margin.left - margin.right)
  const innerHeight = Math.max(0, size.height - margin.top - margin.bottom)

  const yScale =
    new Map(Object.entries(yScales)).get(DEFAULT_Y_AXIS_ID) ??
    Object.values(yScales).at(0) ??
    scaleLinear().domain([0, 100]).range([innerHeight, 0])

  const yDomainTargetByAxis = Object.fromEntries(
    Object.entries(yScales).map(([id, scale]) => {
      const [min = 0, max = 0] = scale.domain()

      return [id, [min, max]] satisfies [string, readonly [number, number]]
    }),
  )

  let tooltipData: TooltipData<Row> | null = null

  if (focused !== null) {
    const yPositions: Record<string, number> = {}

    for (const line of lines) {
      const value = focused.row[line.dataKey]

      if (isNumber(value)) {
        yPositions[line.dataKey] = (yScales[String(line.yAxisId ?? DEFAULT_Y_AXIS_ID)] ?? yScale)(
          value,
        )
      }
    }

    tooltipData = {
      point: focused.row,
      index: focused.index,
      x: input.xAt === undefined ? xScale(xAccessor(focused.row)) : input.xAt(focused),
      yPositions,
    }
  }

  return {
    data,
    renderData: data,
    margin,
    containerRef,
    xScale,
    yScale,
    yScales,
    lines,
    width: size.width,
    height: size.height,
    innerWidth,
    innerHeight,
    animationDuration: input.animationDuration,
    isLoaded: input.ready,
    chartPhase: input.ready ? 'ready' : 'revealing',
    chartStatus: 'ready',
    yDomainTargetByAxis,
    referenceAreas: input.referenceAreas ?? [],
    xAccessor,
    dateLabels: input.dateLabels,
    ...input.extras,
    tooltipData,
    setTooltipData: tooltipSetter(input.focusRow),
  } satisfies ChartContextValue<Row, Action>
}

export const timeScale: (
  domain: readonly [Date, Date],
  innerWidth: number,
) => ScaleTime<number, number> = (domain: readonly [Date, Date], innerWidth: number) =>
  scaleUtc()
    .domain([...domain])
    .range([0, innerWidth])

export interface FocusedRow<Row> {
  readonly row: Row
  readonly index: number
}

export interface BridgeInput<Row, Action> {
  readonly data: ReadonlyArray<Row>
  readonly margin: ChartStableContextValue<Row>['margin']
  readonly size: { readonly width: number; readonly height: number }
  readonly containerRef: ChartStableContextValue<Row>['containerRef']
  readonly ready: boolean
  readonly xScale: ChartStableContextValue<Row>['xScale']
  readonly yScales: ChartStableContextValue<Row>['yScales']
  readonly lines: ChartStableContextValue<Row>['lines']
  readonly animationDuration: number
  readonly xAccessor: (row: Row) => Date
  readonly dateLabels: ReadonlyArray<string>
  readonly focused: FocusedRow<Row> | null
  readonly xAt?: (focused: FocusedRow<Row>) => number
  readonly extras?: Partial<ChartContextValue<Row, Action>>
  readonly focusRow: (index: number | null) => Action
  readonly referenceAreas?: ChartStableContextValue<Row>['referenceAreas']
}
