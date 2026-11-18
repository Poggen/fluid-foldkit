import { defineChart } from '@tanstack/charts/scene'
import type { DomChartDefinition } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { liveTooltip as nativeTooltip } from '../live-line/tooltip'
import { createHeatmapFocus } from './focus'
import { createHeatmapCellMotion } from './motion'
import { formatHeatmapYAxisLabel, shouldShowHeatmapYAxisTick } from './day-labels'
import { resolveHeatmapRowOpacity } from './hover-style'
import { bklitTooltipPlacement } from '../cartesian/tooltip-placement'
import {
  levelFill,
  columnStartX,
  createCellMaker,
  loadingMarks,
  readyMarks,
  separatorMarks,
  monthTicks,
} from './marks'
import type { CellDatum, BuildHeatmapDefinitionParams } from './marks'

export { columnStartX, buildCellData } from './marks'

export type { CellDatum } from './marks'

const LEVELS = [0, 1, 2, 3, 4] satisfies readonly [0, 1, 2, 3, 4]

const TOOLTIP_OFFSET = 16

const HEATMAP_HOLD_MOTION = {
  type: 'tween',
  duration: 120,
  easing: 'linear',
} satisfies import('@tanstack/charts').ChartMotionTransition

const buildHeatmapDefinition: (
  params: Readonly<BuildHeatmapDefinitionParams>,
) => DomChartDefinition<Readonly<CellDatum>, number | string, string> = (
  params: Readonly<BuildHeatmapDefinitionParams>,
) => {
  const {
    status,
    columns,
    dayLabels,
    cellSize,
    gap,
    margin,
    innerWidth,
    layout,
    levelStyles,
    patternIdPrefix,
    cornerRadius,
    rowOpacity,
    yAxis,
    tooltipEnabled,
    tooltipInstant,
    tooltipHideDelay,
    tooltipClassName,
    animateCells,
    animationDuration,
    enterTransition,
    enterStaggerScale,
    revealEpoch,
    enterClock,
    showXAxis,
    showYAxis,
    getScene,
  } = params

  const linearX = layout !== null && layout.spacing > 0

  const baseInset = gap / 2
  const loading = status === 'loading'

  const xScale = linearX
    ? scaleLinear().domain([0, innerWidth])
    : scaleBand()
        .domain(columns.map((_c, index) => String(index)))
        .padding(0)

  const yScale = scaleBand()
    .domain([...dayLabels])
    .padding(0)

  const motionFor = createHeatmapCellMotion<CellDatum>({
    animate: animateCells,
    animationDuration,
    clock: enterClock,
    enterStaggerScale,
    enterTransition,
    revealEpoch,
  })

  const makeCells = createCellMaker(linearX, baseInset, cornerRadius)

  const tooltipAnchor: (
    points: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  ) => { readonly x: number; readonly y: number } | null = (
    points: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  ) => {
    const point = points.at(0)

    return point === undefined ? null : { x: point.x + baseInset, y: point.y + baseInset }
  }

  const marks = loading ? loadingMarks(params, makeCells) : readyMarks(params, makeCells, motionFor)
  const decorativeMarks = loading ? [] : separatorMarks(params, linearX)

  const { values: monthValues, labels: monthLabels } = monthTicks(columns)

  const xTickValues = linearX
    ? monthValues.map((index) => columnStartX(index, cellSize, layout))
    : monthValues.map(String)

  const xLabelByTick = new Map<number | string, string>()

  for (const [position, index] of monthValues.entries()) {
    xLabelByTick.set(xTickValues[position] ?? '', monthLabels.get(index) ?? '')
  }

  const yTickValues = dayLabels.filter((_label, row) =>
    shouldShowHeatmapYAxisTick(row, yAxis.tickFilter),
  )

  const yOpacity = yAxis.rowOpacity ?? rowOpacity

  const xHidden = !showXAxis
  const yHidden = !showYAxis
  const axisOff = { axis: false, guide: false } satisfies { axis: false; guide: false }

  const definition = defineChart({
    color: {
      domain: [...LEVELS],
      range: LEVELS.map((level) => levelFill(level, levelStyles, patternIdPrefix)),
    },
    focus: createHeatmapFocus(getScene),
    focusRing: false,

    margin: {
      bottom: margin.bottom,
      left: margin.left - baseInset,
      right: margin.right + baseInset,
      top: margin.top + baseInset,
    },
    marks: [...marks, ...decorativeMarks],
    scales: {
      sepY: {
        axis: false satisfies false,
        channel: 'y' satisfies 'y',
        guide: false satisfies false,
        scale: scaleLinear().domain([dayLabels.length * cellSize, 0]),
      },
      x: xHidden
        ? { ...axisOff, scale: xScale }
        : {
            axis: {
              line: false,

              tickLabels: {
                anchor: 'start' satisfies 'start',
                dx: ({ bandwidth }: Readonly<{ bandwidth: number }>) =>
                  ((linearX ? 0 : -bandwidth / 2) + baseInset) satisfies number,
                dy: -2.4,
                fontSize: 12,
                opacity: 1,
                thin: { minGap: 8, priority: 'ends' },
              },
              ticks: {
                format: (value: number | string) =>
                  (xLabelByTick.get(value) ?? '') satisfies string,
                padding: 4 + baseInset,
                size: 0,
                values: xTickValues,
              },
            },
            guide: false,
            scale: xScale,
            side: 'top' satisfies 'top',
          },
      y: yHidden
        ? { ...axisOff, scale: yScale }
        : {
            axis: {
              line: false,

              tickLabels: {
                dy: -1.2,
                fontSize: 12,
                opacity:
                  yOpacity === undefined
                    ? 1
                    : ({ value, index }: Readonly<{ value: string; index: number }>) => {
                        const row = dayLabels.indexOf(value)

                        return resolveHeatmapRowOpacity(
                          row === -1 ? index : row,
                          yOpacity,
                        ) satisfies number
                      },
                thin: false,
              },
              ticks: {
                format: (value: string) =>
                  formatHeatmapYAxisLabel(value, yAxis.labelFormat) satisfies string,
                padding: 7,
                size: 0,
                values: yTickValues,
              },
            },
            guide: false,
            scale: yScale,
            side: 'left' satisfies 'left',
          },
    },
    svgAnimation: false,
    tooltip:
      tooltipEnabled && !loading
        ? {
            className:
              String.raw`bkm-heatmap-tooltip bottom-auto m-0 absolute right-auto w-max z-[1] left-[var(--bkm-tooltip-left)] top-[var(--bkm-tooltip-top)]${tooltipInstant ? String.raw` bkm-heatmap-tooltip--instant` : ''} ${tooltipClassName}`.trim(),
            motion: { ...HEATMAP_HOLD_MOTION, duration: tooltipHideDelay },
            anchor: tooltipAnchor,
            offset: TOOLTIP_OFFSET,
            portal: bklitTooltipPlacement(),
            sticky: false,
            use: nativeTooltip(`${patternIdPrefix}-tooltip`, {
              holdMs: tooltipHideDelay,
              notifyBody: false,
              placement: 'heatmap',
              bottomInset: baseInset,
            }),
          }
        : (false satisfies false),
  })

  return definition
}

export { buildHeatmapDefinition }
