import { Predicate } from 'effect'
import { dateCallback, optionalDateCallback } from './date-boundary.js'
// Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors.
// Full license: NOTICE
import { DateLib } from './date-library.js'
import type { DateLibOptions } from './date-library.js'
import type { Modifiers } from './modifiers.js'
import type { Locale } from 'date-fns/locale'

export function labelDayButton(
  date: Date,
  modifiers: Modifiers,
  options?: DateLibOptions,
  dateLib?: DateLib,
): string {
  let label = (dateLib ?? new DateLib(options)).format(date, 'PPPP')

  if (modifiers.today === true) {
    label = `Today, ${label}`
  }

  if (modifiers.selected === true) {
    label = `${label}, selected`
  }

  return label
}

export function labelGrid(date: Date, options?: DateLibOptions, dateLib?: DateLib): string {
  const lib = dateLib ?? new DateLib(options)

  return lib.formatMonthYear(date)
}

export function labelGridcell(
  date: Date,
  modifiers?: Modifiers,
  options?: DateLibOptions,
  dateLib?: DateLib,
): string {
  let label = (dateLib ?? new DateLib(options)).format(date, 'PPPP')

  if (modifiers?.today === true) {
    label = `Today, ${label}`
  }

  return label
}

export function labelMonthDropdown(_options?: DateLibOptions): string {
  return 'Choose the Month'
}

export function labelNav(): string {
  return ''
}

const defaultLabel = 'Go to the Next Month'

export function labelNext(_month: Date | undefined, _options?: DateLibOptions): string {
  return defaultLabel
}

export function labelPrevious(_month: Date | undefined): string {
  return 'Go to the Previous Month'
}

export function labelWeekNumber(weekNumber: number, _options?: DateLibOptions): string {
  return `Week ${weekNumber}`
}

export function labelWeekNumberHeader(_options?: DateLibOptions): string {
  return 'Week Number'
}

export function labelWeekday(date: Date, options?: DateLibOptions, dateLib?: DateLib): string {
  return (dateLib ?? new DateLib(options)).format(date, 'cccc')
}

export function labelYearDropdown(_options?: DateLibOptions): string {
  return 'Choose the Year'
}

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

function resolveLabel<A extends ReadonlyArray<unknown>>(
  fallback: (...args: A) => string,
  custom: ((...args: A) => string) | undefined,
  localized: string | ((...args: A) => string) | undefined,
): (...args: A) => string {
  if (custom !== undefined) {
    return custom
  }

  if (localized !== undefined && localized !== '') {
    return Predicate.isString(localized) ? () => localized : localized
  }

  return fallback
}

function resolveDateLabel<A extends Array<unknown>>(
  fallback: (date: Date, ...args: A) => string,
  custom: ((date: Date, ...args: A) => string) | undefined,
  localized: string | ((date: Date, ...args: A) => string) | undefined,
): (date: Date, ...args: A) => string {
  return resolveLabel(
    fallback,
    custom === undefined ? undefined : dateCallback(custom),
    Predicate.isFunction(localized) ? dateCallback(localized) : localized,
  )
}

function resolveOptionalDateLabel<A extends Array<unknown>>(
  fallback: (date: Date | undefined, ...args: A) => string,
  custom: ((date: Date | undefined, ...args: A) => string) | undefined,
  localized: string | ((date: Date | undefined, ...args: A) => string) | undefined,
): (date: Date | undefined, ...args: A) => string {
  return resolveLabel(
    fallback,
    custom === undefined ? undefined : optionalDateCallback(custom),
    Predicate.isFunction(localized) ? optionalDateCallback(localized) : localized,
  )
}

export function resolveLabels(
  custom: Partial<CalendarLabels>,
  options: DateLibOptions,
): CalendarLabels {
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
