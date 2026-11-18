import { instantDate, localDate, zonedDate, zonedCivilDate } from './date-boundary.js'
import { DateTime, Predicate } from 'effect'
/* @license Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
/* @license Full license: NOTICE */
import type { DateLib, DateLibOptions } from './date-library.js'
import { differenceInCalendarDays as differenceInCalendarDaysFn } from 'date-fns/differenceInCalendarDays'
import { differenceInCalendarMonths as differenceInCalendarMonthsFn } from 'date-fns/differenceInCalendarMonths'
import { getISOWeek as getISOWeekFn } from 'date-fns/getISOWeek'
import { getWeek as getWeekFn } from 'date-fns/getWeek'

export const createNoonOverrides: (
  timeZone: string,
  options?: Pick<DateLibOptions, 'weekStartsOn' | 'locale'>,
) => Partial<DateLib> = function createNoonOverrides(
  timeZone: string,
  options: Pick<DateLibOptions, 'weekStartsOn' | 'locale'> = {},
) {
  const { weekStartsOn, locale } = options

  const fallbackWeekStartsOn = weekStartsOn ?? locale?.options?.weekStartsOn ?? 0

  const toNoonDate = (date: Date | number | string) => {
    const normalizedDate =
      Predicate.isNumber(date) || Predicate.isString(date) ? instantDate(date) : date

    return zonedCivilDate(
      normalizedDate.getFullYear(),
      normalizedDate.getMonth(),
      normalizedDate.getDate(),
      timeZone,
      12,
    )
  }

  const toCalendarDate = (date: Date) => {
    const zoned = toNoonDate(date)

    return localDate(zoned.getFullYear(), zoned.getMonth(), zoned.getDate())
  }

  return {
    today: () => toNoonDate(zonedDate(DateTime.toEpochMillis(DateTime.nowUnsafe()), timeZone)),
    newDate: (year, monthIndex, date) => zonedCivilDate(year, monthIndex, date, timeZone, 12),
    startOfDay: toNoonDate,
    startOfWeek: (date, operationOptions) => {
      const base = toNoonDate(date)

      const weekStartsOnValue = operationOptions?.weekStartsOn ?? fallbackWeekStartsOn

      const diff = (base.getDay() - weekStartsOnValue + 7) % 7
      base.setDate(base.getDate() - diff)

      return base
    },
    startOfISOWeek: (date) => {
      const base = toNoonDate(date)

      const diff = (base.getDay() - 1 + 7) % 7
      base.setDate(base.getDate() - diff)

      return base
    },
    startOfMonth: (date) => {
      const base = toNoonDate(date)
      base.setDate(1)

      return base
    },
    startOfYear: (date) => {
      const base = toNoonDate(date)
      base.setMonth(0, 1)

      return base
    },
    endOfWeek: (date, operationOptions) => {
      const base = toNoonDate(date)

      const weekStartsOnValue = operationOptions?.weekStartsOn ?? fallbackWeekStartsOn

      const endDow = (weekStartsOnValue + 6) % 7

      const diff = (endDow - base.getDay() + 7) % 7
      base.setDate(base.getDate() + diff)

      return base
    },
    endOfISOWeek: (date) => {
      const base = toNoonDate(date)

      const diff = (7 - base.getDay()) % 7
      base.setDate(base.getDate() + diff)

      return base
    },
    endOfMonth: (date) => {
      const base = toNoonDate(date)
      base.setMonth(base.getMonth() + 1, 0)

      return base
    },
    endOfYear: (date) => {
      const base = toNoonDate(date)
      base.setMonth(11, 31)

      return base
    },
    eachMonthOfInterval: (interval) => {
      const start = toNoonDate(interval.start)

      const end = toNoonDate(interval.end)

      const result = []

      const cursor = zonedCivilDate(start.getFullYear(), start.getMonth(), 1, timeZone, 12)

      const endKey = end.getFullYear() * 12 + end.getMonth()

      while (cursor.getFullYear() * 12 + cursor.getMonth() <= endKey) {
        result.push(zonedDate(cursor, timeZone))
        cursor.setMonth(cursor.getMonth() + 1, 1)
      }

      return result
    },

    addDays: (date, amount) => {
      const base = toNoonDate(date)
      base.setDate(base.getDate() + amount)

      return base
    },
    addWeeks: (date, amount) => {
      const base = toNoonDate(date)
      base.setDate(base.getDate() + amount * 7)

      return base
    },
    addMonths: (date, amount) => {
      const base = toNoonDate(date)
      base.setMonth(base.getMonth() + amount)

      return base
    },
    addYears: (date, amount) => {
      const base = toNoonDate(date)
      base.setFullYear(base.getFullYear() + amount)

      return base
    },
    eachYearOfInterval: (interval) => {
      const start = toNoonDate(interval.start)

      const end = toNoonDate(interval.end)

      const years = []

      const cursor = zonedCivilDate(start.getFullYear(), 0, 1, timeZone, 12)

      while (cursor.getFullYear() <= end.getFullYear()) {
        years.push(zonedDate(cursor, timeZone))
        cursor.setFullYear(cursor.getFullYear() + 1, 0, 1)
      }

      return years
    },
    getWeek: (date, operationOptions) => {
      const base = toCalendarDate(date)

      return getWeekFn(base, {
        weekStartsOn: operationOptions?.weekStartsOn ?? fallbackWeekStartsOn,
        firstWeekContainsDate:
          operationOptions?.firstWeekContainsDate ?? locale?.options?.firstWeekContainsDate ?? 1,
      })
    },
    getISOWeek: (date) => {
      const base = toCalendarDate(date)

      return getISOWeekFn(base)
    },
    differenceInCalendarDays: (dateLeft, dateRight) => {
      const left = toCalendarDate(dateLeft)

      const right = toCalendarDate(dateRight)

      return differenceInCalendarDaysFn(left, right)
    },
    differenceInCalendarMonths: (dateLeft, dateRight) => {
      const left = toCalendarDate(dateLeft)

      const right = toCalendarDate(dateRight)

      return differenceInCalendarMonthsFn(left, right)
    },
  }
}
