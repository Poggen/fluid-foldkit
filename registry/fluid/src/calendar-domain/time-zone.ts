import { Predicate } from 'effect'
import { instantDate, zonedDate, zonedCivilDate } from './date-boundary.js'
/* @license Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
/* @license Full license: NOTICE */
import { TZDate } from '@date-fns/tz'
import { UTCDate } from '@date-fns/utc'
import type { Matcher } from './matcher-types.js'
import { isDateRange, isDateInterval, isDateAfterType, isDateBeforeType } from './matchers.js'

export const toTimeZone: (date: Date, timeZone: string) => Date = function toTimeZone(
  date: Date,
  timeZone: string,
) {
  if (timeZone === 'UTC') {
    return date instanceof UTCDate ? date : zonedDate(date, timeZone)
  }

  if (date instanceof TZDate && date.timeZone === timeZone) {
    return date
  }

  return zonedDate(date, timeZone)
}

const toZoneNoon: (date: Date, timeZone: string, noonSafe: boolean | undefined) => Date =
  function toZoneNoon(date: Date, timeZone: string, noonSafe: boolean | undefined) {
    if (noonSafe !== true) {
      return toTimeZone(date, timeZone)
    }

    const zoned = toTimeZone(date, timeZone)

    const noonZoned = zonedCivilDate(
      zoned.getFullYear(),
      zoned.getMonth(),
      zoned.getDate(),
      timeZone,
      12,
    )

    return instantDate(noonZoned.getTime())
  }

const convertMatcher: (
  matcher: Matcher,
  timeZone: string,
  noonSafe: boolean | undefined,
) => Matcher = function convertMatcher(
  matcher: Matcher,
  timeZone: string,
  noonSafe: boolean | undefined,
) {
  if (Predicate.isBoolean(matcher) || Predicate.isFunction(matcher)) {
    return matcher
  }

  if (matcher instanceof Date) {
    return toZoneNoon(matcher, timeZone, noonSafe)
  }

  if (Array.isArray(matcher)) {
    return matcher.map((value) =>
      value instanceof Date ? toZoneNoon(value, timeZone, noonSafe) : value,
    )
  }

  if (isDateRange(matcher)) {
    return {
      ...matcher,
      from: matcher.from !== undefined ? toTimeZone(matcher.from, timeZone) : matcher.from,
      to: matcher.to !== undefined ? toTimeZone(matcher.to, timeZone) : matcher.to,
    }
  }

  if (isDateInterval(matcher)) {
    return {
      before: toZoneNoon(matcher.before, timeZone, noonSafe),
      after: toZoneNoon(matcher.after, timeZone, noonSafe),
    }
  }

  if (isDateAfterType(matcher)) {
    return {
      after: toZoneNoon(matcher.after, timeZone, noonSafe),
    }
  }

  if (isDateBeforeType(matcher)) {
    return {
      before: toZoneNoon(matcher.before, timeZone, noonSafe),
    }
  }

  return matcher
}

export const convertMatchersToTimeZone: (
  matchers: Matcher | Array<Matcher> | undefined,
  timeZone: string,
  noonSafe?: boolean,
) => Matcher | Array<Matcher> | undefined = function convertMatchersToTimeZone(
  matchers: Matcher | Array<Matcher> | undefined,
  timeZone: string,
  noonSafe?: boolean,
) {
  if (matchers === undefined || matchers === false) {
    return matchers
  }

  if (Array.isArray(matchers)) {
    return matchers.map((matcher) => convertMatcher(matcher, timeZone, noonSafe))
  }

  return convertMatcher(matchers, timeZone, noonSafe)
}
