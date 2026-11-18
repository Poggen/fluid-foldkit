import { DateTime } from 'effect'
import { callbackDate, localDate, zonedDate, zonedCivilDate } from './date-boundary.js'
import type { Interval } from 'date-fns'
import type { EndOfWeekOptions } from 'date-fns/endOfWeek'
import type { FormatOptions as DateFnsFormatOptions } from 'date-fns/format'
import type { GetMonthOptions } from 'date-fns/getMonth'
import type { GetWeekOptions } from 'date-fns/getWeek'
import type { GetYearOptions } from 'date-fns/getYear'
import type { CalendarLocale } from './labels.js'
import type { StartOfWeekOptions } from 'date-fns/startOfWeek'
import { addDays } from 'date-fns/addDays'
import { addMonths } from 'date-fns/addMonths'
import { addWeeks } from 'date-fns/addWeeks'
import { addYears } from 'date-fns/addYears'
import { differenceInCalendarDays } from 'date-fns/differenceInCalendarDays'
import { differenceInCalendarMonths } from 'date-fns/differenceInCalendarMonths'
import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval'
import { eachYearOfInterval } from 'date-fns/eachYearOfInterval'
import { endOfISOWeek } from 'date-fns/endOfISOWeek'
import { endOfMonth } from 'date-fns/endOfMonth'
import { endOfWeek } from 'date-fns/endOfWeek'
import { endOfYear } from 'date-fns/endOfYear'
import { format } from 'date-fns/format'
import { getISOWeek } from 'date-fns/getISOWeek'
import { getMonth } from 'date-fns/getMonth'
import { getWeek } from 'date-fns/getWeek'
import { getYear } from 'date-fns/getYear'
import { isAfter } from 'date-fns/isAfter'
import { isBefore } from 'date-fns/isBefore'
import { isDate } from 'date-fns/isDate'
import { isSameDay } from 'date-fns/isSameDay'
import { isSameMonth } from 'date-fns/isSameMonth'
import { isSameYear } from 'date-fns/isSameYear'
import { max } from 'date-fns/max'
import { min } from 'date-fns/min'
import { setMonth } from 'date-fns/setMonth'
import { setYear } from 'date-fns/setYear'
import { startOfDay } from 'date-fns/startOfDay'
import { startOfISOWeek } from 'date-fns/startOfISOWeek'
import { startOfMonth } from 'date-fns/startOfMonth'
import { startOfWeek } from 'date-fns/startOfWeek'
import { startOfYear } from 'date-fns/startOfYear'
import { endOfBroadcastWeek, startOfBroadcastWeek } from './broadcast.js'
import { enUS } from 'date-fns/locale/en-US'

/* @license Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
/* @license Full license: NOTICE */

export interface DateLibOptions extends DateFnsFormatOptions, StartOfWeekOptions, EndOfWeekOptions {
  readonly Date?: typeof Date
  readonly locale?: CalendarLocale
  readonly timeZone?: string
  readonly numerals?: Numerals
}

export type Numerals =
  | 'latn'
  | 'arab'
  | 'arabext'
  | 'deva'
  | 'geez'
  | 'beng'
  | 'guru'
  | 'gujr'
  | 'orya'
  | 'tamldec'
  | 'telu'
  | 'knda'
  | 'mlym'
  | 'thai'
  | 'mymr'
  | 'khmr'
  | 'laoo'
  | 'tibt'

export type MonthYearOrder = 'month-first' | 'year-first'

