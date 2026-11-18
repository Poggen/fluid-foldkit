import { weekStart, weekEnd, monthWeekEnd } from './week-bounds.js'
/* @license Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
/* @license Full license: NOTICE */
import type { DateLib } from './date-library.js'
import type { NavigationOptions } from './navigation.js'

export const calendarDay: (date: Date, displayMonth: Date, dateLib: DateLib) => CalendarDay =
  function calendarDay(date: Date, displayMonth: Date, dateLib: DateLib) {
    return {
      date,
      displayMonth,
      outside: !dateLib.isSameMonth(date, displayMonth),
      isoDate: dateLib.format(date, 'yyyy-MM-dd'),
      displayMonthId: dateLib.format(displayMonth, 'yyyy-MM'),
      dateMonthId: dateLib.format(date, 'yyyy-MM'),
    }
  }

export const sameCalendarDay: (left: CalendarDay, right: CalendarDay, dateLib: DateLib) => boolean =
  function sameCalendarDay(left: CalendarDay, right: CalendarDay, dateLib: DateLib) {
    return (
      dateLib.isSameDay(left.date, right.date) &&
      dateLib.isSameMonth(left.displayMonth, right.displayMonth)
    )
  }

export const getDates: (
  displayMonths: [Date, ...Array<Date>],
  maxDate: Date | undefined,
  props: NavigationOptions,
  dateLib: DateLib,
) => Array<Date> = function getDates(
  displayMonths: [Date, ...Array<Date>],
  maxDate: Date | undefined,
  props: NavigationOptions,
  dateLib: DateLib,
) {
  const [firstMonth] = displayMonths

  const lastMonth = displayMonths.at(-1) ?? firstMonth

  const { ISOWeek, fixedWeeks, broadcastCalendar } = props

  const weekOptions = { ISOWeek: ISOWeek ?? false, broadcastCalendar: broadcastCalendar ?? false }

  const startWeekFirstDate = weekStart(firstMonth, weekOptions, dateLib)

  const displayMonthsWeekEnd = monthWeekEnd(lastMonth, weekOptions, dateLib)

  const constraintWeekEnd =
    maxDate === undefined ? undefined : weekEnd(maxDate, weekOptions, dateLib)

  const gridEndDate =
    constraintWeekEnd !== undefined && dateLib.isAfter(displayMonthsWeekEnd, constraintWeekEnd)
      ? constraintWeekEnd
      : displayMonthsWeekEnd

  const numberOfDays = dateLib.differenceInCalendarDays(gridEndDate, startWeekFirstDate)

  const numberOfMonths = dateLib.differenceInCalendarMonths(lastMonth, firstMonth) + 1

  const dates: Array<Date> = []

  for (let index = 0; index <= numberOfDays; index += 1) {
    dates.push(dateLib.addDays(startWeekFirstDate, index))
  }

  const fixedDays = (broadcastCalendar === true ? 35 : 42) * numberOfMonths

  if (fixedWeeks === true && dates.length < fixedDays) {
    const daysToAdd = fixedDays - dates.length

    for (let index = 0; index < daysToAdd; index += 1) {
      dates.push(dateLib.addDays(dates.at(-1) ?? startWeekFirstDate, 1))
    }
  }

  return dates
}

export const getMonths: (
  displayMonths: Array<Date>,
  dates: Array<Date>,
  props: NavigationOptions,
  dateLib: DateLib,
) => Array<CalendarMonth> = function getMonths(
  displayMonths: Array<Date>,
  dates: Array<Date>,
  props: NavigationOptions,
  dateLib: DateLib,
) {
  const months: Array<CalendarMonth> = []

  for (const month of displayMonths) {
    const firstDate = weekStart(month, props, dateLib)

    const lastDate = monthWeekEnd(month, props, dateLib)

    const monthDates = dates.filter((date) => date >= firstDate && date <= lastDate)

    const fixedDays = props.broadcastCalendar === true ? 35 : 42

    if (props.fixedWeeks === true && monthDates.length < fixedDays) {
      const daysToAdd = fixedDays - monthDates.length

      const extraDates = dates.filter(
        (date) => date > lastDate && date <= dateLib.addDays(lastDate, daysToAdd),
      )
      monthDates.push(...extraDates)
    }

    const weeks: Array<CalendarWeek> = []

    for (const date of monthDates) {
      const weekNumber = props.ISOWeek === true ? dateLib.getISOWeek(date) : dateLib.getWeek(date)

      const existingWeek = weeks.find((entry) => entry.weekNumber === weekNumber)

      const day = calendarDay(date, month, dateLib)

      if (existingWeek !== undefined) {
        existingWeek.days.push(day)
      } else {
        weeks.push({ weekNumber, days: [day] })
      }
    }

    months.push({ date: month, weeks })
  }

  return props.reverseMonths === true ? months.toReversed() : months
}

export const getWeekdays: (
  dateLib: DateLib,
  ISOWeek: boolean | undefined,
  broadcastCalendar: boolean | undefined,
  today: Date | undefined,
) => Array<Date> = function getWeekdays(
  dateLib: DateLib,
  ISOWeek: boolean | undefined,
  broadcastCalendar: boolean | undefined,
  today: Date | undefined,
) {
  const referenceToday = today ?? dateLib.today()

  const start = weekStart(
    referenceToday,
    { ISOWeek: ISOWeek ?? false, broadcastCalendar: broadcastCalendar ?? false },
    dateLib,
  )

  const days: Array<Date> = []

  for (let index = 0; index < 7; index += 1) {
    days.push(dateLib.addDays(start, index))
  }

  return days
}

export interface CalendarDay {
  readonly date: Date
  readonly displayMonth: Date
  readonly outside: boolean
  readonly isoDate: string
  readonly displayMonthId: string
  readonly dateMonthId: string
}

export interface CalendarWeek {
  readonly weekNumber: number
  readonly days: Array<CalendarDay>
}

export interface CalendarMonth {
  readonly date: Date
  readonly weeks: Array<CalendarWeek>
}
