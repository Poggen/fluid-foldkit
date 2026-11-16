// Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors.
// Full license: NOTICE
import type { DateLib } from './date-library.js'

export function startOfBroadcastWeek(date: Date, dateLib: DateLib): Date {
  const first = dateLib.startOfMonth(date)

  const weekday = first.getDay()

  if (weekday === 1) {
    return first
  }

  return dateLib.addDays(first, weekday === 0 ? -6 : -(weekday - 1))
}

export function getBroadcastWeeksInMonth(month: Date, dateLib: DateLib): number {
  const first = dateLib.startOfMonth(month)

  const weekday = first.getDay() > 0 ? first.getDay() : 7

  const start = dateLib.addDays(month, -weekday + 1)

  const last = dateLib.addDays(start, 34)

  return dateLib.getMonth(month) === dateLib.getMonth(last) ? 5 : 4
}

export function endOfBroadcastWeek(date: Date, dateLib: DateLib): Date {
  return dateLib.addDays(
    startOfBroadcastWeek(date, dateLib),
    getBroadcastWeeksInMonth(date, dateLib) * 7 - 1,
  )
}
