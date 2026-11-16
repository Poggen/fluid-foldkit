import { DEFAULT_MARGIN } from './context'
import type { HeatmapChartProps } from './options'
import {
  filterHeatmapColumns,
  rotateHeatmapColumnBins,
  resolveHeatmapDisplayRange,
} from './columns'
import { getHeatmapDayLabels } from './day-labels'
import { resolveHeatmapLevelStyles } from './colors'
import {
  normalizeHeatmapSeparatorConfig,
  resolveHeatmapSeparatorLayout,
  getHeatmapSeparatorLineY,
} from './separators'
import { buildCellData, buildHeatmapDefinition } from './definition'
import type { HeatmapScene } from './focus'
import type { HeatmapEnterClock } from './motion'

export function heatmapPlan(props: HeatmapChartProps, width: number, currentDate: Readonly<Date>) {
  const children = props.children ?? []
  const cells = children.find((c) => c.kind === 'heatmapCells')?.props
  const yAxis = children.find((c) => c.kind === 'heatmapYAxis')?.props
  const tooltip = children.find((c) => c.kind === 'heatmapTooltip')?.props
  const separator = children.find((c) => c.kind === 'heatmapSeparator')?.props
  const margin = { ...DEFAULT_MARGIN, ...props.margin }

  const columns = rotateHeatmapColumnBins(
    filterHeatmapColumns(
      props.data.map((column) => ({ ...column, bins: [...column.bins] })),
      props.xDomain,
    ),
    props.weekStartDay ?? 0,
  )

  const layout = resolveHeatmapSeparatorLayout(
    normalizeHeatmapSeparatorConfig(
      props.columnSeparators ??
        (separator === undefined
          ? undefined
          : {
              ...(separator.spacing === undefined ? {} : { spacing: separator.spacing }),
              ...(separator.every === undefined ? {} : { every: separator.every }),
              ...(separator.groupBy === undefined ? {} : { groupBy: separator.groupBy }),
            }),
    ),
    columns,
    currentDate,
  )

  const gutter = layout === null ? 0 : layout.atColumns.length * layout.spacing

  const cellSize =
    (props.binSize ?? 0) > 0
      ? (props.binSize ?? 0)
      : Math.max(0, (width - margin.left - margin.right - gutter) / Math.max(columns.length, 1))

  const rowCount = columns[0]?.bins.length ?? 7
  const innerWidth = columns.length * cellSize + gutter
  const innerHeight = rowCount * cellSize

  const chartWidth =
    (props.binSize ?? 0) > 0 && (props.layout ?? 'fluid') === 'fluid'
      ? margin.left + innerWidth + margin.right
      : width

  const chartHeight = margin.top + innerHeight + margin.bottom
  const dayLabels = getHeatmapDayLabels(props.weekStartDay ?? 0)

  const data = buildCellData({
    columns,
    dayLabels,
    displayRange:
      (cells?.hideGhostCells ?? true)
        ? resolveHeatmapDisplayRange(columns, currentDate)
        : undefined,
    cellSize,
    layout,
  })

  const levelStyles = resolveHeatmapLevelStyles(props.levelColors, props.levelStyles)

  return {
    cells,
    yAxis,
    tooltip,
    separator,
    margin,
    columns,
    layout,
    cellSize,
    innerWidth,
    innerHeight,
    chartWidth,
    chartHeight,
    dayLabels,
    data,
    levelStyles,
    rowCount,
    hasXAxis: children.some((c) => c.kind === 'heatmapXAxis'),
    hasYAxis: yAxis !== undefined,
  }
}

export function heatmapDefinition(
  props: HeatmapChartProps,
  width: number,
  id: string,
  clock: HeatmapEnterClock,
  getScene: () => HeatmapScene | null,
  currentDate: Readonly<Date>,
  entered = true,
) {
  const p = heatmapPlan(props, width, currentDate)
  let epoch = 0

  for (const char of props.revealSignature ?? '') {
    epoch = (epoch * 31 + (char.codePointAt(0) ?? 0)) % 1_000_003
  }

  const span = getHeatmapSeparatorLineY({
    innerHeight: p.innerHeight,
    marginTop: p.margin.top,
    paddingY: p.separator?.paddingY ?? 0,
    ...(p.separator?.startOffset === undefined ? {} : { startOffset: p.separator.startOffset }),
  })

  return buildHeatmapDefinition({
    getScene,
    status: props.status ?? 'ready',
    columns: p.cells === undefined ? [] : p.columns,
    dayLabels: p.dayLabels,
    cellData: p.cells === undefined ? [] : p.data,
    cellSize: p.cellSize,
    gap: props.gap ?? 2,
    margin: p.margin,
    innerWidth: p.innerWidth,
    layout: p.layout,
    separator: p.separator ?? null,
    levelStyles: p.levelStyles,
    patternIdPrefix: id,
    cornerRadius: p.cells?.cornerRadius ?? 2,
    rowOpacity: p.cells?.rowOpacity,
    yAxis: {
      tickFilter: p.yAxis?.tickFilter ?? 'odd',
      labelFormat: p.yAxis?.labelFormat ?? 'full',
      rowOpacity: p.yAxis?.rowOpacity,
    },
    tooltipEnabled: p.tooltip !== undefined && (p.cells?.interactive ?? true),
    tooltipInstant: p.tooltip?.instant ?? false,
    tooltipHideDelay: p.tooltip?.hideDelay ?? 120,
    tooltipClassName: p.tooltip?.className ?? '',
    animateCells: (props.animate ?? true) && (props.animationDuration ?? 1600) > 0,
    animationDuration: props.animationDuration ?? 1600,
    enterTransition: props.enterTransition,
    enterStaggerScale: props.enterStaggerScale ?? 1,
    revealEpoch: epoch,
    revealKey: props.revealSignature ?? '',
    enterClock: clock,
    seedOnly:
      (props.animate ?? true) &&
      (props.animationDuration ?? 1600) > 0 &&
      !entered &&
      (props.status ?? 'ready') === 'ready',
    interactive: p.cells?.interactive ?? true,
    loadingCellRandomness: props.loadingCellRandomness ?? 1,
    loadingShimmer: (props.animate ?? true) && (props.showLoadingCells ?? true),
    separatorGradientId: `${id}-separator`,
    separatorSpan: span,
    showXAxis: p.hasXAxis,
    showYAxis: p.hasYAxis,
  })
}
