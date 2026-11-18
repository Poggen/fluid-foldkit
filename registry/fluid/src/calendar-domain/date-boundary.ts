import { DateTime, Option, Predicate } from 'effect'
import { TZDate } from '@date-fns/tz'
import { UTCDate, UTCDateMini } from '@date-fns/utc'
import { constructFrom } from 'date-fns/constructFrom'

export const localDate: (
  year: number,
  monthIndex: number,
  day: number,
  hours?: number,
  minutes?: number,
  seconds?: number,
  millis?: number,
) => Date = function (
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  millis = 0,
) {
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

      onSome: (normalized) => instantDate(DateTime.formatIso(normalized).slice(0, -1)),
    },
  ) satisfies Date
}

export const zonedCivilDate: (
  year: number,
  monthIndex: number,
  day: number,
  timeZone: string,
  hours?: number,
  minutes?: number,
  seconds?: number,
) => Date = function (
  year: number,
  monthIndex: number,
  day: number,
  timeZone: string,
  hours = 0,
  minutes = 0,
  seconds = 0,
) {
  return (
    timeZone === 'UTC'
      ? new UTCDate(year, monthIndex, day, hours, minutes, seconds)
      : new TZDate(year, monthIndex, day, hours, minutes, seconds, timeZone)
  ) satisfies Date
}

export const dateCallback: <A extends Array<unknown>, R, Receiver>(
  handler: (this: Receiver, date: Date, ...args: A) => R,
) => (this: Receiver, date: Date, ...args: A) => R = function dateCallback<
  A extends Array<unknown>,
  R,
  Receiver,
>(handler: (this: Receiver, date: Date, ...args: A) => R) {
  return function callDateCallback(this: Receiver, date, ...args) {
    return handler.call(this, callbackDate(date), ...args)
  } satisfies (this: Receiver, date: Date, ...args: A) => R
}

export const optionalDateCallback: <A extends Array<unknown>, R, Receiver>(
  handler: (this: Receiver, date: Date | undefined, ...args: A) => R,
) => (this: Receiver, date: Date | undefined, ...args: A) => R = function optionalDateCallback<
  A extends Array<unknown>,
  R,
  Receiver,
>(handler: (this: Receiver, date: Date | undefined, ...args: A) => R) {
  return function callOptionalDateCallback(this: Receiver, date, ...args) {
    return handler.call(this, date === undefined ? undefined : callbackDate(date), ...args)
  } satisfies (this: Receiver, date: Date | undefined, ...args: A) => R
}

const invalidDate = () => constructFrom(DateTime.toDateUtc(DateTime.makeUnsafe(0)), Number.NaN)

export const instantDate: (value: number | string) => Date = (value: number | string) =>
  Option.match(DateTime.make(Predicate.isNumber(value) ? value : Date.parse(value)), {
    onNone: invalidDate,
    onSome: DateTime.toDateUtc,
  })

export const zonedDate: (value: number | Date, timeZone: string) => Date = (
  value: number | Date,
  timeZone: string,
) => (timeZone === 'UTC' ? new UTCDate(Number(value)) : new TZDate(Number(value), timeZone))

export const callbackDate: (date: Date) => Date = (date: Date) =>
  date instanceof UTCDateMini ? new TZDate(date.getTime(), 'UTC') : date