export class DateLib {
  readonly options: DateLibOptions
  readonly overrides: Partial<DateLib> | undefined
  private static readonly yearFirstLocales = new Set([
    'eu',
    'hu',
    'ja',
    'ja-Hira',
    'ja-JP',
    'ko',
    'ko-KR',
    'lt',
    'lt-LT',
    'lv',
    'lv-LV',
    'mn',
    'mn-MN',
    'zh',
    'zh-CN',
    'zh-HK',
    'zh-TW',
  ])
  today: () => Date
  newDate: (year: number, monthIndex: number, date: number) => Date
  addDays: (date: Date, amount: number) => Date
  addMonths: (date: Date, amount: number) => Date
  addWeeks: (date: Date, amount: number) => Date
  addYears: (date: Date, amount: number) => Date
  differenceInCalendarDays: (dateLeft: Date, dateRight: Date) => number
  differenceInCalendarMonths: (dateLeft: Date, dateRight: Date) => number
  eachMonthOfInterval: (interval: Interval) => Array<Date>
  eachYearOfInterval: (interval: Interval) => Array<Date>
  endOfBroadcastWeek: (date: Date) => Date
  endOfISOWeek: (date: Date) => Date
  endOfMonth: (date: Date) => Date
  endOfWeek: (date: Date, options?: EndOfWeekOptions) => Date
  endOfYear: (date: Date) => Date
  format: (date: Date, formatStr: string, _options?: DateFnsFormatOptions) => string
  getISOWeek: (date: Date) => number
  getMonth: (date: Date, _options?: GetMonthOptions) => number
  getYear: (date: Date, _options?: GetYearOptions) => number
  getWeek: (date: Date, _options?: GetWeekOptions) => number
  isAfter: (date: Date, dateToCompare: Date) => boolean
  isBefore: (date: Date, dateToCompare: Date) => boolean
  isDate: (value: unknown) => value is Date
  isSameDay: (dateLeft: Date, dateRight: Date) => boolean
  isSameMonth: (dateLeft: Date, dateRight: Date) => boolean
  isSameYear: (dateLeft: Date, dateRight: Date) => boolean
  max: (dates: Array<Date>) => Date
  min: (dates: Array<Date>) => Date
  setMonth: (date: Date, month: number) => Date
  setYear: (date: Date, year: number) => Date
  startOfBroadcastWeek: (date: Date, _dateLib: DateLib) => Date
  startOfDay: (date: Date) => Date
  startOfISOWeek: (date: Date) => Date
  startOfMonth: (date: Date) => Date
  startOfWeek: (date: Date, _options?: StartOfWeekOptions) => Date
  startOfYear: (date: Date) => Date

