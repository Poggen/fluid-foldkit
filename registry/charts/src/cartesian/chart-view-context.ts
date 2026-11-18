import { fixedYDomains } from './domains'
import { Predicate, DateTime, Option } from 'effect'
import { projectScatterDomains } from '../scatter/context-domains'
import type { RegisteredLineConfig, Margin } from './context-types'
import { referenceAreaConfigs } from './reference-area'
import type { ScaleLinear } from 'd3-scale'
import { timeScale, valueScale, useBridgedContext } from './context-bridge'
import type {
  ChartContextCapabilities,
  ChartHoverContextValue,
  ChartStableContextValue,
  ChartViewContext,
} from './chart-context'
import type { ChartViewport } from './viewport'
import type { TimeSeriesProps } from './root-options'
import { loadingFlags, timeSeriesChartPhase } from './state'
import type { Interaction, Domains } from './state'
import { resolveSeries } from './series'

const contextExtras: <Row>(
  family: TimeSeriesContextFamily<Row>,
  columnWidth: number,
  visibleDomain: readonly [Date, Date] | undefined,
  requestedSlots: number | undefined,
  rowCount: number,
  innerWidth: number,
) => ContextExtras<Row> = function contextExtras<Row>(
  family: TimeSeriesContextFamily<Row>,
  columnWidth: number,
  visibleDomain: readonly [Date, Date] | undefined,
  requestedSlots: number | undefined,
  rowCount: number,
  innerWidth: number,
) {
  const kind = Predicate.isString(family) ? family : family.kind
  let extras: ContextExtras<Row> = {}

  if (kind === 'line' || kind === 'area') {
    extras = { ...extras, columnWidth }

    if (visibleDomain !== undefined) {
      extras = {
        ...extras,
        xDomain: [visibleDomain[0], visibleDomain[1]],
        xDomainSlotCount: requestedSlots,
      }
    }
  }

  if (!Predicate.isString(family) && family.kind === 'composed') {
    extras = { ...extras, ...family.extras }
  }

  if (!Predicate.isString(family) && family.kind === 'candlestick') {
    const slots = requestedSlots ?? rowCount
    const candleColumnWidth = slots > 0 ? innerWidth / slots : 0
    extras = {
      ...extras,
      columnWidth: candleColumnWidth,
      bandWidth: family.candleWidth ?? candleColumnWidth * (1 - family.candleGap),
    }
  }

  return extras satisfies ContextExtras<Row>
}

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

function contextGeometry(
  requestedMargin: Partial<Margin> | undefined,
  viewport: ChartViewport | undefined,
  domains: Domains,
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

  const xDomain: readonly [Date, Date] =
    viewport === undefined
      ? [DateTime.toDateUtc(DateTime.makeUnsafe(0)), DateTime.toDateUtc(DateTime.makeUnsafe(0))]
      : [
          DateTime.toDateUtc(DateTime.makeUnsafe(viewport.xDomain[0])),
          DateTime.toDateUtc(DateTime.makeUnsafe(viewport.xDomain[1])),
        ]

  const yDomains = viewport === undefined ? {} : domains

  return { width, height, margin, innerWidth, innerHeight, xDomain, yDomains }
}

function contextWindow<Row>(
  props: Pick<TimeSeriesProps<Row>, 'xDomain' | 'xDomainSlotCount'>,
  data: ReadonlyArray<Row>,
  x: (row: Row) => Date,
  brush: Interaction['brush'],
  innerWidth: number,
) {
  const visibleDomain: readonly [Date, Date] | undefined = Option.isSome(brush)
    ? [
        DateTime.toDateUtc(DateTime.makeUnsafe(brush.value.start)),
        DateTime.toDateUtc(DateTime.makeUnsafe(brush.value.end)),
      ]
    : props.xDomain

  const visibleRows =
    visibleDomain === undefined
      ? data
      : data.filter((row) => {
          const value = x(row).getTime()

          return (
            value >= (visibleDomain[0]?.getTime() ?? 0) &&
            value <= (visibleDomain[1]?.getTime() ?? 0)
          )
        })

  const slots =
    visibleDomain !== undefined && props.xDomainSlotCount !== undefined
      ? props.xDomainSlotCount
      : visibleRows.length

  const columnWidth = slots < 2 ? 0 : innerWidth / (slots - 1)

  return { visibleDomain, columnWidth }
}

