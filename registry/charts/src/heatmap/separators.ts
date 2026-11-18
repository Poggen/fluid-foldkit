import { copyCalendarDate, localCalendarDate } from './calendar-date'
import {
  getHeatmapColumnEndDate,
  getHeatmapColumnStartDate,
  getHeatmapTimeExtent,
  inferHeatmapCalendarRangeStart,
  resolveHeatmapDisplayRange,
} from './columns'
import type { HeatmapColumn } from './columns'

export type HeatmapSeparatorGroupBy = 'every' | 'quarter'

export interface HeatmapSeparatorParsedConfig {
  readonly groupBy: HeatmapSeparatorGroupBy
  readonly every?: number
  readonly spacing: number
}

interface HeatmapSeparatorGroup {
  readonly startColumnIndex: number
  readonly quarter: number
  readonly year: number
  readonly startDate: Readonly<Date>
  readonly label: string
}

export interface HeatmapSeparatorLayout {
  readonly spacing: number
  readonly atColumns: ReadonlyArray<number>
  readonly groups: ReadonlyArray<HeatmapSeparatorGroup>
}

export interface HeatmapColumnSeparatorsConfig {
  readonly every?: number
  readonly groupBy?: HeatmapSeparatorGroupBy
  readonly spacing?: number
}

/** The parsed separator config, or `null` when `config` is absent or invalid. */
export const normalizeHeatmapSeparatorConfig: (
  config: Readonly<HeatmapColumnSeparatorsConfig> | undefined,
) => HeatmapSeparatorParsedConfig | null = (
  config: Readonly<HeatmapColumnSeparatorsConfig> | undefined,
) => {
  if (!config) {
    return null
  }

  const groupBy = config.groupBy ?? 'every'

  if (groupBy === 'quarter') {
    return { groupBy: 'quarter', spacing: config.spacing ?? 0 }
  }

  if ((config.every ?? 0) <= 0) {
    return null
  }

  return {
    ...(config.every === undefined ? {} : { every: config.every }),
    groupBy: 'every',
    spacing: config.spacing ?? 0,
  }
}

export const getHeatmapSeparatorColumnIndices: (
  columnCount: number,
  every: number,
) => Array<number> = (columnCount: number, every: number) => {
  if (every <= 0 || columnCount <= every) {
    return []
  }

  const indices: Array<number> = []

  for (let columnIndex = every; columnIndex < columnCount; columnIndex += every) {
    indices.push(columnIndex)
  }

  return indices
}

const MONTHS_PER_QUARTER = 3

const getCalendarQuarter: (date: Readonly<Date>) => number = (date: Readonly<Date>) =>
  Math.floor(date.getMonth() / MONTHS_PER_QUARTER) + 1

const QUARTER_1_START_MONTH = 0

const QUARTER_2_START_MONTH = MONTHS_PER_QUARTER

const QUARTER_3_START_MONTH = QUARTER_2_START_MONTH + MONTHS_PER_QUARTER

const QUARTER_4_START_MONTH = QUARTER_3_START_MONTH + MONTHS_PER_QUARTER

const CALENDAR_QUARTER_START_MONTHS = [
  QUARTER_1_START_MONTH,
  QUARTER_2_START_MONTH,
  QUARTER_3_START_MONTH,
  QUARTER_4_START_MONTH,
]

const collectQuarterStartDatesForYear: (
  year: number,
  startTime: number,
  endTime: number,
) => Array<Date> = (year: number, startTime: number, endTime: number) => {
  const dates: Array<Date> = []

  for (const month of CALENDAR_QUARTER_START_MONTHS) {
    const date = localCalendarDate(year, month, 1)
    date.setHours(0, 0, 0, 0)

    if (date.getTime() > startTime && date.getTime() <= endTime) {
      dates.push(date)
    }
  }

  return dates
}

const getCalendarQuarterStartDatesBetween: (
  gridStart: Readonly<Date>,
  gridEnd: Readonly<Date>,
) => Array<Date> = (gridStart: Readonly<Date>, gridEnd: Readonly<Date>) => {
  const startTime = gridStart.getTime()
  const endTime = gridEnd.getTime()
  const dates: Array<Date> = []

  for (let year = gridStart.getFullYear(); year <= gridEnd.getFullYear(); year += 1) {
    dates.push(...collectQuarterStartDatesForYear(year, startTime, endTime))
  }

  return dates
}

const findHeatmapColumnIndexForDate: (
  columns: ReadonlyArray<HeatmapColumn>,
  date: Readonly<Date>,
) => number | undefined = (columns: ReadonlyArray<HeatmapColumn>, date: Readonly<Date>) => {
  const target = copyCalendarDate(date)
  target.setHours(0, 0, 0, 0)
  const targetTime = target.getTime()

  const columnIndex = columns.findIndex((column: Readonly<HeatmapColumn>) => {
    const weekStart = getHeatmapColumnStartDate(column)
    const weekEnd = getHeatmapColumnEndDate(column)

    if (!(weekStart && weekEnd)) {
      return false
    }

    weekStart.setHours(0, 0, 0, 0)
    weekEnd.setHours(0, 0, 0, 0)

    return targetTime >= weekStart.getTime() && targetTime <= weekEnd.getTime()
  })

  return columnIndex === -1 ? undefined : columnIndex
}

