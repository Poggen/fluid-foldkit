import { Predicate } from 'effect'
import { callbackDate } from './date-boundary.js'
/* @license Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
/* @license Full license: NOTICE */
import { defaultDateLib } from './date-library.js'
import type { DateLib } from './date-library.js'
import type {
  Matcher,
  DateRange,
  DateBefore,
  DateAfter,
  DateInterval,
  DayOfWeek,
  ClosedDateRange,
} from './matcher-types.js'

export const rangeIncludesDate: (
  range: DateRange,
  date: Date,
  excludeEnds?: boolean,
  dateLib?: DateLib,
) => boolean = function (
  range: DateRange,
  date: Date,
  excludeEnds = false,
  dateLib = defaultDateLib,
) {
  let { from, to } = range

  const { differenceInCalendarDays, isSameDay } = dateLib

  if (from !== undefined && to !== undefined) {
    const isRangeInverted = differenceInCalendarDays(to, from) < 0

    if (isRangeInverted) {
      ;[from, to] = [to, from]
    }

    const isInRange =
      differenceInCalendarDays(date, from) >= (excludeEnds ? 1 : 0) &&
      differenceInCalendarDays(to, date) >= (excludeEnds ? 1 : 0)

    return isInRange satisfies boolean
  }

  if (!excludeEnds && to !== undefined) {
    return isSameDay(to, date) satisfies boolean
  }

  if (!excludeEnds && from !== undefined) {
    return isSameDay(from, date) satisfies boolean
  }

  return false satisfies boolean
}

export const rangeOverlaps: (
  rangeLeft: ClosedDateRange,
  rangeRight: ClosedDateRange,
  dateLib?: DateLib,
) => boolean = function (
  rangeLeft: ClosedDateRange,
  rangeRight: ClosedDateRange,
  dateLib = defaultDateLib,
) {
  return (rangeIncludesDate(rangeLeft, rangeRight.from, false, dateLib) ||
    rangeIncludesDate(rangeLeft, rangeRight.to, false, dateLib) ||
    rangeIncludesDate(rangeRight, rangeLeft.from, false, dateLib) ||
    rangeIncludesDate(rangeRight, rangeLeft.to, false, dateLib)) satisfies boolean
}

export const rangeContainsDayOfWeek: (
  range: ClosedDateRange,
  dayOfWeek: number | Array<number>,
  dateLib?: DateLib,
) => boolean = function (
  range: ClosedDateRange,
  dayOfWeek: number | Array<number>,
  dateLib = defaultDateLib,
) {
  const dayOfWeekArr = Array.isArray(dayOfWeek) ? dayOfWeek : [dayOfWeek]

  let date = range.from

  const totalDays = dateLib.differenceInCalendarDays(range.to, range.from)

  const totalDaysLimit = Math.min(totalDays, 6)

  for (let i = 0; i <= totalDaysLimit; i += 1) {
    if (dayOfWeekArr.includes(date.getDay())) {
      return true satisfies boolean
    }

    date = dateLib.addDays(date, 1)
  }

  return false satisfies boolean
}

export const dateMatchModifiers: (
  date: Date,
  matchers: Matcher | Array<Matcher>,
  dateLib?: DateLib,
) => boolean = function (date: Date, matchers: Matcher | Array<Matcher>, dateLib = defaultDateLib) {
  const matchersArr = Array.isArray(matchers) ? matchers : [matchers]

  const { isSameDay, differenceInCalendarDays, isAfter } = dateLib

  return matchersArr.some((matcher) => {
    if (Predicate.isBoolean(matcher)) {
      return matcher
    }

    if (dateLib.isDate(matcher)) {
      return isSameDay(date, matcher)
    }

    if (isDatesArray(matcher, dateLib)) {
      return matcher.some((matcherDate) => isSameDay(date, matcherDate))
    }

    if (isDateRange(matcher)) {
      return rangeIncludesDate(matcher, date, false, dateLib)
    }

    if (isDayOfWeekType(matcher)) {
      return Array.isArray(matcher.dayOfWeek)
        ? matcher.dayOfWeek.includes(date.getDay())
        : matcher.dayOfWeek === date.getDay()
    }

    if (isDateInterval(matcher)) {
      const diffBefore = differenceInCalendarDays(matcher.before, date)

      const diffAfter = differenceInCalendarDays(matcher.after, date)

      const isDayBefore = diffBefore > 0

      const isDayAfter = diffAfter < 0

      const isClosedInterval = isAfter(matcher.before, matcher.after)

      return isClosedInterval ? isDayAfter && isDayBefore : isDayBefore || isDayAfter
    }

    if (isDateAfterType(matcher)) {
      return differenceInCalendarDays(date, matcher.after) > 0
    }

    if (isDateBeforeType(matcher)) {
      return differenceInCalendarDays(matcher.before, date) > 0
    }

    if (Predicate.isFunction(matcher)) {
      return matcher(callbackDate(date))
    }

    return false
  }) satisfies boolean
}