interface ComposedContextExtension {
  readonly kind: 'composed'
  readonly lines: ReadonlyArray<RegisteredLineConfig>
  readonly extras: Pick<
    ChartStableContextValue,
    | 'composedBarDataKeys'
    | 'composedBarSize'
    | 'composedMaxBarSize'
    | 'composedBarGap'
    | 'composedStacked'
    | 'composedStackGap'
  >
}

export interface CandlestickContext<Row> {
  readonly kind: 'candlestick'
  readonly domains: (
    data: ReadonlyArray<Row>,
    xDomain: readonly [Date, Date] | undefined,
  ) => { readonly x: readonly [Date, Date]; readonly y: readonly [number, number] }
  readonly candleWidth: number | undefined
  readonly candleGap: number
}

export type TimeSeriesContextFamily<Row> =
  | 'line'
  | 'area'
  | 'scatter'
  | CandlestickContext<Row>
  | ComposedContextExtension

function familyContextDomains<Row extends Readonly<Record<string, unknown>>>(
  props: TimeSeriesProps<Row>,
  family: TimeSeriesContextFamily<Row>,
  scatter: ReturnType<typeof projectScatterDomains<Row>> | undefined,
  data: ReadonlyArray<Row>,
  visibleDomain: readonly [Date, Date] | undefined,
  geometry: ReturnType<typeof contextGeometry>,
  phase: Interaction['phase'],
  measured: boolean,
) {
  const kind = Predicate.isString(family) ? family : family.kind
  const { width, margin } = geometry
  let { xDomain, yDomains } = geometry
  let lines: ReadonlyArray<RegisteredLineConfig>

  if (scatter !== undefined) {
    const resolved = scatter(data, width, margin)

    ;({ xDomain, yDomains, lines } = resolved)
  } else if (!Predicate.isString(family) && family.kind === 'candlestick') {
    const domains = family.domains(data, visibleDomain)

    ;({ x: xDomain } = domains)
    yDomains = { left: domains.y }
    lines = [{ dataKey: 'close', stroke: 'var(--chart-line-primary)', strokeWidth: 2 }]
  } else {
    if (kind === 'composed' && !measured) {
      xDomain = [
        DateTime.toDateUtc(DateTime.makeUnsafe(0)),
        DateTime.toDateUtc(DateTime.makeUnsafe(1)),
      ]
    }

    lines = [
      ...resolveSeries(props.children, loadingFlags(phase).chartLoading)
        .filter((line) => line.kind !== 'pattern')
        .map(({ dataKey, stroke, strokeWidth, yAxisId }) => ({
          dataKey,
          stroke,
          strokeWidth,
          yAxisId,
        })),
      ...(!Predicate.isString(family) && family.kind === 'composed' ? family.lines : []),
    ]
  }

  if (kind === 'line' || kind === 'area' || kind === 'composed') {
    yDomains = {
      ...yDomains,
      ...fixedYDomains(
        props.children.filter((child) => child.kind === 'yAxis').map((child) => child.props),
        props.yDomain,
      ),
    }
  }
  return { xDomain, yDomains, lines }
}

type ContextExtras<Row> = Pick<
  ChartStableContextValue<Row>,
  | 'columnWidth'
  | 'xDomain'
  | 'xDomainSlotCount'
  | 'composedBarDataKeys'
  | 'composedBarSize'
  | 'composedMaxBarSize'
  | 'composedBarGap'
  | 'composedStacked'
  | 'composedStackGap'
  | 'bandWidth'
>

