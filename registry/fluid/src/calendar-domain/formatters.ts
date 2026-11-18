/* @license Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
/* @license Full license: NOTICE */
import { dateCallback } from './date-boundary.js'
import { DateLib, defaultDateLib } from './date-library.js'
import type { DateLibOptions } from './date-library.js'

export const formatCaption: (month: Date, options?: DateLibOptions, dateLib?: DateLib) => string =
  function formatCaption(month: Date, options?: DateLibOptions, dateLib?: DateLib) {
    const lib = dateLib ?? new DateLib(options)

    return lib.formatMonthYear(month)
  }

export const formatDay: (date: Date, options?: DateLibOptions, dateLib?: DateLib) => string =
  function formatDay(date: Date, options?: DateLibOptions, dateLib?: DateLib) {
    return (dateLib ?? new DateLib(options)).format(date, 'd')
  }

export const formatMonthDropdown: (month: Date, dateLib?: DateLib) => string =
  function formatMonthDropdown(month: Date, dateLib: DateLib = defaultDateLib) {
    return dateLib.format(month, 'LLLL')
  }

export const formatWeekNumber: (weekNumber: number, dateLib?: DateLib) => string =
  function formatWeekNumber(weekNumber: number, dateLib: DateLib = defaultDateLib) {
    if (weekNumber < 10) {
      return dateLib.formatNumber(`0${weekNumber.toLocaleString()}`)
    }

    return dateLib.formatNumber(weekNumber.toLocaleString())
  }

export const formatWeekNumberHeader: () => string = function formatWeekNumberHeader() {
  return ``
}

export const formatWeekdayName: (
  weekday: Date,
  options?: DateLibOptions,
  dateLib?: DateLib,
) => string = function formatWeekdayName(
  weekday: Date,
  options?: DateLibOptions,
  dateLib?: DateLib,
) {
  return (dateLib ?? new DateLib(options)).format(weekday, 'cccccc')
}

export const formatYearDropdown: (year: Date, dateLib?: DateLib) => string =
  function formatYearDropdown(year: Date, dateLib: DateLib = defaultDateLib) {
    return dateLib.format(year, 'yyyy')
  }

export const resolveFormatters: (custom?: Partial<CalendarFormatters>) => CalendarFormatters =
  function resolveFormatters(custom: Partial<CalendarFormatters> = {}) {
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
