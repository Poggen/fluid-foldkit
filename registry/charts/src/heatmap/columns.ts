import { localCalendarDate, copyCalendarDate } from './calendar-date'
import {
  HEATMAP_MONTHS_ONE_YEAR,
  HEATMAP_MONTHS_SIX,
  getHeatmapCalendarRangeStart,
  getHeatmapWeekStartAlignedToRange,
} from './calendar'
import type { HeatmapWeekStartDay } from './day-labels'

/** One day cell of a week column. */
export interface HeatmapBin {
  /** Activity level of the cell. Values of `0` or less map to level 0 (empty), `1` to `3` to levels 1 to 3, and `4` or more to level 4. */
  readonly count: number
  /** Whether the date has observed data. `false` leaves a blank, noninteractive cell without shifting later rows; omitted means observed, including a count of zero. */
  readonly observed?: boolean
  /** Row index of the cell in its column (`0` to `6` for the days of a Sunday-first week). */
  readonly bin: number
  /** Date of the cell. Must be a `Date` object. */
  readonly date: Readonly<Date>
}

/** One week (or category) column of the heatmap, holding its day bins. */
export interface HeatmapColumn {
  /** Column index (the week number). */
  readonly bin: number
  /** The day cells of the column, in Sunday-first order (seven for a week). */
  readonly bins: Array<HeatmapBin>
}

/** Rotates Sun-first column bins so display row 0 starts on `weekStartDay`; `0` returns `columns` unchanged.
 * `columns` stays mutable: a `readonly` param would make that unchanged-return path a type error or force a copy on a hot render path. */
export const rotateHeatmapColumnBins: (
  columns: Array<HeatmapColumn>,
  weekStartDay?: HeatmapWeekStartDay,
) => Array<HeatmapColumn> = (
  columns: Array<HeatmapColumn>,
  weekStartDay: HeatmapWeekStartDay = 0,
) => {
  if (weekStartDay === 0) {
    return columns satisfies Array<HeatmapColumn>
  }

  return columns.map((column: Readonly<HeatmapColumn>) => ({
    ...column,
    bins: [...column.bins.slice(weekStartDay), ...column.bins.slice(0, weekStartDay)],
  })) satisfies Array<HeatmapColumn>
}

export const getHeatmapColumnMonthAnchor: (column: HeatmapColumn) => Date | null = (
  column: HeatmapColumn,
) => {
  for (const bin of column.bins) {
    if (bin.date.getDate() === 1) {
      return bin.date
    }
  }

  const [firstBin] = column.bins

  if (firstBin === undefined) return null
  const firstDate = firstBin.date

  return localCalendarDate(firstDate.getFullYear(), firstDate.getMonth(), 1)
}

/** Internal (not re-exported from the barrel), so it returns `undefined` rather than `null`: the first bin's date, or `undefined` when `column.bins` is empty. */
export const getHeatmapColumnStartDate: (column: Readonly<HeatmapColumn>) => Date | undefined = (
  column: Readonly<HeatmapColumn>,
) => column.bins[0]?.date

/** Internal like `getHeatmapColumnStartDate` (returns `undefined`, not `null`): the last bin's date, or `undefined` when `column.bins` is empty. */
export const getHeatmapColumnEndDate: (column: Readonly<HeatmapColumn>) => Date | undefined = (
  column: Readonly<HeatmapColumn>,
) => {
  const lastBin = column.bins.at(-1)

  return lastBin?.date
}

const readHeatmapLastColumnEnd: (columns: ReadonlyArray<HeatmapColumn>) => Date | undefined = (
  columns: ReadonlyArray<HeatmapColumn>,
) => {
  const lastColumn = columns.at(-1)

  if (!lastColumn) {
    return undefined
  }

  return getHeatmapColumnEndDate(lastColumn)
}

export const getHeatmapTimeExtent: (columns: Array<HeatmapColumn>) => [Date, Date] | null = (
  columns: Array<HeatmapColumn>,
) => {
  if (columns.length === 0) {
    return null
  }

  const [firstColumn] = columns

  if (firstColumn === undefined) return null
  const start = getHeatmapColumnStartDate(firstColumn)
  const end = readHeatmapLastColumnEnd(columns)

  if (!(start && end)) {
    return null
  }

  return [start, end]
}

/** Week columns overlapping `xDomain` (all when omitted). `columns` stays mutable: it is public barrel API and the no-domain path returns it unchanged,
 * so `readonly` would change the signature or copy on a hot render path. */
