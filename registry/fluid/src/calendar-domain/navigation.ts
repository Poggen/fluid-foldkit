import { weekStart, weekEnd } from './week-bounds.js'
/* @license Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
/* @license Full license: NOTICE */
import type { DateLib } from './date-library.js'
import type { Matcher } from './matcher-types.js'
import { dateMatchModifiers } from './matchers.js'

export const getNavMonths: (
  props: NavigationOptions,
  dateLib: DateLib,
) => [Date | undefined, Date | undefined] = function getNavMonths(
  props: NavigationOptions,
  dateLib: DateLib,
) {
  let { startMonth, endMonth } = props

  const { startOfYear, startOfDay, startOfMonth, endOfMonth, addYears, endOfYear, today } = dateLib

  const hasYearDropdown =
    props.captionLayout === 'dropdown' || props.captionLayout === 'dropdown-years'

  if (startMonth !== undefined) {
    startMonth = startOfMonth(startMonth)
  } else if (hasYearDropdown) {
    startMonth = startOfYear(addYears(props.today ?? today(), -100))
  }

  if (endMonth !== undefined) {
    endMonth = endOfMonth(endMonth)
  } else if (hasYearDropdown) {
    endMonth = endOfYear(props.today ?? today())
  }

  return [
    startMonth !== undefined ? startOfDay(startMonth) : startMonth,
    endMonth !== undefined ? startOfDay(endMonth) : endMonth,
  ]
}

export const getInitialMonth: (
  props: NavigationOptions,
  navStart: Date | undefined,
  navEnd: Date | undefined,
  dateLib: DateLib,
) => Date = function getInitialMonth(
  props: NavigationOptions,
  navStart: Date | undefined,
  navEnd: Date | undefined,
  dateLib: DateLib,
) {
  const { month, defaultMonth, today = dateLib.today(), numberOfMonths = 1 } = props

  let initialMonth = month ?? defaultMonth ?? today

  const { differenceInCalendarMonths, addMonths, startOfMonth } = dateLib

  if (
    navEnd !== undefined &&
    differenceInCalendarMonths(navEnd, initialMonth) < numberOfMonths - 1
  ) {
    const offset = -1 * (numberOfMonths - 1)
    initialMonth = addMonths(navEnd, offset)
  }

  if (navStart !== undefined && differenceInCalendarMonths(initialMonth, navStart) < 0) {
    initialMonth = navStart
  }

  return startOfMonth(initialMonth)
}

export const getDisplayMonths: (
  firstDisplayedMonth: Date,
  calendarEndMonth: Date | undefined,
  props: NavigationOptions,
  dateLib: DateLib,
) => Array<Date> = function getDisplayMonths(
  firstDisplayedMonth: Date,
  calendarEndMonth: Date | undefined,
  props: NavigationOptions,
  dateLib: DateLib,
) {
  const { numberOfMonths = 1 } = props

  const months = []

  for (let i = 0; i < numberOfMonths; i += 1) {
    const month = dateLib.addMonths(firstDisplayedMonth, i)

    if (calendarEndMonth !== undefined && month > calendarEndMonth) {
      break
    }

    months.push(month)
  }

  return months
}

export const getNextMonth: (
  firstDisplayedMonth: Date,
  calendarEndMonth: Date | undefined,
  options: NavigationOptions,
  dateLib: DateLib,
) => Date | undefined = function getNextMonth(
  firstDisplayedMonth: Date,
  calendarEndMonth: Date | undefined,
  options: NavigationOptions,
  dateLib: DateLib,
) {
  if (options.disableNavigation === true) {
    return undefined
  }

  const { pagedNavigation, numberOfMonths = 1 } = options

  const { startOfMonth, addMonths, differenceInCalendarMonths } = dateLib

  const offset = pagedNavigation === true ? numberOfMonths : 1

  const month = startOfMonth(firstDisplayedMonth)

  if (calendarEndMonth === undefined) {
    return addMonths(month, offset)
  }

  const monthsDiff = differenceInCalendarMonths(calendarEndMonth, firstDisplayedMonth)

  if (monthsDiff < numberOfMonths) {
    return undefined
  }

  return addMonths(month, offset)
}