  constructor(
    options?: DateLibOptions,
    overrides?: Partial<DateLib>,
    internalOverrides?: Partial<DateLib>,
  ) {
    const customDate: (operation: keyof DateLib, date: Date) => Date = (
      operation: keyof DateLib,
      date: Date,
    ) => (overrides?.[operation] === undefined ? date : callbackDate(date))

    const customInterval: (operation: keyof DateLib, interval: Interval) => Interval = (
      operation: keyof DateLib,
      interval: Interval,
    ) => {
      if (overrides?.[operation] === undefined) {
        return interval
      }

      const start = interval.start instanceof Date ? callbackDate(interval.start) : interval.start
      const end = interval.end instanceof Date ? callbackDate(interval.end) : interval.end

      return start === interval.start && end === interval.end
        ? interval
        : { ...interval, start, end }
    }

    const customDates: (operation: keyof DateLib, dates: Array<Date>) => Array<Date> = (
      operation: keyof DateLib,
      dates: Array<Date>,
    ) => {
      if (overrides?.[operation] === undefined) {
        return dates
      }

      const converted = dates.map(callbackDate)

      return converted.every((date, index) => date === dates[index]) ? dates : converted
    }

    this.today = () => {
      if (this.overrides?.today) {
        return this.overrides.today()
      }

      if (this.options.timeZone !== undefined && this.options.timeZone !== '') {
        return zonedDate(DateTime.toEpochMillis(DateTime.nowUnsafe()), this.options.timeZone)
      }

      if (this.options.Date) {
        return new this.options.Date()
      }

      return DateTime.toDateUtc(DateTime.nowUnsafe())
    }

    this.newDate = (year, monthIndex, date) => {
      if (this.overrides?.newDate) {
        return this.overrides.newDate(year, monthIndex, date)
      }

      if (this.options.timeZone !== undefined && this.options.timeZone !== '') {
        return zonedCivilDate(year, monthIndex, date, this.options.timeZone)
      }

      return localDate(year, monthIndex, date)
    }

    this.addDays = (date, amount) =>
      this.overrides?.addDays
        ? this.overrides.addDays(customDate('addDays', date), amount)
        : addDays(date, amount)

    this.addMonths = (date, amount) =>
      this.overrides?.addMonths
        ? this.overrides.addMonths(customDate('addMonths', date), amount)
        : addMonths(date, amount)

    this.addWeeks = (date, amount) =>
      this.overrides?.addWeeks
        ? this.overrides.addWeeks(customDate('addWeeks', date), amount)
        : addWeeks(date, amount)

    this.addYears = (date, amount) =>
      this.overrides?.addYears
        ? this.overrides.addYears(customDate('addYears', date), amount)
        : addYears(date, amount)

    this.differenceInCalendarDays = (dateLeft, dateRight) =>
      this.overrides?.differenceInCalendarDays
        ? this.overrides.differenceInCalendarDays(
            customDate('differenceInCalendarDays', dateLeft),
            customDate('differenceInCalendarDays', dateRight),
          )
        : differenceInCalendarDays(dateLeft, dateRight)

    this.differenceInCalendarMonths = (dateLeft, dateRight) =>
      this.overrides?.differenceInCalendarMonths
        ? this.overrides.differenceInCalendarMonths(
            customDate('differenceInCalendarMonths', dateLeft),
            customDate('differenceInCalendarMonths', dateRight),
          )
        : differenceInCalendarMonths(dateLeft, dateRight)

    this.eachMonthOfInterval = (interval) =>
      this.overrides?.eachMonthOfInterval
        ? this.overrides.eachMonthOfInterval(customInterval('eachMonthOfInterval', interval))
        : eachMonthOfInterval(interval)

    this.eachYearOfInterval = (interval) => {
      const years = this.overrides?.eachYearOfInterval
        ? this.overrides.eachYearOfInterval(customInterval('eachYearOfInterval', interval))
        : eachYearOfInterval(interval)

      const uniqueYears = new Set(years.map((d) => this.getYear(d)))

      if (uniqueYears.size === years.length) {
        return years
      }

      const yearsArray: Array<Date> = []

      for (const year of uniqueYears) {
        yearsArray.push(localDate(year, 0, 1))
      }

      return yearsArray
    }

    this.endOfBroadcastWeek = (date) =>
      this.overrides?.endOfBroadcastWeek
        ? this.overrides.endOfBroadcastWeek(customDate('endOfBroadcastWeek', date))
        : endOfBroadcastWeek(date, this)

    this.endOfISOWeek = (date) =>
      this.overrides?.endOfISOWeek
        ? this.overrides.endOfISOWeek(customDate('endOfISOWeek', date))
        : endOfISOWeek(date)

    this.endOfMonth = (date) =>
      this.overrides?.endOfMonth
        ? this.overrides.endOfMonth(customDate('endOfMonth', date))
        : endOfMonth(date)

    this.endOfWeek = (date, operationOptions) =>
      this.overrides?.endOfWeek
        ? this.overrides.endOfWeek(customDate('endOfWeek', date), operationOptions)
        : endOfWeek(date, this.options)

    this.endOfYear = (date) =>
      this.overrides?.endOfYear
        ? this.overrides.endOfYear(customDate('endOfYear', date))
        : endOfYear(date)

    this.format = (date, formatStr, _options) => {
      const formatted = this.overrides?.format
        ? this.overrides.format(customDate('format', date), formatStr, this.options)
        : format(date, formatStr, this.options)

      if (this.options.numerals !== undefined && this.options.numerals !== 'latn') {
        return this.replaceDigits(formatted)
      }

      return formatted
    }

    this.getISOWeek = (date) =>
      this.overrides?.getISOWeek
        ? this.overrides.getISOWeek(customDate('getISOWeek', date))
        : getISOWeek(date)

    this.getMonth = (date, _options) =>
      this.overrides?.getMonth
        ? this.overrides.getMonth(customDate('getMonth', date), this.options)
        : getMonth(date, this.options)

    this.getYear = (date, _options) =>
      this.overrides?.getYear
        ? this.overrides.getYear(customDate('getYear', date), this.options)
        : getYear(date, this.options)

    this.getWeek = (date, _options) =>
      this.overrides?.getWeek
        ? this.overrides.getWeek(customDate('getWeek', date), this.options)
        : getWeek(date, this.options)

    this.isAfter = (date, dateToCompare) =>
      this.overrides?.isAfter
        ? this.overrides.isAfter(customDate('isAfter', date), customDate('isAfter', dateToCompare))
        : isAfter(date, dateToCompare)

    this.isBefore = (date, dateToCompare) =>
      this.overrides?.isBefore
        ? this.overrides.isBefore(
            customDate('isBefore', date),
            customDate('isBefore', dateToCompare),
          )
        : isBefore(date, dateToCompare)

    this.isDate = (value): value is Date =>
      this.overrides?.isDate
        ? this.overrides.isDate(value instanceof Date ? customDate('isDate', value) : value)
        : isDate(value)

    this.isSameDay = (dateLeft, dateRight) =>
      this.overrides?.isSameDay
        ? this.overrides.isSameDay(
            customDate('isSameDay', dateLeft),
            customDate('isSameDay', dateRight),
          )
        : isSameDay(dateLeft, dateRight)

    this.isSameMonth = (dateLeft, dateRight) =>
      this.overrides?.isSameMonth
        ? this.overrides.isSameMonth(
            customDate('isSameMonth', dateLeft),
            customDate('isSameMonth', dateRight),
          )
        : isSameMonth(dateLeft, dateRight)

    this.isSameYear = (dateLeft, dateRight) =>
      this.overrides?.isSameYear
        ? this.overrides.isSameYear(
            customDate('isSameYear', dateLeft),
            customDate('isSameYear', dateRight),
          )
        : isSameYear(dateLeft, dateRight)

    this.max = (dates) =>
      this.overrides?.max ? this.overrides.max(customDates('max', dates)) : max(dates)

    this.min = (dates) =>
      this.overrides?.min ? this.overrides.min(customDates('min', dates)) : min(dates)

    this.setMonth = (date, month) =>
      this.overrides?.setMonth
        ? this.overrides.setMonth(customDate('setMonth', date), month)
        : setMonth(date, month)

    this.setYear = (date, year) =>
      this.overrides?.setYear
        ? this.overrides.setYear(customDate('setYear', date), year)
        : setYear(date, year)

    this.startOfBroadcastWeek = (date, _dateLib) =>
      this.overrides?.startOfBroadcastWeek
        ? this.overrides.startOfBroadcastWeek(customDate('startOfBroadcastWeek', date), this)
        : startOfBroadcastWeek(date, this)

    this.startOfDay = (date) =>
      this.overrides?.startOfDay
        ? this.overrides.startOfDay(customDate('startOfDay', date))
        : startOfDay(date)

    this.startOfISOWeek = (date) =>
      this.overrides?.startOfISOWeek
        ? this.overrides.startOfISOWeek(customDate('startOfISOWeek', date))
        : startOfISOWeek(date)

    this.startOfMonth = (date) =>
      this.overrides?.startOfMonth
        ? this.overrides.startOfMonth(customDate('startOfMonth', date))
        : startOfMonth(date)

    this.startOfWeek = (date, _options) =>
      this.overrides?.startOfWeek
        ? this.overrides.startOfWeek(customDate('startOfWeek', date), this.options)
        : startOfWeek(date, this.options)

    this.startOfYear = (date) =>
      this.overrides?.startOfYear
        ? this.overrides.startOfYear(customDate('startOfYear', date))
        : startOfYear(date)

    this.options = { locale: enUS, ...options }
    this.overrides =
      internalOverrides === undefined ? overrides : { ...internalOverrides, ...overrides }
  }