export const filterHeatmapColumns: (
  columns: Array<HeatmapColumn>,
  xDomain?: [Date, Date],
) => Array<HeatmapColumn> = (columns: Array<HeatmapColumn>, xDomain?: [Date, Date]) => {
  if (!xDomain) {
    return columns
  }

  const start = Math.min(xDomain[0].getTime(), xDomain[1].getTime())
  const end = Math.max(xDomain[0].getTime(), xDomain[1].getTime())

  return columns.filter((column: Readonly<HeatmapColumn>) => {
    const weekStartDate = getHeatmapColumnStartDate(column)
    const weekEndDate = getHeatmapColumnEndDate(column)

    if (!weekStartDate || !weekEndDate) {
      return false
    }

    const weekStart = weekStartDate.getTime()
    const weekEnd = weekEndDate.getTime()

    return weekEnd >= start && weekStart <= end
  })
}

export interface HeatmapDisplayRange {
  readonly start: Readonly<Date> | null
  readonly end: Readonly<Date> | null
}

/** Whether a bin falls outside the contribution display window (not merely inactive). */
export const isHeatmapGhostBin: (
  bin: Readonly<HeatmapBin>,
  range: Readonly<HeatmapDisplayRange>,
) => boolean = (bin: Readonly<HeatmapBin>, range: Readonly<HeatmapDisplayRange>) => {
  const time = bin.date.getTime()

  if (range.end && time > range.end.getTime()) {
    return true
  }

  if (range.start && time < range.start.getTime()) {
    return true
  }

  return false
}

const matchHeatmapCalendarRangeStart: (
  gridStart: Readonly<Date>,
  today: Readonly<Date>,
) => Date | undefined = (gridStart: Readonly<Date>, today: Readonly<Date>) => {
  for (const months of [HEATMAP_MONTHS_SIX, HEATMAP_MONTHS_ONE_YEAR]) {
    const rangeStart = getHeatmapCalendarRangeStart(today, months)
    const alignedStart = getHeatmapWeekStartAlignedToRange(rangeStart)

    if (gridStart.getTime() === alignedStart.getTime()) {
      return rangeStart
    }
  }

  return undefined
}

export const inferHeatmapCalendarRangeStart: (
  columns: Array<HeatmapColumn>,
  currentDate: Readonly<Date>,
) => Date | null = (columns: Array<HeatmapColumn>, currentDate: Readonly<Date>) => {
  if (columns.length === 0) {
    return null
  }

  const [firstColumn] = columns

  const gridStart = firstColumn === undefined ? undefined : getHeatmapColumnStartDate(firstColumn)

  if (!gridStart) {
    return null
  }

  const today = copyCalendarDate(currentDate)
  today.setHours(0, 0, 0, 0)

  return matchHeatmapCalendarRangeStart(gridStart, today) ?? null
}

const readHeatmapDisplayGridBase: (
  columns: Array<HeatmapColumn>,
  currentDate: Readonly<Date>,
) => { extent: [Date, Date]; today: Date; gridStart: Date } | undefined = (
  columns: Array<HeatmapColumn>,
  currentDate: Readonly<Date>,
) => {
  const extent = getHeatmapTimeExtent(columns)

  if (!extent) {
    return undefined
  }

  const today = copyCalendarDate(currentDate)
  today.setHours(0, 0, 0, 0)

  const [firstColumn] = columns

  const gridStart = firstColumn === undefined ? undefined : getHeatmapColumnStartDate(firstColumn)

  if (!gridStart) {
    return undefined
  }

  return { extent, gridStart, today }
}

const resolveInferredHeatmapDisplayRange: (
  inferredStart: Readonly<Date> | undefined,
  extentEnd: Readonly<Date>,
  today: Readonly<Date>,
) => HeatmapDisplayRange = (
  inferredStart: Readonly<Date> | undefined,
  extentEnd: Readonly<Date>,
  today: Readonly<Date>,
) => {
  if (inferredStart && extentEnd.getTime() >= today.getTime()) {
    return { end: today, start: inferredStart }
  }

  return { end: null, start: null }
}

export const resolveHeatmapDisplayRange: (
  columns: Array<HeatmapColumn>,
  currentDate: Readonly<Date>,
) => HeatmapDisplayRange = (columns: Array<HeatmapColumn>, currentDate: Readonly<Date>) => {
  if (columns.length === 0) {
    return { end: null, start: null }
  }

  const base = readHeatmapDisplayGridBase(columns, currentDate)

  if (!base) {
    return { end: null, start: null }
  }

  const inferredStart = inferHeatmapCalendarRangeStart(columns, currentDate)

  return resolveInferredHeatmapDisplayRange(inferredStart ?? undefined, base.extent[1], base.today)
}
