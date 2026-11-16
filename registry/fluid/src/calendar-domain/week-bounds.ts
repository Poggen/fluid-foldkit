// Adapted from react-day-picker 10.0.2, MIT; see NOTICE
import type { DateLib } from './date-library.js'
import type { NavigationOptions } from './navigation.js'

export function weekStart(date: Date, options: NavigationOptions, dateLib: DateLib): Date {
  if (options.broadcastCalendar === true) {
    return dateLib.startOfBroadcastWeek(date, dateLib)
  }

  return options.ISOWeek === true ? dateLib.startOfISOWeek(date) : dateLib.startOfWeek(date)
}

export function weekEnd(date: Date, options: NavigationOptions, dateLib: DateLib): Date {
  if (options.broadcastCalendar === true) {
    return dateLib.endOfBroadcastWeek(date)
  }

  return options.ISOWeek === true ? dateLib.endOfISOWeek(date) : dateLib.endOfWeek(date)
}

export function monthWeekEnd(date: Date, options: NavigationOptions, dateLib: DateLib): Date {
  if (options.broadcastCalendar === true) {
    return dateLib.endOfBroadcastWeek(date)
  }

  return options.ISOWeek === true
    ? dateLib.endOfISOWeek(dateLib.endOfMonth(date))
    : dateLib.endOfWeek(dateLib.endOfMonth(date))
}
