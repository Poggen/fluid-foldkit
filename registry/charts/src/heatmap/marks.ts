import type { ChartMark } from '@tanstack/charts'

import { decorative } from '@tanstack/charts/mark/decorative'
import { cell, rect } from '@tanstack/charts/rect'
import { link } from '@tanstack/charts/link'
import { text } from '@tanstack/charts/text'
import type { HeatmapScene } from './focus'
import { heatmapLevelCellFillOpacity, heatmapLevelPatternId, isHeatmapLevelPattern } from './colors'
import type { HeatmapLevelStyles } from './colors'
import type { HeatmapMargin, HeatmapSeparatorStyle, HeatmapYAxisConfig } from './context'
import { createHeatmapCellMotion, heatmapCellSeed, seededRandom } from './motion'
import type { HeatmapEnterClock, HeatmapEnterTransition } from './motion'
import { getHeatmapColumnMonthAnchor, isHeatmapGhostBin } from './columns'
import { getHeatmapContributionLevel } from './contribution-level'
import { formatHeatmapMonthShort } from './format'
import { resolveHeatmapRowOpacity } from './hover-style'
import { resolveHeatmapSeparatorStrokeDasharray } from './separators'
import type { HeatmapColumn, HeatmapDisplayRange } from './columns'
import type { HeatmapSeparatorLayout } from './separators'

/** One heatmap cell as a chart datum. */
export interface CellDatum {
  readonly colKey: string
  readonly rowKey: string
  readonly column: number
  readonly row: number
  readonly count: number
  readonly level: number
  readonly date: Readonly<Date>
  readonly x0: number
  readonly x1: number
}

const LOADING_BASE_OPACITY = 0.2

const SHIMMER_SEED_SALT = 73_133

const FALLBACK_LEVEL = 0

const QUARTER_LABEL_RISE_PX = 8

/** Left edge of a column in plot pixels, including separator gutters. */
export const columnStartX: (
  column: number,
  cellSize: number,
  layout: Readonly<HeatmapSeparatorLayout> | null,
) => number = (
  column: number,
  cellSize: number,
  layout: Readonly<HeatmapSeparatorLayout> | null,
) => {
  let gutters = 0

  if (layout && layout.spacing > 0) {
    for (const at of layout.atColumns) {
      if (at <= column) {
        gutters += 1
      }
    }
  }

  return column * cellSize + gutters * (layout?.spacing ?? 0)
}

interface BuildCellDataParams {
  readonly columns: ReadonlyArray<HeatmapColumn>
  readonly dayLabels: ReadonlyArray<string>
  readonly displayRange: HeatmapDisplayRange | undefined
  readonly cellSize: number
  readonly layout: Readonly<HeatmapSeparatorLayout> | null
}

/** Unknown and ghost bins never draw or take focus; iteration retains their weekday positions. */
const buildCellData: (argument0: Readonly<BuildCellDataParams>) => Array<CellDatum> = ({
  columns,
  dayLabels,
  displayRange,
  cellSize,
  layout,
}: Readonly<BuildCellDataParams>) => {
  const data: Array<CellDatum> = []

  for (const [column, col] of columns.entries()) {
    const x0 = columnStartX(column, cellSize, layout)

    for (const [row, bin] of col.bins.entries()) {
      if (
        bin.observed !== false &&
        (displayRange === undefined || !isHeatmapGhostBin(bin, displayRange))
      ) {
        data.push({
          colKey: String(column),
          column,
          count: bin.count,
          date: bin.date,
          level: getHeatmapContributionLevel(bin.count),
          row,
          rowKey: dayLabels[row] ?? String(row),
          x0,
          x1: x0 + cellSize,
        })
      }
    }
  }

  return data satisfies Array<CellDatum>
}

const patternRef: (id: string, prefix: string | undefined) => string = (
  id: string,
  prefix: string | undefined,
) => (prefix === undefined || prefix === '' ? id : `${prefix}-${id}`)

