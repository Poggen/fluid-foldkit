import { Predicate } from 'effect'
import { dateCallback, optionalDateCallback } from './date-boundary.js'
/* @license Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors. */
/* @license Full license: NOTICE */
import { DateLib } from './date-library.js'
import type { DateLibOptions } from './date-library.js'
import type { Modifiers } from './modifiers.js'
import type { Locale } from 'date-fns/locale'

const resolveLabel: <A extends ReadonlyArray<unknown>>(
  fallback: (...args: A) => string,
  custom: ((...args: A) => string) | undefined,
  localized: string | ((...args: A) => string) | undefined,
) => (...args: A) => string = function resolveLabel<A extends ReadonlyArray<unknown>>(
  fallback: (...args: A) => string,
  custom: ((...args: A) => string) | undefined,
  localized: string | ((...args: A) => string) | undefined,
) {
  if (custom !== undefined) {
    return custom satisfies (...args: A) => string
  }

  if (localized !== undefined && localized !== '') {
    return (Predicate.isString(localized) ? () => localized : localized) satisfies (
      ...args: A
    ) => string
  }

  return fallback satisfies (...args: A) => string
}

const resolveDateLabel: <A extends Array<unknown>>(
  fallback: (date: Date, ...args: A) => string,
  custom: ((date: Date, ...args: A) => string) | undefined,
  localized: string | ((date: Date, ...args: A) => string) | undefined,
) => (date: Date, ...args: A) => string = function resolveDateLabel<A extends Array<unknown>>(
  fallback: (date: Date, ...args: A) => string,
  custom: ((date: Date, ...args: A) => string) | undefined,
  localized: string | ((date: Date, ...args: A) => string) | undefined,
) {
  return resolveLabel(
    fallback,
    custom === undefined ? undefined : dateCallback(custom),
    Predicate.isFunction(localized) ? dateCallback(localized) : localized,
  ) satisfies (date: Date, ...args: A) => string
}

const resolveOptionalDateLabel: <A extends Array<unknown>>(
  fallback: (date: Date | undefined, ...args: A) => string,
  custom: ((date: Date | undefined, ...args: A) => string) | undefined,
  localized: string | ((date: Date | undefined, ...args: A) => string) | undefined,
) => (date: Date | undefined, ...args: A) => string = function resolveOptionalDateLabel<
  A extends Array<unknown>,
>(
  fallback: (date: Date | undefined, ...args: A) => string,
  custom: ((date: Date | undefined, ...args: A) => string) | undefined,
  localized: string | ((date: Date | undefined, ...args: A) => string) | undefined,
) {
  return resolveLabel(
    fallback,
    custom === undefined ? undefined : optionalDateCallback(custom),
    Predicate.isFunction(localized) ? optionalDateCallback(localized) : localized,
  ) satisfies (date: Date | undefined, ...args: A) => string
}

export const labelDayButton: (
  date: Date,
  modifiers: Modifiers,
  options?: DateLibOptions,
  dateLib?: DateLib,
) => string = function labelDayButton(
  date: Date,
  modifiers: Modifiers,
  options?: DateLibOptions,
  dateLib?: DateLib,
) {
  let label = (dateLib ?? new DateLib(options)).format(date, 'PPPP')

  if (modifiers.today === true) {
    label = `Today, ${label}`
  }

  if (modifiers.selected === true) {
    label = `${label}, selected`
  }

  return label
}

export const labelGrid: (date: Date, options?: DateLibOptions, dateLib?: DateLib) => string =
  function labelGrid(date: Date, options?: DateLibOptions, dateLib?: DateLib) {
    const lib = dateLib ?? new DateLib(options)

    return lib.formatMonthYear(date)
  }

export const labelGridcell: (
  date: Date,
  modifiers?: Modifiers,
  options?: DateLibOptions,
  dateLib?: DateLib,
) => string = function labelGridcell(
  date: Date,
  modifiers?: Modifiers,
  options?: DateLibOptions,
  dateLib?: DateLib,
) {
  let label = (dateLib ?? new DateLib(options)).format(date, 'PPPP')

  if (modifiers?.today === true) {
    label = `Today, ${label}`
  }

  return label
}