/** One input scope owns its derived context cache; rows and hover remain in the checked parent. */
export function projectTimeSeriesViewContext<Row extends Readonly<Record<string, unknown>>>(
  props: TimeSeriesProps<Row>,
  x: (row: Row) => Date,
  containerRef: ChartStableContextValue<Row>['containerRef'],
  family: TimeSeriesContextFamily<Row>,
) {
  const kind = Predicate.isString(family) ? family : family.kind
  const scatter = kind === 'scatter' ? projectScatterDomains(props.children, x) : undefined
  const referenceAreas = referenceAreaConfigs(props.children)
  let lastData: ReadonlyArray<Row> | undefined
  let lastKey: string | undefined
  let stable: ChartStableContextValue<Row> | undefined
  const project: <Message>(
    data: ReadonlyArray<Row>,
    index: number | null,
    state: Interaction,
    viewport: ChartViewport | undefined,
    capabilities: ChartContextCapabilities<Row, Message>,
  ) => ChartViewContext<Row, Message> = <Message>(
    data: ReadonlyArray<Row>,
    index: number | null,
    state: Interaction,
    viewport: ChartViewport | undefined,
    capabilities: ChartContextCapabilities<Row, Message>,
  ) => {
    const geometry = contextGeometry(props.margin, viewport, state.domains)
    const { width, height, margin, innerWidth, innerHeight } = geometry
    const { visibleDomain, columnWidth } = contextWindow(props, data, x, state.brush, innerWidth)

    const { xDomain, yDomains, lines } = familyContextDomains(
      props,
      family,
      scatter,
      data,
      visibleDomain,
      geometry,
      state.phase,
      viewport !== undefined,
    )

    const dateLabels =
      lastData === data && stable !== undefined
        ? stable.dateLabels
        : data.map((row) => shortDate.format(x(row)))

    const phaseContext =
      viewport !== undefined && (kind === 'line' || kind === 'area')
        ? {
            chartPhase: timeSeriesChartPhase(state),
            chartStatus: state.configuration.status,
          }
        : {}

    const key = JSON.stringify([
      width,
      height,
      margin,
      xDomain.map(Number),
      yDomains,
      lines,
      dateLabels,
      state.revealReady && viewport !== undefined,
      state.configuration.animationDuration,
      visibleDomain?.map(Number),
      props.xDomainSlotCount,
      columnWidth,
      phaseContext,
    ])

    if (stable === undefined || lastData !== data || lastKey !== key) {
      const yScales = Object.fromEntries(
        Object.entries(yDomains).map(
          ([id, domain]) =>
            [id, valueScale(domain, innerHeight)] satisfies [string, ScaleLinear<number, number>],
        ),
      )

      const extras = contextExtras(
        family,
        columnWidth,
        visibleDomain,
        props.xDomainSlotCount,
        data.length,
        innerWidth,
      )

      const value = useBridgedContext({
        data,
        margin,
        size: { width, height },
        containerRef,
        ready: state.revealReady && viewport !== undefined,
        xScale: timeScale([xDomain[0], xDomain[1]], innerWidth),
        yScales,
        lines,
        referenceAreas,
        animationDuration: state.configuration.animationDuration,
        xAccessor: x,
        dateLabels,
        focused: null,
        focusRow: capabilities.focusRow,
        extras: { ...extras, ...phaseContext },
      })

      const { tooltipData: _tooltip, setTooltipData: _setter, ...nextStable } = value
      stable = nextStable
      lastData = data
      lastKey = key
    }

    const point = index === null ? undefined : data[index]

    const hovered = useBridgedContext({
      data,
      margin: stable.margin,
      size: { width: stable.width, height: stable.height },
      containerRef,
      ready: stable.isLoaded,
      xScale: stable.xScale,
      yScales: stable.yScales,
      lines: stable.lines,
      animationDuration: stable.animationDuration,
      xAccessor: x,
      dateLabels: stable.dateLabels,
      focused: point === undefined || index === null ? null : { row: point, index },
      focusRow: capabilities.focusRow,
    })

    let hover: ChartHoverContextValue<Row, Message> = {
      tooltipData: hovered.tooltipData,
      setTooltipData: capabilities.setTooltipData,
      selection: Option.getOrNull(state.selection),
      clearSelection: capabilities.clearSelection,
    }

    if (kind === 'candlestick') {
      hover = { ...hover, hoveredCandleIndex: index, setHoveredCandleIndex: capabilities.focusRow }
    }

    if (!Predicate.isString(family) && family.kind === 'composed' && family.lines.length > 0) {
      hover = { ...hover, setHoveredBarIndex: capabilities.focusRow }
    }

    return { stable, hover } satisfies ChartViewContext<Row, Message>
  }

  return project
}