const resolveQuarterRangeStart: (
  columns: Array<HeatmapColumn>,
  extentStart: Readonly<Date>,
  currentDate: Readonly<Date>,
) => Readonly<Date> = (
  columns: Array<HeatmapColumn>,
  extentStart: Readonly<Date>,
  currentDate: Readonly<Date>,
) => {
  const displayRange = resolveHeatmapDisplayRange(columns, currentDate)

  return displayRange.start ?? inferHeatmapCalendarRangeStart(columns, currentDate) ?? extentStart
}

interface QuarterSeparatorSeed {
  readonly groups: Array<HeatmapSeparatorGroup>
  readonly usedColumns: Set<number>
}

const createQuarterSeparatorSeed: (quarterRangeStart: Readonly<Date>) => QuarterSeparatorSeed = (
  quarterRangeStart: Readonly<Date>,
) => {
  const quarter = getCalendarQuarter(quarterRangeStart)

  const groups: Array<HeatmapSeparatorGroup> = [
    {
      label: `Q${quarter}`,
      quarter,
      startColumnIndex: 0,
      startDate: quarterRangeStart,
      year: quarterRangeStart.getFullYear(),
    },
  ]

  return { groups, usedColumns: new Set<number>([0]) }
}

interface AppendQuarterSeparatorGroupParams {
  readonly columns: ReadonlyArray<HeatmapColumn>
  readonly groups: Array<HeatmapSeparatorGroup>
  readonly quarterStart: Readonly<Date>
  readonly usedColumns: Set<number>
}

const appendQuarterSeparatorGroup: (params: Readonly<AppendQuarterSeparatorGroupParams>) => void = (
  params: Readonly<AppendQuarterSeparatorGroupParams>,
) => {
  const { columns, groups, quarterStart, usedColumns } = params
  const columnIndex = findHeatmapColumnIndexForDate(columns, quarterStart)

  if (columnIndex !== undefined && columnIndex !== 0 && !usedColumns.has(columnIndex)) {
    usedColumns.add(columnIndex)
    const quarter = getCalendarQuarter(quarterStart)
    groups.push({
      label: `Q${quarter}`,
      quarter,
      startColumnIndex: columnIndex,
      startDate: quarterStart,
      year: quarterStart.getFullYear(),
    })
  }
}

interface AppendQuarterSeparatorGroupsParams {
  readonly columns: ReadonlyArray<HeatmapColumn>
  readonly gridEnd: Readonly<Date>
  readonly groups: Array<HeatmapSeparatorGroup>
  readonly quarterRangeStart: Readonly<Date>
  readonly usedColumns: Set<number>
}

const appendQuarterSeparatorGroups: (
  params: Readonly<AppendQuarterSeparatorGroupsParams>,
) => void = (params: Readonly<AppendQuarterSeparatorGroupsParams>) => {
  const { columns, gridEnd, groups, quarterRangeStart, usedColumns } = params
  const quarterStarts = getCalendarQuarterStartDatesBetween(quarterRangeStart, gridEnd)

  for (const quarterStart of quarterStarts) {
    appendQuarterSeparatorGroup({ columns, groups, quarterStart, usedColumns })
  }
}

const buildHeatmapQuarterSeparatorGroups: (
  columns: Array<HeatmapColumn>,
  currentDate: Readonly<Date>,
) => Array<HeatmapSeparatorGroup> = (
  columns: Array<HeatmapColumn>,
  currentDate: Readonly<Date>,
) => {
  if (columns.length === 0) {
    return []
  }

  const extent = getHeatmapTimeExtent(columns)

  if (!extent) {
    return []
  }

  const quarterRangeStart = resolveQuarterRangeStart(columns, extent[0], currentDate)
  const { groups, usedColumns } = createQuarterSeparatorSeed(quarterRangeStart)
  appendQuarterSeparatorGroups({
    columns,
    gridEnd: extent[1],
    groups,
    quarterRangeStart,
    usedColumns,
  })

  groups.sort(
    (groupA: Readonly<HeatmapSeparatorGroup>, groupB: Readonly<HeatmapSeparatorGroup>) =>
      groupA.startColumnIndex - groupB.startColumnIndex,
  )

  return groups
}