export const getPreviousMonth: (
  firstDisplayedMonth: Date,
  calendarStartMonth: Date | undefined,
  options: NavigationOptions,
  dateLib: DateLib,
) => Date | undefined = function getPreviousMonth(
  firstDisplayedMonth: Date,
  calendarStartMonth: Date | undefined,
  options: NavigationOptions,
  dateLib: DateLib,
) {
  if (options.disableNavigation === true) {
    return undefined
  }

  const { pagedNavigation, numberOfMonths } = options

  const { startOfMonth, addMonths, differenceInCalendarMonths } = dateLib

  const offset = pagedNavigation === true ? (numberOfMonths ?? 1) : 1

  const month = startOfMonth(firstDisplayedMonth)

  if (calendarStartMonth === undefined) {
    return addMonths(month, -offset)
  }

  const monthsDiff = differenceInCalendarMonths(month, calendarStartMonth)

  if (monthsDiff <= 0) {
    return undefined
  }

  return addMonths(month, -offset)
}

export const getFocusableDate: (
  moveBy: FocusUnit,
  moveDir: FocusDirection,
  refDate: Date,
  navStart: Date | undefined,
  navEnd: Date | undefined,
  props: NavigationOptions,
  dateLib: DateLib,
) => Date = function getFocusableDate(
  moveBy: FocusUnit,
  moveDir: FocusDirection,
  refDate: Date,
  navStart: Date | undefined,
  navEnd: Date | undefined,
  props: NavigationOptions,
  dateLib: DateLib,
) {
  const { ISOWeek, broadcastCalendar } = props

  const weekOptions = { ISOWeek: ISOWeek ?? false, broadcastCalendar: broadcastCalendar ?? false }

  const moveFns = {
    day: dateLib.addDays,
    week: dateLib.addWeeks,
    month: dateLib.addMonths,
    year: dateLib.addYears,
    startOfWeek: (date: Date) => weekStart(date, weekOptions, dateLib),
    endOfWeek: (date: Date) => weekEnd(date, weekOptions, dateLib),
  }

  let focusableDate = moveFns[moveBy](refDate, moveDir === 'after' ? 1 : -1)

  if (moveDir === 'before' && navStart !== undefined) {
    focusableDate = dateLib.max([navStart, focusableDate])
  } else if (moveDir === 'after' && navEnd !== undefined) {
    focusableDate = dateLib.min([navEnd, focusableDate])
  }

  return focusableDate
}

export const nextFocus: (
  moveBy: FocusUnit,
  moveDir: FocusDirection,
  from: Date,
  navStart: Date | undefined,
  navEnd: Date | undefined,
  options: NavigationOptions,
  dateLib: DateLib,
) => Date | undefined = function nextFocus(
  moveBy: FocusUnit,
  moveDir: FocusDirection,
  from: Date,
  navStart: Date | undefined,
  navEnd: Date | undefined,
  options: NavigationOptions,
  dateLib: DateLib,
) {
  let current = from

  for (let attempt = 0; attempt <= 365; attempt += 1) {
    const next = getFocusableDate(moveBy, moveDir, current, navStart, navEnd, options, dateLib)

    const disabled =
      options.disabled !== undefined &&
      options.disabled !== false &&
      dateMatchModifiers(next, options.disabled, dateLib)

    const hidden =
      options.hidden !== undefined &&
      options.hidden !== false &&
      dateMatchModifiers(next, options.hidden, dateLib)

    if (!disabled && !hidden) {
      return next
    }

    current = next
  }

  return undefined
}

export interface NavigationOptions {
  readonly month?: Date
  readonly defaultMonth?: Date
  readonly today?: Date
  readonly startMonth?: Date
  readonly endMonth?: Date
  readonly numberOfMonths?: 1 | 2
  readonly captionLayout?: 'label' | 'dropdown' | 'dropdown-months' | 'dropdown-years'
  readonly pagedNavigation?: boolean
  readonly disableNavigation?: boolean
  readonly ISOWeek?: boolean
  readonly broadcastCalendar?: boolean
  readonly fixedWeeks?: boolean
  readonly reverseMonths?: boolean
  readonly disabled?: Matcher | Array<Matcher>
  readonly hidden?: Matcher | Array<Matcher>
}

export type FocusUnit = 'day' | 'week' | 'month' | 'year' | 'startOfWeek' | 'endOfWeek'

export type FocusDirection = 'before' | 'after'