export const rangeContainsModifiers: (
  range: ClosedDateRange,
  modifiers: Matcher | Array<Matcher>,
  dateLib?: DateLib,
) => boolean = function (
  range: ClosedDateRange,
  modifiers: Matcher | Array<Matcher>,
  dateLib = defaultDateLib,
) {
  const matchers = Array.isArray(modifiers) ? modifiers : [modifiers]

  const nonFunctionMatchers = matchers.filter((matcher) => !Predicate.isFunction(matcher))

  const nonFunctionMatchersResult = nonFunctionMatchers.some((matcher) => {
    if (Predicate.isBoolean(matcher)) {
      return matcher
    }

    if (dateLib.isDate(matcher)) {
      return rangeIncludesDate(range, matcher, false, dateLib)
    }

    if (isDatesArray(matcher, dateLib)) {
      return matcher.some((date) => rangeIncludesDate(range, date, false, dateLib))
    }

    if (isDateRange(matcher)) {
      if (matcher.from !== undefined && matcher.to !== undefined) {
        return rangeOverlaps(range, { from: matcher.from, to: matcher.to }, dateLib)
      }

      return false
    }

    if (isDayOfWeekType(matcher)) {
      return rangeContainsDayOfWeek(range, matcher.dayOfWeek, dateLib)
    }

    if (isDateInterval(matcher)) {
      const isClosedInterval = dateLib.isAfter(matcher.before, matcher.after)

      if (isClosedInterval) {
        return rangeOverlaps(
          range,
          {
            from: dateLib.addDays(matcher.after, 1),
            to: dateLib.addDays(matcher.before, -1),
          },
          dateLib,
        )
      }

      return (
        dateMatchModifiers(range.from, matcher, dateLib) ||
        dateMatchModifiers(range.to, matcher, dateLib)
      )
    }

    if (isDateAfterType(matcher) || isDateBeforeType(matcher)) {
      return (
        dateMatchModifiers(range.from, matcher, dateLib) ||
        dateMatchModifiers(range.to, matcher, dateLib)
      )
    }

    return false
  })

  if (nonFunctionMatchersResult) {
    return true satisfies boolean
  }

  const functionMatchers = matchers.filter((matcher): matcher is (date: Date) => boolean =>
    Predicate.isFunction(matcher),
  )

  if (functionMatchers.length > 0) {
    let date = range.from

    const totalDays = dateLib.differenceInCalendarDays(range.to, range.from)

    for (let i = 0; i <= totalDays; i += 1) {
      const currentDate = date

      if (functionMatchers.some((matcher) => matcher(callbackDate(currentDate)))) {
        return true satisfies boolean
      }

      date = dateLib.addDays(date, 1)
    }
  }

  return false satisfies boolean
}

export function isDateInterval(matcher: Matcher): matcher is DateInterval {
  return Predicate.isObjectOrArray(matcher) && 'before' in matcher && 'after' in matcher
}

export function isDateRange(value: Matcher): value is DateRange {
  return Predicate.isObjectOrArray(value) && 'from' in value
}

export function isDateAfterType(value: Matcher): value is DateAfter {
  return Predicate.isObjectOrArray(value) && 'after' in value
}

export function isDateBeforeType(value: Matcher): value is DateBefore {
  return Predicate.isObjectOrArray(value) && 'before' in value
}

export function isDayOfWeekType(value: Matcher): value is DayOfWeek {
  return Predicate.isObjectOrArray(value) && 'dayOfWeek' in value
}

export function isDatesArray(value: Matcher, dateLib: DateLib): value is Array<Date> {
  return Array.isArray(value) && value.every(dateLib.isDate)
}
