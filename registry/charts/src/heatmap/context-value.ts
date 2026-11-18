import type { HeatmapChartProps } from './options'
import type { HeatmapContextValue } from './context'
import { heatmapPlan } from './build'
import { columnStartX } from './definition'
import { getHeatmapTimeExtent } from './columns'
import { buildHeatmapColorScaleFromStyles, buildHeatmapFillScale } from './colors'
import { linearScale, timeScale } from './scales'
import { formatHeatmapContributionLabel } from './format'
import { DateTime } from 'effect'

export const heatmapContext: (
  props: HeatmapChartProps,
  width: number,
  currentDate: Readonly<Date>,
  containerRef?: { readonly current: HTMLDivElement | null },
) => HeatmapContextValue = function heatmapContext(
  props: HeatmapChartProps,
  width: number,
  currentDate: Readonly<Date>,
  containerRef: { readonly current: HTMLDivElement | null } = { current: null },
) {
  const p = heatmapPlan(props, width, currentDate)
  let revealEpoch = 0

  for (const char of props.revealSignature ?? '') {
    revealEpoch = (revealEpoch * 31 + (char.codePointAt(0) ?? 0)) % 1_000_003
  }

  const zero = DateTime.toDateUtc(DateTime.makeUnsafe(0))

  const tooltip =
    p.tooltip === undefined
      ? null
      : {
          formatLabel: p.tooltip.formatLabel ?? formatHeatmapContributionLabel,
          className: p.tooltip.className ?? '',
          instant: p.tooltip.instant ?? false,
          showDelay: p.tooltip.showDelay ?? 0,
          hideDelay: p.tooltip.hideDelay ?? 120,
          ...(p.tooltip.panelStyle === undefined ? {} : { panelStyle: p.tooltip.panelStyle }),
          ...(p.tooltip.backgroundColor === undefined
            ? {}
            : { backgroundColor: p.tooltip.backgroundColor }),
        }

  return {
    data: p.columns,
    binWidth: p.cellSize,
    binHeight: p.cellSize,
    gap: props.gap ?? 2,
    margin: p.margin,
    width: p.chartWidth,
    height: p.chartHeight,
    fixedWidth: undefined,
    innerWidth: p.innerWidth,
    innerHeight: p.innerHeight,
    columnCount: p.columns.length,
    rowCount: p.rowCount,
    separatorLayout: p.layout,
    xScale: (column) => columnStartX(column, p.cellSize, p.layout),
    yScale: (row) => row * p.cellSize,
    timeXScale: timeScale(getHeatmapTimeExtent(p.columns) ?? [zero, zero], [0, p.innerWidth]),
    brushYScale: linearScale([0, 1], [p.innerHeight, 0]),
    containerRef,
    isReady: p.chartWidth >= 10 && p.chartHeight >= 10,
    levelStyles: p.levelStyles,
    colorScale: props.colorScale ?? buildHeatmapColorScaleFromStyles(p.levelStyles),
    fillScale: buildHeatmapFillScale(p.levelStyles),
    hasCustomColorScale: props.colorScale !== undefined,
    weekStartDay: props.weekStartDay ?? 0,
    chartStatus: props.status ?? 'ready',
    chartPhase: props.status === 'loading' ? 'loading' : 'ready',
    isLoaded: props.status !== 'loading',
    revealEpoch,
    animationDuration: props.animationDuration ?? 1600,
    ...(props.enterTransition === undefined ? {} : { enterTransition: props.enterTransition }),
    enterStaggerScale: props.enterStaggerScale ?? 1,
    animateCells: (props.animate ?? true) && (props.animationDuration ?? 1600) > 0,
    loadingOpacity: props.loadingOpacity ?? 1,
    showLoadingCells: props.showLoadingCells ?? true,
    loadingCellMaxOpacity: props.loadingCellMaxOpacity ?? 0.85,
    loadingCellRandomness: props.loadingCellRandomness ?? 1,
    revealMode: null,
    ...(props.loadingLabel === undefined ? {} : { loadingLabel: props.loadingLabel }),
    showLoadingLabel: props.status === 'loading' && (props.loadingLabel ?? '').trim().length > 0,
    ariaLabel: props.ariaLabel ?? p.cells?.ariaLabel,
    ariaDescription: props.ariaDescription ?? p.cells?.ariaDescription,
    yTickFilter: p.yAxis?.tickFilter ?? 'odd',
    yLabelFormat: p.yAxis?.labelFormat ?? 'full',
    yRowOpacity: p.yAxis?.rowOpacity,
    tooltip,
    separator: p.separator ?? null,
  }
}