  private getDigitMap() {
    const { numerals = 'latn' } = this.options

    const formatter = new Intl.NumberFormat('en-US', {
      numberingSystem: numerals,
    })

    const digitMap: Record<string, string> = {}

    for (let i = 0; i < 10; i += 1) {
      digitMap[i.toString()] = formatter.format(i)
    }

    return digitMap
  }

  private replaceDigits(input: string) {
    const digitMap = this.getDigitMap()

    return input.replaceAll(/\d/gu, (digit) => digitMap[digit] ?? digit) satisfies string
  }

  formatNumber(value: number | string) {
    return this.replaceDigits(value.toString()) satisfies string
  }

  getMonthYearOrder() {
    const code = this.options.locale?.code

    if (code === undefined || code === '') {
      return 'month-first' satisfies MonthYearOrder
    }

    return (
      DateLib.yearFirstLocales.has(code) ? 'year-first' : 'month-first'
    ) satisfies MonthYearOrder
  }

  formatMonthYear(date: Date) {
    const { locale, timeZone, numerals } = this.options

    const localeCode = locale?.code

    if (localeCode !== undefined && localeCode !== '' && DateLib.yearFirstLocales.has(localeCode)) {
      try {
        const intl = new Intl.DateTimeFormat(localeCode, {
          month: 'long',
          year: 'numeric',
          timeZone,
          numberingSystem: numerals,
        })

        const formatted = intl.format(date)

        return formatted satisfies string
      } catch {}
    }

    const pattern = this.getMonthYearOrder() === 'year-first' ? 'y LLLL' : 'LLLL y'

    return this.format(date, pattern) satisfies string
  }
}

export { enUS as defaultLocale } from 'date-fns/locale/en-US'

export const defaultDateLib = new DateLib()