export const labelMonthDropdown: (_options?: DateLibOptions) => string =
  function labelMonthDropdown(_options?: DateLibOptions) {
    return 'Choose the Month'
  }

export const labelNav: () => string = function labelNav() {
  return ''
}

export const labelNext: (_month: Date | undefined, _options?: DateLibOptions) => string =
  function labelNext(_month: Date | undefined, _options?: DateLibOptions) {
    return defaultLabel
  }

export const labelPrevious: (_month: Date | undefined) => string = function labelPrevious(
  _month: Date | undefined,
) {
  return 'Go to the Previous Month'
}

export const labelWeekNumber: (weekNumber: number, _options?: DateLibOptions) => string =
  function labelWeekNumber(weekNumber: number, _options?: DateLibOptions) {
    return `Week ${weekNumber}`
  }

export const labelWeekNumberHeader: (_options?: DateLibOptions) => string =
  function labelWeekNumberHeader(_options?: DateLibOptions) {
    return 'Week Number'
  }

export const labelWeekday: (date: Date, options?: DateLibOptions, dateLib?: DateLib) => string =
  function labelWeekday(date: Date, options?: DateLibOptions, dateLib?: DateLib) {
    return (dateLib ?? new DateLib(options)).format(date, 'cccc')
  }

export const labelYearDropdown: (_options?: DateLibOptions) => string = function labelYearDropdown(
  _options?: DateLibOptions,
) {
  return 'Choose the Year'
}

export const resolveLabels: (
  custom: Partial<CalendarLabels>,
  options: DateLibOptions,
) => CalendarLabels = function resolveLabels(
  custom: Partial<CalendarLabels>,
  options: DateLibOptions,
) {
  const locale = options.locale?.labels ?? {}

  return {
    labelDayButton: resolveDateLabel(labelDayButton, custom.labelDayButton, locale.labelDayButton),
    labelGrid: resolveDateLabel(labelGrid, custom.labelGrid, locale.labelGrid),
    labelGridcell: resolveDateLabel(labelGridcell, custom.labelGridcell, locale.labelGridcell),
    labelMonthDropdown: resolveLabel(
      labelMonthDropdown,
      custom.labelMonthDropdown,
      locale.labelMonthDropdown,
    ),
    labelNav: resolveLabel(labelNav, custom.labelNav, locale.labelNav),
    labelNext: resolveOptionalDateLabel(labelNext, custom.labelNext, locale.labelNext),
    labelPrevious: resolveOptionalDateLabel(
      labelPrevious,
      custom.labelPrevious,
      locale.labelPrevious,
    ),
    labelWeekNumber: resolveLabel(labelWeekNumber, custom.labelWeekNumber, locale.labelWeekNumber),
    labelWeekNumberHeader: resolveLabel(
      labelWeekNumberHeader,
      custom.labelWeekNumberHeader,
      locale.labelWeekNumberHeader,
    ),
    labelWeekday: resolveDateLabel(labelWeekday, custom.labelWeekday, locale.labelWeekday),
    labelYearDropdown: resolveLabel(
      labelYearDropdown,
      custom.labelYearDropdown,
      locale.labelYearDropdown,
    ),
  }
}

const defaultLabel = 'Go to the Next Month'

export interface CalendarLabels {
  readonly labelDayButton: typeof labelDayButton
  readonly labelGrid: typeof labelGrid
  readonly labelGridcell: typeof labelGridcell
  readonly labelMonthDropdown: typeof labelMonthDropdown
  readonly labelNav: typeof labelNav
  readonly labelNext: typeof labelNext
  readonly labelPrevious: typeof labelPrevious
  readonly labelWeekNumber: typeof labelWeekNumber
  readonly labelWeekNumberHeader: typeof labelWeekNumberHeader
  readonly labelWeekday: typeof labelWeekday
  readonly labelYearDropdown: typeof labelYearDropdown
}

export const defaultCalendarLabels = {
  labelDayButton,
  labelGrid,
  labelGridcell,
  labelMonthDropdown,
  labelNav,
  labelNext,
  labelPrevious,
  labelWeekNumber,
  labelWeekNumberHeader,
  labelWeekday,
  labelYearDropdown,
}

export interface CalendarLocale extends Locale {
  readonly labels?: { readonly [K in keyof CalendarLabels]?: string | CalendarLabels[K] }
}
