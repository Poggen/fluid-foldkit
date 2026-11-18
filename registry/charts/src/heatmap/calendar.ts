import { copyCalendarDate, localCalendarDate } from './calendar-date'

const MS_PER_SECOND = 1000

export const HEATMAP_MONTHS_ONE_YEAR = 12

export const HEATMAP_MONTHS_SIX = 6

export const HEATMAP_WEEKS_ONE_YEAR = 52

const HOURS_PER_DAY = 24

const MINUTES_PER_HOUR = 60

const SECONDS_PER_MINUTE = 60

const DAYS_PER_WEEK = 7

const MS_PER_WEEK =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND * DAYS_PER_WEEK

const DEFAULT_MIN_DAYS_IN_FIRST_WEEK = 4

export const getHeatmapCalendarRangeStart: (today: Readonly<Date>, months: number) => Date = (
  today: Readonly<Date>,
  months: number,
) => {
  const monthOffset = months === HEATMAP_MONTHS_SIX ? months : months - 1
  const start = localCalendarDate(today.getFullYear(), today.getMonth() - monthOffset, 1)
  start.setHours(0, 0, 0, 0)

  return start
}

export const getHeatmapYearStartMonth: (today: Readonly<Date>) => Date = (today: Readonly<Date>) =>
  getHeatmapCalendarRangeStart(today, HEATMAP_MONTHS_ONE_YEAR)

export const getHeatmapWeekStartSunday: (date: Readonly<Date>) => Date = (date: Readonly<Date>) => {
  const sunday = copyCalendarDate(date)
  sunday.setDate(sunday.getDate() - sunday.getDay())
  sunday.setHours(0, 0, 0, 0)

  return sunday
}

export const getHeatmapWeekCount: (
  startSunday: Readonly<Date>,
  endDate: Readonly<Date>,
) => number = (startSunday: Readonly<Date>, endDate: Readonly<Date>) => {
  const endSunday = getHeatmapWeekStartSunday(endDate)

  return Math.floor((endSunday.getTime() - startSunday.getTime()) / MS_PER_WEEK) + 1
}

const countHeatmapWeekDaysOnOrAfter: (
  weekStart: Readonly<Date>,
  threshold: Readonly<Date>,
) => number = (weekStart: Readonly<Date>, threshold: Readonly<Date>) => {
  const day = copyCalendarDate(weekStart)
  day.setHours(0, 0, 0, 0)
  const cutoff = copyCalendarDate(threshold)
  cutoff.setHours(0, 0, 0, 0)
  let count = 0

  for (let i = 0; i < DAYS_PER_WEEK; i += 1) {
    if (day >= cutoff) {
      count += 1
    }

    day.setDate(day.getDate() + 1)
  }

  return count
}

export const getHeatmapWeekStartAlignedToRange: (
  rangeStart: Readonly<Date>,
  minDaysInFirstWeek?: number,
) => Date = (
  rangeStart: Readonly<Date>,
  minDaysInFirstWeek: number = DEFAULT_MIN_DAYS_IN_FIRST_WEEK,
) => {
  const startDate = getHeatmapWeekStartSunday(rangeStart)
  const weekEnd = copyCalendarDate(startDate)
  weekEnd.setDate(weekEnd.getDate() + (DAYS_PER_WEEK - 1))

  if (rangeStart >= startDate && rangeStart <= weekEnd) {
    return startDate satisfies Date
  }

  while (countHeatmapWeekDaysOnOrAfter(startDate, rangeStart) < minDaysInFirstWeek) {
    startDate.setDate(startDate.getDate() + DAYS_PER_WEEK)
  }

  return startDate satisfies Date
}

export interface HeatmapWeekRange {
  /** Start of the first week of the window. */
  readonly startDate: Date
  /** Number of week columns in the window. */
  readonly weekCount: number
  /** First in-range calendar day; bins before this are empty in default year grids. */
  readonly rangeStart: Date | null
}

const resolveRollingHeatmapWeekRange: (
  endDate: Readonly<Date>,
  weeks: number,
) => HeatmapWeekRange = (endDate: Readonly<Date>, weeks: number) => {
  const startDate = copyCalendarDate(endDate)
  startDate.setDate(startDate.getDate() - (weeks - 1) * DAYS_PER_WEEK)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  startDate.setHours(0, 0, 0, 0)

  return { rangeStart: null, startDate, weekCount: weeks }
}

export const resolveHeatmapWeekRange: (
  today: Readonly<Date>,
  weeks?: number,
) => HeatmapWeekRange = (today: Readonly<Date>, weeks: number = HEATMAP_WEEKS_ONE_YEAR) => {
  const endDate = copyCalendarDate(today)
  endDate.setHours(0, 0, 0, 0)

  if (weeks === HEATMAP_WEEKS_ONE_YEAR) {
    const rangeStart = getHeatmapYearStartMonth(endDate)
    const startDate = getHeatmapWeekStartAlignedToRange(rangeStart)

    return {
      rangeStart,
      startDate,
      weekCount: getHeatmapWeekCount(startDate, endDate),
    } satisfies HeatmapWeekRange
  }

  return resolveRollingHeatmapWeekRange(endDate, weeks) satisfies HeatmapWeekRange
}