const resolveQuarterSeparatorLayout: (
  config: Readonly<HeatmapSeparatorParsedConfig>,
  columns: Array<HeatmapColumn>,
  currentDate: Readonly<Date>,
) => HeatmapSeparatorLayout | null = (
  config: Readonly<HeatmapSeparatorParsedConfig>,
  columns: Array<HeatmapColumn>,
  currentDate: Readonly<Date>,
) => {
  const groups = buildHeatmapQuarterSeparatorGroups(columns, currentDate)

  if (groups.length === 0) {
    return null
  }

  const atColumns: Array<number> = []

  for (const group of groups) {
    if (group.startColumnIndex > 0) {
      atColumns.push(group.startColumnIndex)
    }
  }

  return { atColumns, groups, spacing: config.spacing }
}

export const resolveHeatmapSeparatorLayout: (
  config: Readonly<HeatmapSeparatorParsedConfig> | null,
  columns: Array<HeatmapColumn>,
  currentDate: Readonly<Date>,
) => HeatmapSeparatorLayout | null = (
  config: Readonly<HeatmapSeparatorParsedConfig> | null,
  columns: Array<HeatmapColumn>,
  currentDate: Readonly<Date>,
) => {
  if (!config) {
    return null
  }

  if (config.groupBy === 'quarter') {
    return resolveQuarterSeparatorLayout(config, columns, currentDate)
  }

  const every = config.every ?? 0

  if (every <= 0) {
    return null
  }

  const atColumns = getHeatmapSeparatorColumnIndices(columns.length, every)

  return { atColumns, groups: [], spacing: config.spacing }
}

interface HeatmapSeparatorLineYParams {
  readonly innerHeight: number
  readonly marginTop: number
  /** Distance from the chart container top to the line start. Default: plot top. */
  readonly startOffset?: number
  readonly paddingY?: number
}

interface HeatmapSeparatorLineYSpan {
  readonly y1: number
  readonly y2: number
}

/** Vertical span for a separator line in plot coordinates. */
export const getHeatmapSeparatorLineY: (
  argument0: Readonly<HeatmapSeparatorLineYParams>,
) => HeatmapSeparatorLineYSpan = ({
  innerHeight,
  marginTop,
  startOffset,
  paddingY = 0,
}: Readonly<HeatmapSeparatorLineYParams>) => {
  const y1 = (startOffset ?? marginTop) - marginTop + paddingY

  return { y1, y2: Math.max(innerHeight - paddingY, y1) } satisfies HeatmapSeparatorLineYSpan
}

/** Separator line style. */
export type HeatmapSeparatorStrokeStyle = 'solid' | 'dashed'

const DEFAULT_DASHED_STROKE_DASHARRAY = '4,4'

/** The stroke dasharray for `strokeStyle` (an explicit `strokeDasharray` overrides), or `undefined` for a solid line. */
export const resolveHeatmapSeparatorStrokeDasharray: (
  strokeStyle?: HeatmapSeparatorStrokeStyle,
  strokeDasharray?: string,
) => string | undefined = (
  strokeStyle: HeatmapSeparatorStrokeStyle = 'solid',
  strokeDasharray?: string,
) => {
  if (strokeStyle !== 'dashed') {
    return undefined satisfies string | undefined
  }

  return (strokeDasharray ?? DEFAULT_DASHED_STROKE_DASHARRAY) satisfies string | undefined
}

/** Vertical stroke gradient for separator lines (`from` -> optional `via` -> `to`). */
export interface HeatmapSeparatorGradient {
  readonly from: string
  readonly via?: string
  readonly to: string
  readonly fromOpacity?: number
  readonly viaOpacity?: number
  readonly toOpacity?: number
}

interface HeatmapSeparatorGradientStop {
  readonly offset: string
  readonly color: string
  readonly opacity: number
}

const DEFAULT_GRADIENT_STOP_OPACITY = 1

/** Builds SVG gradient stops for a vertical separator line. */
export const buildHeatmapSeparatorGradientStops: (
  gradient: Readonly<HeatmapSeparatorGradient>,
  strokeOpacity?: number,
) => Array<HeatmapSeparatorGradientStop> = (
  gradient: Readonly<HeatmapSeparatorGradient>,
  strokeOpacity = 1,
) => {
  const scaleOpacity: (value: number | undefined, fallback?: number) => number = (
    value: number | undefined,
    fallback: number = DEFAULT_GRADIENT_STOP_OPACITY,
  ) => ((value ?? fallback) * strokeOpacity) satisfies number

  if (gradient.via !== undefined) {
    return [
      { color: gradient.from, offset: '0%', opacity: scaleOpacity(gradient.fromOpacity) },
      { color: gradient.via, offset: '50%', opacity: scaleOpacity(gradient.viaOpacity) },
      { color: gradient.to, offset: '100%', opacity: scaleOpacity(gradient.toOpacity) },
    ] satisfies Array<HeatmapSeparatorGradientStop>
  }

  return [
    { color: gradient.from, offset: '0%', opacity: scaleOpacity(gradient.fromOpacity) },
    { color: gradient.to, offset: '100%', opacity: scaleOpacity(gradient.toOpacity) },
  ] satisfies Array<HeatmapSeparatorGradientStop>
}
