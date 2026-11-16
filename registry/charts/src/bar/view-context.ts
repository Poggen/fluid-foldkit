import type { BarSnapshot } from './definition'
import { DateTime, Predicate, Schema } from 'effect'
import { scaleUtc } from 'd3-scale'
import type {
  ChartContainerRef,
  ChartContextCapabilities,
  ChartStableContextValue,
} from '../cartesian/chart-context'
import { useBridgedContext } from '../cartesian/context-bridge'
import { referenceAreaConfigs } from '../cartesian/reference-area'
import type { Interaction } from '../cartesian/state'
import type { ChartViewport } from '../cartesian/viewport'
import type { BarChartProps } from './options'
import type { BarDepthConfig, BarViewContext } from './depth-entries'
import { buildBarData, barValueDomains, resolveBarSeries, flattenBarLayers } from './model'
import { barPlot, barValueScales } from './plot'

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

const isBarValue = Schema.is(Schema.Number)

const indexDate = (index: number): Date => DateTime.toDateUtc(DateTime.makeUnsafe(index))

function stackOffsets<Row>(
  data: ReadonlyArray<Row>,
  keys: ReadonlyArray<string>,
  valueOf: (row: Row, key: string) => number,
): ReadonlyMap<number, ReadonlyMap<string, number>> {
  return new Map(
    data.map((row, index) => {
      let cumulative = 0
      const offsets = new Map<string, number>()

      for (const key of keys) {
        offsets.set(key, cumulative)
        cumulative += valueOf(row, key)
      }

      return [index, offsets]
    }),
  )
}

export function barViewport(
  snapshot: Pick<BarSnapshot<unknown>, 'width' | 'height' | 'margin' | 'data'>,
): ChartViewport {
  return {
    width: snapshot.width,
    height: snapshot.height,
    margin: snapshot.margin,
    xDomain: [0, Math.max(1, snapshot.data.length - 1)],
  }
}

function barContextGeometry(
  requestedMargin: BarChartProps<never>['margin'],
  viewport: ChartViewport | undefined,
  revealReady: boolean,
) {
  const width = viewport?.width ?? 0
  const height = viewport?.height ?? 0

  const margin = viewport?.margin ?? {
    top: 40,
    right: 40,
    bottom: 40,
    left: 40,
    ...requestedMargin,
  }

  const innerWidth = Math.max(0, width - margin.left - margin.right)
  const innerHeight = Math.max(0, height - margin.top - margin.bottom)
  const loaded = revealReady && viewport !== undefined

  return { width, height, margin, innerWidth, innerHeight, loaded }
}

