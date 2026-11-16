import { DateTime, Option, Predicate } from 'effect'
import { TZDate } from '@date-fns/tz'
import { UTCDate, UTCDateMini } from '@date-fns/utc'
import { constructFrom } from 'date-fns/constructFrom'

// JS Date exists only at the date-fns boundary. Clock reads are supplied
// by handler Layers; neither conversion obtains the current time.
// Invalid Date is an admitted date-fns value, but is outside DateTime's valid
// domain. Keep that sentinel at the interoperability boundary, without throwing
// a new error or introducing an ambient clock read.
const invalidDate = () => constructFrom(DateTime.toDateUtc(DateTime.makeUnsafe(0)), Number.NaN)

export const instantDate = (value: number | string): Date =>
  Option.match(DateTime.make(Predicate.isNumber(value) ? value : Date.parse(value)), {
    onNone: invalidDate,
    onSome: DateTime.toDateUtc,
  })

export function localDate(
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  millis = 0,
): Date {
  // Preserve the frozen constructor's 0..99 year convention and overflow
  // normalization before interpreting the civil parts in the host zone.
  const integerYear = Math.trunc(year)

  return Option.match(
    DateTime.make({
      year: integerYear >= 0 && integerYear <= 99 ? integerYear + 1900 : integerYear,
      month: Math.trunc(monthIndex) + 1,
      day: Math.trunc(day),
      hour: Math.trunc(hours),
      minute: Math.trunc(minutes),
      second: Math.trunc(seconds),
      millisecond: Math.trunc(millis),
    }),
    {
      onNone: invalidDate,
      // The terminal Z belongs to the normalization instant, not the requested
      // host-local civil date. Native ISO-local parsing retains the Source Date
      // constructor's DST resolution and complete three-part date range without
      // applying DateTime's narrower zoned-offset safety margin.
      onSome: (normalized) => instantDate(DateTime.formatIso(normalized).slice(0, -1)),
    },
  )
}

// UTC arithmetic uses Date's UTC accessors without named-zone offset lookup.
// Keep full Date formatting available on values returned by library operations.
export const zonedDate = (value: number | Date, timeZone: string): Date =>
  timeZone === 'UTC' ? new UTCDate(Number(value)) : new TZDate(Number(value), timeZone)

export function zonedCivilDate(
  year: number,
  monthIndex: number,
  day: number,
  timeZone: string,
  hours = 0,
  minutes = 0,
  seconds = 0,
): Date {
  return timeZone === 'UTC'
    ? new UTCDate(year, monthIndex, day, hours, minutes, seconds)
    : new TZDate(year, monthIndex, day, hours, minutes, seconds, timeZone)
}

// Custom callbacks previously received TZDate, including its Intl option defaults.
export const callbackDate = (date: Date): Date =>
  date instanceof UTCDateMini ? new TZDate(date.getTime(), 'UTC') : date

export function dateCallback<A extends Array<unknown>, R, Receiver>(
  handler: (this: Receiver, date: Date, ...args: A) => R,
): (this: Receiver, date: Date, ...args: A) => R {
  return function callDateCallback(this: Receiver, date, ...args) {
    return handler.call(this, callbackDate(date), ...args)
  }
}

export function optionalDateCallback<A extends Array<unknown>, R, Receiver>(
  handler: (this: Receiver, date: Date | undefined, ...args: A) => R,
): (this: Receiver, date: Date | undefined, ...args: A) => R {
  return function callOptionalDateCallback(this: Receiver, date, ...args) {
    return handler.call(this, date === undefined ? undefined : callbackDate(date), ...args)
  }
}