const levelFill: (
  level: number,
  styles: HeatmapLevelStyles,
  patternIdPrefix: string | undefined,
) => string = (level: number, styles: HeatmapLevelStyles, patternIdPrefix: string | undefined) => {
  const style = styles[level] ?? styles[FALLBACK_LEVEL]

  if (isHeatmapLevelPattern(style)) {
    const id = heatmapLevelPatternId(level)

    return `url(#${patternRef(id, patternIdPrefix)})`
  }

  return style.color
}

type RowOpacity = number | ReadonlyArray<number> | undefined

export interface BuildHeatmapDefinitionParams {
  readonly getScene: () => HeatmapScene | null
  readonly status: 'loading' | 'ready' | 'error'
  readonly columns: ReadonlyArray<HeatmapColumn>
  readonly dayLabels: ReadonlyArray<string>
  readonly cellData: ReadonlyArray<CellDatum>
  readonly cellSize: number
  readonly gap: number
  readonly margin: Readonly<HeatmapMargin>
  readonly innerWidth: number
  readonly layout: Readonly<HeatmapSeparatorLayout> | null
  readonly separator: Readonly<HeatmapSeparatorStyle> | null
  readonly levelStyles: HeatmapLevelStyles
  readonly patternIdPrefix: string | undefined
  readonly cornerRadius: number
  readonly rowOpacity: RowOpacity
  readonly yAxis: Readonly<HeatmapYAxisConfig>
  readonly tooltipEnabled: boolean
  readonly tooltipInstant: boolean
  /** bklit HeatmapTooltip hideDelay (ms): how long the instant tooltip is held after the pointer leaves. */
  readonly tooltipHideDelay: number
  readonly tooltipClassName: string
  readonly animateCells: boolean
  readonly animationDuration: number
  readonly enterTransition: Readonly<HeatmapEnterTransition> | undefined
  readonly enterStaggerScale: number
  readonly revealEpoch: number
  readonly revealKey: string
  readonly enterClock: HeatmapEnterClock
  /** First paint: one seed cell per group, so the group exists and every other cell ENTERS with its own delay. */
  readonly seedOnly: boolean
  readonly interactive: boolean
  /** Loading shimmer: share of cells that pulse (0-1) and whether pulsing is on. */
  readonly loadingCellRandomness: number
  readonly loadingShimmer: boolean
  readonly separatorGradientId: string
  readonly separatorSpan: Readonly<{ y1: number; y2: number }>
  readonly showXAxis: boolean
  readonly showYAxis: boolean
}

type CellMark = ChartMark<Readonly<CellDatum>, number | string, string>

interface ColumnMonthTicks {
  readonly values: Array<number>
  readonly labels: Map<number, string>
}

const monthKey: (anchor: Readonly<Date>) => string = (anchor: Readonly<Date>) =>
  `${anchor.getFullYear()}-${anchor.getMonth()}`

/** One tick per month transition, anchored at the first column of the month. */
const monthTicks: (columns: ReadonlyArray<HeatmapColumn>) => ColumnMonthTicks = (
  columns: ReadonlyArray<HeatmapColumn>,
) => {
  const values: Array<number> = []
  const labels = new Map<number, string>()
  let lastKey = ''

  for (const [index, column] of columns.entries()) {
    const anchor = getHeatmapColumnMonthAnchor(column)

    if (anchor !== null && monthKey(anchor) !== lastKey) {
      lastKey = monthKey(anchor)
      values.push(index)
      labels.set(index, formatHeatmapMonthShort(anchor))
    }
  }

  return { labels, values }
}

type DecorativeMark = ReturnType<typeof decorative>

type MakeCells = (data: ReadonlyArray<CellDatum>, options: Record<string, unknown>) => CellMark

const createCellMaker: (linearX: boolean, baseInset: number, cornerRadius: number) => MakeCells = (
  linearX: boolean,
  baseInset: number,
  cornerRadius: number,
) => {
  const positions = linearX
    ? {
        x1: (datum: Readonly<CellDatum>) => datum.x0 satisfies number,
        x2: (datum: Readonly<CellDatum>) => datum.x1 satisfies number,
        y: (datum: Readonly<CellDatum>) => datum.rowKey satisfies string,
      }
    : {
        x: (datum: Readonly<CellDatum>) => datum.colKey satisfies string,
        y: (datum: Readonly<CellDatum>) => datum.rowKey satisfies string,
      }

  return (data, options) => {
    const common = { inset: baseInset, radius: cornerRadius, ...options }

    return linearX
      ? rect(data, { ...common, ...positions })
      : cell(data, { ...common, ...positions })
  }
}