/** One checked input scope derives bar presentation; focus remains in the parent Block. */
export function projectBarViewContext<Row extends Readonly<Record<string, unknown>>>(
  props: BarChartProps<Row>,
  containerRef: ChartContainerRef,
) {
  const series = resolveBarSeries(props.children)

  const provider = flattenBarLayers(props.children).find(
    (child) => child.kind === 'barDepthProvider',
  )

  const segmentsAccessor = provider?.props.segmentsAccessor
  const minBarHeight = provider?.props.minBarHeight

  let depthConfig: BarDepthConfig<Row> =
    props.missingValues === undefined ? {} : { missingValues: props.missingValues }

  if (segmentsAccessor !== undefined) {
    depthConfig = { ...depthConfig, segmentsAccessor }
  }

  if (minBarHeight !== undefined) {
    depthConfig = { ...depthConfig, minBarHeight }
  }

  const lines = series.map((item) => ({
    dataKey: item.key,
    stroke: item.fill,
    strokeWidth: 2,
    yAxisId: item.yAxisId,
  }))
  const categoryOf = (row: Row): string => String(row[props.xDataKey ?? 'name'])

  const references = referenceAreaConfigs(
    props.children.filter((child) => child.kind === 'referenceArea'),
  )

  const horizontal = props.orientation === 'horizontal'
  let lastData: ReadonlyArray<Row> | undefined
  let lastKey: string | undefined
  let stable: ChartStableContextValue<Row> | undefined

  return <Message>(
    data: ReadonlyArray<Row>,
    index: number | null,
    state: Interaction,
    viewport: ChartViewport | undefined,
    capabilities: ChartContextCapabilities<Row, Message>,
  ): BarViewContext<Row, Message> => {
    const { width, height, margin, innerWidth, innerHeight, loaded } = barContextGeometry(
      props.margin,
      viewport,
      state.revealReady,
    )

    const key = JSON.stringify([
      width,
      height,
      margin,
      loaded,
      state.configuration.animationDuration,
    ])

    if (stable === undefined || lastData !== data || lastKey !== key) {
      const categories = data.map(categoryOf)
      const bandLength = horizontal ? innerHeight : innerWidth

      const domains = barValueDomains(
        buildBarData(data, props.xDataKey ?? 'name', series, props.missingValues),
        categories,
        series,
        horizontal,
        props.stacked === true,
      )
      const domain: readonly [number, number] = domains.left ?? [0, 100]

      const { categoryBand: barScale, bandWidth } = barPlot(
        categories,
        domain,
        innerWidth,
        innerHeight,
        props,
      )

      const centre = (rowIndex: number): number =>
        (barScale(categories[rowIndex] ?? '') ?? 0) + bandWidth / 2

      const xScale = scaleUtc()
        .domain([indexDate(0), indexDate(Math.max(1, data.length - 1))])
        .range(
          horizontal || data.length === 0
            ? [0, innerWidth]
            : [centre(0), centre(Math.max(1, data.length - 1))],
        )

      const rowIndex = new Map(data.map((row, position) => [row, position]))
      const { focusRow } = capabilities

      const bridged = useBridgedContext({
        data,
        margin,
        size: { width, height },
        containerRef,
        ready: loaded,
        xScale,
        yScales: barValueScales(domains, innerWidth, innerHeight, horizontal),
        lines,
        animationDuration: state.configuration.animationDuration,
        xAccessor: (row) => indexDate(rowIndex.get(row) ?? 0),
        dateLabels: data.map((row) => {
          const value = row[props.xDataKey ?? 'name']

          return Predicate.isDate(value) ? shortDate.format(value) : String(value)
        }),
        focused: null,
        focusRow,
        referenceAreas: references,
        extras: {
          barScale,
          barXAccessor: categoryOf,
          orientation: props.orientation ?? 'vertical',
          stacked: props.stacked === true,
          stackOffsets:
            props.stacked === true
              ? stackOffsets(
                  data,
                  lines.map((line) => line.dataKey),
                  (row, field) => {
                    const value = row[field]

                    return isBarValue(value) ? value : 0
                  },
                )
              : undefined,
          bandWidth,
          columnWidth: data.length > 0 ? bandLength / data.length : 0,
        },
      })

      const { tooltipData: _tooltip, setTooltipData: _setter, ...nextStable } = bridged
      stable = nextStable
      lastData = data
      lastKey = key
    }

    const row = index === null ? undefined : data[index]
    const focused = row === undefined || index === null ? null : { row, index }

    const bridged = useBridgedContext({
      data,
      margin: stable.margin,
      size: { width: stable.width, height: stable.height },
      containerRef,
      ready: stable.isLoaded,
      xScale: stable.xScale,
      yScales: stable.yScales,
      lines: stable.lines,
      animationDuration: stable.animationDuration,
      xAccessor: stable.xAccessor,
      dateLabels: stable.dateLabels,
      focused,
      focusRow: capabilities.focusRow,
      xAt: (point) =>
        (stable?.barScale?.(categoryOf(point.row)) ?? 0) + (stable?.bandWidth ?? 0) / 2,
    })

    return {
      stable,
      depthConfig,
      hover: {
        tooltipData: bridged.tooltipData,
        setTooltipData: capabilities.setTooltipData,
        hoveredBarIndex: index,
        setHoveredBarIndex: capabilities.focusRow,
      },
    }
  }
}
