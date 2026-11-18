/* @license Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
/* @license Full license: NOTICE */
import type { DateLib } from './date-library.js'

export const startOfBroadcastWeek: (date: Date, dateLib: DateLib) => Date =
  function startOfBroadcastWeek(date: Date, dateLib: DateLib) {
    const first = dateLib.startOfMonth(date)

    const weekday = first.getDay()

    if (weekday === 1) {
      return first
    }

    return dateLib.addDays(first, weekday === 0 ? -6 : -(weekday - 1))
  }

export const getBroadcastWeeksInMonth: (month: Date, dateLib: DateLib) => number =
  function getBroadcastWeeksInMonth(month: Date, dateLib: DateLib) {
    const first = dateLib.startOfMonth(month)

    const weekday = first.getDay() > 0 ? first.getDay() : 7

    const start = dateLib.addDays(month, -weekday + 1)

    const last = dateLib.addDays(start, 34)

    return dateLib.getMonth(month) === dateLib.getMonth(last) ? 5 : 4
  }

export const endOfBroadcastWeek: (date: Date, dateLib: DateLib) => Date =
  function endOfBroadcastWeek(date: Date, dateLib: DateLib) {
    return dateLib.addDays(
      startOfBroadcastWeek(date, dateLib),
      getBroadcastWeeksInMonth(date, dateLib) * 7 - 1,
    )
  }
