/* @license Fluid 200b4534 + react-day-picker 10.0.2, MIT; see packet attribution. */
import { instantDate, zonedDate } from './date-boundary.js'
import type { Clock } from 'effect/Clock'
import { DateLib, defaultLocale } from './date-library.js'
import type { DateLibOptions } from './date-library.js'
import { resolveFormatters } from './formatters.js'
import type { CalendarFormatters } from './formatters.js'
import { labelDayButton, resolveLabels } from './labels.js'
import type { CalendarLabels, CalendarLocale } from './labels.js'
import { dateMatchModifiers } from './matchers.js'
import type { Matcher } from './matcher-types.js'
import type { ModifierOptions } from './modifiers.js'
import { createNoonOverrides } from './noon.js'
import { convertMatchersToTimeZone, toTimeZone } from './time-zone.js'

export const dayNumber: (date: Date) => number = function dayNumber(date: Date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
}

const matcherList: (matcher: Matcher | Array<Matcher> | undefined) => Array<Matcher> =
  function matcherList(matcher: Matcher | Array<Matcher> | undefined) {
    if (matcher === undefined) {
      return []
    }

    return Array.isArray(matcher) ? matcher : [matcher]
  }

export const resolveWeekNumbering: (
  show: boolean | undefined,
  starts: DateLibOptions['weekStartsOn'],
  iso: boolean | undefined,
) => boolean = function resolveWeekNumbering(
  show: boolean | undefined,
  starts: DateLibOptions['weekStartsOn'],
  iso: boolean | undefined,
) {
  if (iso !== undefined) {
    return iso
  }

  if (show !== true) {
    return false
  }

  return starts === undefined || starts === 1
}

const dateSettings: (input: CalendarRuleOptions) => DateLibOptions = function dateSettings(
  input: CalendarRuleOptions,
) {
  let settings: DateLibOptions = { locale: { ...defaultLocale, ...input.locale } }

  const weekStartsOn = input.broadcastCalendar === true ? 1 : input.weekStartsOn

  if (weekStartsOn !== undefined) {
    settings = { ...settings, weekStartsOn }
  }

  if (input.firstWeekContainsDate !== undefined) {
    settings = { ...settings, firstWeekContainsDate: input.firstWeekContainsDate }
  }

  if (input.useAdditionalWeekYearTokens !== undefined) {
    settings = { ...settings, useAdditionalWeekYearTokens: input.useAdditionalWeekYearTokens }
  }

  if (input.useAdditionalDayOfYearTokens !== undefined) {
    settings = { ...settings, useAdditionalDayOfYearTokens: input.useAdditionalDayOfYearTokens }
  }

  if (input.timeZone !== undefined) {
    settings = { ...settings, timeZone: input.timeZone }
  }

  if (input.numerals !== undefined) {
    settings = { ...settings, numerals: input.numerals }
  }

  return settings
}

const calendarModifierOptions: (input: CalendarRuleOptions, dateLib: DateLib) => ModifierOptions =
  function calendarModifierOptions(input: CalendarRuleOptions, dateLib: DateLib) {
    const matching = resolveDayMatchers(input)

    const zone = (date: Date) =>
      hasTimeZone(input.timeZone) ? toTimeZone(date, input.timeZone) : date

    const convert = (matcher: Matcher | Array<Matcher> | undefined) =>
      hasTimeZone(input.timeZone) ? convertMatchersToTimeZone(matcher, input.timeZone) : matcher

    const custom = { ...matching.modifiers, ...input.modifiers }

    const modifiers: Record<string, Matcher | Array<Matcher> | undefined> = {}

    for (const [name, matcher] of Object.entries(custom)) {
      modifiers[name] = convert(matcher)
    }

    const { month, defaultMonth, startMonth, endMonth, hidden, ...otherOptions } = input

    const convertedHidden = convert(hidden)

    let options: ModifierOptions = { ...otherOptions }

    if (month !== undefined) {
      options = { ...options, month: zone(month) }
    }

    if (defaultMonth !== undefined) {
      options = { ...options, defaultMonth: zone(defaultMonth) }
    }

    if (startMonth !== undefined) {
      options = { ...options, startMonth: zone(startMonth) }
    }

    if (endMonth !== undefined) {
      options = { ...options, endMonth: zone(endMonth) }
    }

    options = {
      ...options,
      today: input.today === undefined ? dateLib.today() : zone(input.today),
      ISOWeek: resolveWeekNumbering(input.showWeekNumber, input.weekStartsOn, input.ISOWeek),
      showOutsideDays: (input.numberOfMonths ?? 1) > 1 ? false : (input.showOutsideDays ?? true),
      disabled: convert(matching.disabled) ?? matching.disabled,
    }

    if (convertedHidden !== undefined) {
      options = { ...options, hidden: convertedHidden }
    }

    return { ...options, modifiers }
  }

