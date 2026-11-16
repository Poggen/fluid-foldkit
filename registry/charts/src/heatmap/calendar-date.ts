import { DateTime } from 'effect'

/** Preserve the instant while returning the caller-owned Date shape used by chart accessors. */
export const copyCalendarDate = (date: Readonly<Date>): Date =>
  DateTime.toDateUtc(DateTime.makeUnsafe(date))

/** Source constructors use local calendar fields, including JavaScript's 0..99 year convention. */
export const localCalendarDate = (year: number, zeroBasedMonth: number, day: number): Date =>
  DateTime.toDateUtc(
    DateTime.makeZonedUnsafe(
      {
        year: year >= 0 && year <= 99 ? 1900 + year : year,
        month: zeroBasedMonth + 1,
        day,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      { timeZone: DateTime.zoneMakeLocal(), adjustForTimeZone: true },
    ),
  )
