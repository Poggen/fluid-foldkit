// Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors.
// Full license: NOTICE
import { dateCallback } from './date-boundary.js'
import { DateLib, defaultDateLib } from './date-library.js'
import type { DateLibOptions } from './date-library.js'

export function formatCaption(month: Date, options?: DateLibOptions, dateLib?: DateLib): string {
  const lib = dateLib ?? new DateLib(options)

  return lib.formatMonthYear(month)
}

export function formatDay(date: Date, options?: DateLibOptions, dateLib?: DateLib): string {
  return (dateLib ?? new DateLib(options)).format(date, 'd')
}

export function formatMonthDropdown(month: Date, dateLib: DateLib = defaultDateLib): string {
  return dateLib.format(month, 'LLLL')
}

export function formatWeekNumber(weekNumber: number, dateLib: DateLib = defaultDateLib): string {
  if (weekNumber < 10) {
    return dateLib.formatNumber(`0${weekNumber.toLocaleString()}`)
  }

  return dateLib.formatNumber(weekNumber.toLocaleString())
}

export function formatWeekNumberHeader(): string {
  return ``
}

export function formatWeekdayName(
  weekday: Date,
  options?: DateLibOptions,
  dateLib?: DateLib,
): string {
  return (dateLib ?? new DateLib(options)).format(weekday, 'cccccc')
}

export function formatYearDropdown(year: Date, dateLib: DateLib = defaultDateLib): string {
  return dateLib.format(year, 'yyyy')
}

export interface CalendarFormatters {
  readonly formatCaption: typeof formatCaption
  readonly formatDay: typeof formatDay
  readonly formatMonthDropdown: typeof formatMonthDropdown
  readonly formatWeekNumber: typeof formatWeekNumber
  readonly formatWeekNumberHeader: typeof formatWeekNumberHeader
  readonly formatWeekdayName: typeof formatWeekdayName
  readonly formatYearDropdown: typeof formatYearDropdown
}

export const defaultCalendarFormatters = {
  formatCaption,
  formatDay,
  formatMonthDropdown,
  formatWeekNumber,
  formatWeekNumberHeader,
  formatWeekdayName,
  formatYearDropdown,
}

export function resolveFormatters(custom: Partial<CalendarFormatters> = {}): CalendarFormatters {
  return {
    ...defaultCalendarFormatters,
    formatWeekNumber: String,
    ...custom,
    formatCaption:
      custom.formatCaption === undefined ? formatCaption : dateCallback(custom.formatCaption),
    formatDay: custom.formatDay === undefined ? formatDay : dateCallback(custom.formatDay),
    formatMonthDropdown:
      custom.formatMonthDropdown === undefined
        ? formatMonthDropdown
        : dateCallback(custom.formatMonthDropdown),
    formatWeekdayName:
      custom.formatWeekdayName === undefined
        ? formatWeekdayName
        : dateCallback(custom.formatWeekdayName),
    formatYearDropdown:
      custom.formatYearDropdown === undefined
        ? formatYearDropdown
        : dateCallback(custom.formatYearDropdown),
  }
}