const shimmers: (datum: Readonly<CellDatum>, randomness: number, shimmer: boolean) => boolean = (
  datum: Readonly<CellDatum>,
  randomness: number,
  shimmer: boolean,
) => {
  const random = seededRandom(heatmapCellSeed(datum.column, datum.row) + SHIMMER_SEED_SALT)

  return shimmer && (randomness >= 1 || (randomness > 0 && random() < randomness))
}

const loadingMarks: (
  argument0: Readonly<BuildHeatmapDefinitionParams>,
  makeCells: MakeCells,
) => Array<CellMark> = (
  {
    cellData,
    levelStyles,
    patternIdPrefix,
    loadingCellRandomness,
    loadingShimmer,
  }: Readonly<BuildHeatmapDefinitionParams>,
  makeCells: MakeCells,
) => {
  const still: Array<CellDatum> = []
  const pulsing: Array<CellDatum> = []

  for (const datum of cellData) {
    ;(shimmers(datum, loadingCellRandomness, loadingShimmer) ? pulsing : still).push(datum)
  }

  const marks: Array<CellMark> = []

  for (const [id, data, fillOpacity] of [
    ['heatmap-loading', still, LOADING_BASE_OPACITY],
    ['heatmap-loading-shimmer', pulsing, 1],
  ] satisfies ReadonlyArray<readonly [string, ReadonlyArray<CellDatum>, number]>) {
    if (data.length > 0) {
      marks.push(
        makeCells(data, {
          fill: levelFill(0, levelStyles, patternIdPrefix),
          fillOpacity,
          id,
          key: (datum: Readonly<CellDatum>) => `load-${datum.column}-${datum.row}`,

          motion: false satisfies false,
        }),
      )
    }
  }

  return marks satisfies Array<CellMark>
}

interface CellGroup {
  readonly opacity: number
  readonly data: Array<CellDatum>
}

const groupCells: (
  cellData: ReadonlyArray<CellDatum>,
  levelStyles: HeatmapLevelStyles,
  rowOpacity: RowOpacity,
) => Map<string, CellGroup> = (
  cellData: ReadonlyArray<CellDatum>,
  levelStyles: HeatmapLevelStyles,
  rowOpacity: RowOpacity,
) => {
  const groups = new Map<string, CellGroup>()

  for (const datum of cellData) {
    const opacity =
      resolveHeatmapRowOpacity(datum.row, rowOpacity) *
      heatmapLevelCellFillOpacity(levelStyles[datum.level] ?? levelStyles[FALLBACK_LEVEL])

    const id = `heatmap-cells-l${datum.level}-o${opacity}`
    const entry = groups.get(id)

    if (entry === undefined) {
      groups.set(id, { data: [datum], opacity })
    } else {
      entry.data.push(datum)
    }
  }

  return groups
}

const readyMarks: (
  argument0: Readonly<BuildHeatmapDefinitionParams>,
  makeCells: MakeCells,
  motionFor: ReturnType<typeof createHeatmapCellMotion<CellDatum>>,
) => Array<CellMark> = (
  {
    cellData,
    levelStyles,
    rowOpacity,
    seedOnly,
    revealKey,
  }: Readonly<BuildHeatmapDefinitionParams>,
  makeCells: MakeCells,
  motionFor: ReturnType<typeof createHeatmapCellMotion<CellDatum>>,
) => {
  const marks: Array<CellMark> = []

  for (const [groupId, { opacity, data }] of groupCells(cellData, levelStyles, rowOpacity)) {
    const seeded = seedOnly
      ? { fill: 'transparent', key: () => 'seed' satisfies string, motion: false satisfies false }
      : null

    marks.push(
      makeCells(seeded ? data.slice(0, 1) : data, {
        ...(seeded ?? {
          color: (datum: Readonly<CellDatum>) => datum.level satisfies number,
          key: (datum: Readonly<CellDatum>) =>
            `${datum.column}-${datum.row}:${revealKey}` satisfies string,
          motion: motionFor,
        }),
        fillOpacity: opacity,
        id: groupId,
      }),
    )
  }

  return marks satisfies Array<CellMark>
}

