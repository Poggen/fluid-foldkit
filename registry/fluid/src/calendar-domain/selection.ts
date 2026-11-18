/* @license Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
/* @license Full license: NOTICE */
import type { DateRange, Matcher } from './matcher-types.js'
import { rangeContainsModifiers } from './matchers.js'
import { defaultDateLib } from './date-library.js'

export const addToRange: (
  date: Date,
  initialRange: DateRange | undefined,
  min?: number,
  max?: number,
  required?: boolean,
  dateLib?: typeof defaultDateLib,
) => DateRange | undefined = function (
  date: Date,
  initialRange: DateRange | undefined,
  min = 0,
  max = 0,
  required = false,
  dateLib = defaultDateLib,
) {
  const range = pickedRange(date, initialRange, min, required, dateLib)

  if (range?.from !== undefined && range.to !== undefined) {
    const difference = dateLib.differenceInCalendarDays(range.to, range.from)

    if ((max > 0 && difference > max) || (min > 1 && difference < min)) {
      return { from: date, to: undefined } satisfies DateRange | undefined
    }
  }

  return range satisfies DateRange | undefined
}

export const selectRange: (
  date: Date,
  selected: DateRange | undefined,
  rules: RangeSelectionRules,
  dateLib?: typeof defaultDateLib,
) => DateRange | undefined = function (
  date: Date,
  selected: DateRange | undefined,
  rules: RangeSelectionRules,
  dateLib = defaultDateLib,
) {
  const full = selected?.from !== undefined && selected.to !== undefined

  const same =
    selected?.from !== undefined &&
    selected.to !== undefined &&
    dateLib.isSameDay(selected.from, selected.to) &&
    dateLib.isSameDay(date, selected.from)

  let next: DateRange | undefined

  if (full || selected?.from === undefined) {
    next = rules.required !== true && same ? undefined : { from: date, to: undefined }
  } else {
    next = addToRange(date, selected, rules.min, rules.max, rules.required, dateLib)
  }

  if (
    rules.disabled !== undefined &&
    rules.disabled !== false &&
    next?.from !== undefined &&
    next.to !== undefined &&
    rangeContainsModifiers({ from: next.from, to: next.to }, rules.disabled, dateLib)
  ) {
    return { from: date, to: undefined } satisfies DateRange | undefined
  }

  return next satisfies DateRange | undefined
}

const completeRangePick: (
  date: Date,
  from: Date,
  to: Date,
  min: number,
  required: boolean,
  dateLib: typeof defaultDateLib,
) => DateRange | undefined = function completeRangePick(
  date: Date,
  from: Date,
  to: Date,
  min: number,
  required: boolean,
  dateLib: typeof defaultDateLib,
) {
  if (dateLib.isSameDay(from, date) && dateLib.isSameDay(to, date)) {
    return required ? { from, to } : undefined
  }

  if (dateLib.isSameDay(from, date)) {
    return { from, to: min > 0 ? undefined : date }
  }

  if (dateLib.isSameDay(to, date)) {
    return { from: date, to: min > 0 ? undefined : date }
  }

  if (dateLib.isBefore(date, from)) {
    return { from: date, to }
  }

  if (dateLib.isAfter(date, from) || dateLib.isAfter(date, to)) {
    return { from, to: date }
  }

  throw new Error('Invalid range')
}

const incompleteRangePick: (
  date: Date,
  from: Date,
  min: number,
  required: boolean,
  dateLib: typeof defaultDateLib,
) => DateRange | undefined = function incompleteRangePick(
  date: Date,
  from: Date,
  min: number,
  required: boolean,
  dateLib: typeof defaultDateLib,
) {
  if (dateLib.isSameDay(from, date)) {
    if (min === 0) {
      return { from, to: date }
    }

    return required ? { from, to: undefined } : undefined
  }

  return dateLib.isBefore(date, from) ? { from: date, to: from } : { from, to: date }
}

const pickedRange: (
  date: Date,
  initialRange: DateRange | undefined,
  min: number,
  required: boolean,
  dateLib: typeof defaultDateLib,
) => DateRange | undefined = function pickedRange(
  date: Date,
  initialRange: DateRange | undefined,
  min: number,
  required: boolean,
  dateLib: typeof defaultDateLib,
) {
  const { from, to } = initialRange ?? {}

  if (from === undefined && to === undefined) {
    return { from: date, to: min > 0 ? undefined : date }
  }

  if (from !== undefined) {
    return to === undefined
      ? incompleteRangePick(date, from, min, required, dateLib)
      : completeRangePick(date, from, to, min, required, dateLib)
  }

  return undefined
}

export interface RangeSelectionRules {
  readonly required?: boolean
  readonly min?: number
  readonly max?: number
  readonly disabled?: Matcher | Array<Matcher>
}