export interface CalendarRuleOptions extends ModifierOptions {
  readonly booked?: Matcher | Array<Matcher>
  readonly available?: Matcher | Array<Matcher>
  readonly locale?: Partial<CalendarLocale>
  readonly timeZone?: string
  readonly noonSafe?: boolean
  readonly numerals?: DateLibOptions['numerals']
  readonly weekStartsOn?: DateLibOptions['weekStartsOn']
  readonly firstWeekContainsDate?: DateLibOptions['firstWeekContainsDate']
  readonly useAdditionalWeekYearTokens?: boolean
  readonly useAdditionalDayOfYearTokens?: boolean
  readonly dateLib?: Partial<DateLib>
  readonly labels?: Partial<CalendarLabels>
  readonly formatters?: Partial<CalendarFormatters>
  readonly showWeekNumber?: boolean
  readonly hideWeekdays?: boolean
  readonly hideNavigation?: boolean
  readonly lang?: string
  readonly reverseYears?: boolean
  readonly dir?: string
}

export const WEEK_COL_RATIO = 0.75

export function resolveDayMatchers({
  booked,
  available,
  disabled,
}: Pick<CalendarRuleOptions, 'booked' | 'available' | 'disabled'>) {
  const outside: Array<Matcher> =
    available === undefined ? [] : [(date: Date) => !dateMatchModifiers(date, available)]

  const unavailable = [...matcherList(disabled), ...outside]

  return {
    disabled: [...matcherList(booked), ...unavailable],
    modifiers: {
      booked: booked ?? false,
      unavailable: unavailable.length > 0 ? unavailable : false,
    },
  }
}

function hasTimeZone(timeZone: string | undefined): timeZone is string {
  return timeZone !== undefined && timeZone !== ''
}

function calendarDateLibrary(input: CalendarRuleOptions, clock: Clock) {
  const settings = dateSettings(input)

  const noon =
    input.noonSafe === true && hasTimeZone(input.timeZone)
      ? createNoonOverrides(input.timeZone, settings)
      : undefined

  return new DateLib(settings, input.dateLib, {
    ...noon,
    today: () => {
      const now = clock.currentTimeMillisUnsafe()

      const today = hasTimeZone(input.timeZone) ? zonedDate(now, input.timeZone) : instantDate(now)

      if (input.noonSafe === true && hasTimeZone(input.timeZone)) {
        today.setHours(12, 0, 0, 0)
      }

      return today
    },
  })
}

export function createCalendarRules(input: CalendarRuleOptions, clock: Clock) {
  const dateLib = calendarDateLibrary(input, clock)

  const options = calendarModifierOptions(input, dateLib)

  const resolvedLabels = resolveLabels(input.labels ?? {}, dateLib.options)

  const labels: CalendarLabels = {
    ...resolvedLabels,
    labelDayButton:
      input.labels?.labelDayButton === undefined
        ? (date, flags, labelOptions, lib) => {
            const text = labelDayButton(date, flags, labelOptions, lib)

            return flags.booked === true ? `${text}, booked` : text
          }
        : resolvedLabels.labelDayButton,
  }

  const formatters = resolveFormatters(input.formatters)

  return { dateLib, options, labels, formatters, input }
}

export type CalendarRules = ReturnType<typeof createCalendarRules>