const separatorRules: (
  argument0: Readonly<BuildHeatmapDefinitionParams>,
  layout: Readonly<HeatmapSeparatorLayout>,
  separator: Readonly<HeatmapSeparatorStyle>,
) => DecorativeMark = (
  { cellSize, separatorGradientId, separatorSpan }: Readonly<BuildHeatmapDefinitionParams>,
  layout: Readonly<HeatmapSeparatorLayout>,
  separator: Readonly<HeatmapSeparatorStyle>,
) => {
  const xs = layout.atColumns.map((at) => columnStartX(at, cellSize, layout) - layout.spacing / 2)

  return decorative(
    link(xs, {
      id: 'heatmap-separators',
      stroke:
        separator.gradient === undefined
          ? (separator.stroke ?? 'var(--bkm-border)')
          : `url(#${separatorGradientId})`,
      ...(resolveHeatmapSeparatorStrokeDasharray(
        separator.strokeStyle ?? 'solid',
        separator.strokeDasharray,
      ) === undefined
        ? {}
        : {
            strokeDasharray:
              resolveHeatmapSeparatorStrokeDasharray(
                separator.strokeStyle ?? 'solid',
                separator.strokeDasharray,
              ) ?? '',
          }),
      ...(separator.gradient === undefined ? { strokeOpacity: separator.strokeOpacity ?? 1 } : {}),
      strokeWidth: separator.strokeWidth ?? 1,
      x1: (value: number) => value,
      x2: (value: number) => value,
      y1: () => separatorSpan.y1,
      y2: () => separatorSpan.y2,
      yScale: 'sepY',
    }),
  ) satisfies DecorativeMark
}

const separatorLabels: (
  argument0: Readonly<BuildHeatmapDefinitionParams>,
  layout: Readonly<HeatmapSeparatorLayout>,
  separator: Readonly<HeatmapSeparatorStyle>,
  linearX: boolean,
) => DecorativeMark = (
  { cellSize, dayLabels }: Readonly<BuildHeatmapDefinitionParams>,
  layout: Readonly<HeatmapSeparatorLayout>,
  separator: Readonly<HeatmapSeparatorStyle>,
  linearX: boolean,
) => {
  const labelFormat = separator.labelFormat ?? ((quarter: number) => `Q${quarter}` satisfies string)
  const first = dayLabels[0] ?? ''

  const labelRows = layout.groups.map((group) => ({
    text: labelFormat(group.quarter, group.startDate),
    x: linearX
      ? columnStartX(group.startColumnIndex, cellSize, layout)
      : String(group.startColumnIndex),
  }))

  const options = {
    anchor: 'start',
    dy: -(cellSize / 2) - QUARTER_LABEL_RISE_PX + (separator.labelOffset ?? 0),
    fill: 'var(--chart-label)',
    fontSize: 12,
    id: 'heatmap-separator-labels',
    text: (row: { readonly text: string }) => row.text,
    x: (row: { readonly x: number | string }) => row.x,
    y: () => first,
  } satisfies import('@tanstack/charts/text').TextOptions<{
    readonly text: string
    readonly x: number | string
  }>

  return decorative(text(labelRows, options)) satisfies DecorativeMark
}

const separatorMarks: (
  params: Readonly<BuildHeatmapDefinitionParams>,
  linearX: boolean,
) => Array<DecorativeMark> = (params: Readonly<BuildHeatmapDefinitionParams>, linearX: boolean) => {
  const { layout, separator, dayLabels } = params
  const marks: Array<DecorativeMark> = []

  if (layout === null) {
    return marks
  }

  if (linearX && layout.atColumns.length > 0 && separator !== null) {
    marks.push(separatorRules(params, layout, separator))
  }

  if (separator?.showLabels === true && layout.groups.length > 0 && dayLabels.length > 0) {
    marks.push(separatorLabels(params, layout, separator, linearX))
  }

  return marks
}

export {
  levelFill,
  buildCellData,
  createCellMaker,
  loadingMarks,
  readyMarks,
  separatorMarks,
  monthTicks,
}
