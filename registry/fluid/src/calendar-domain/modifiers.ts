// Adapted from react-day-picker 10.0.2, MIT © 2014-2026 Giampaolo Bellavite and contributors.
// Full license: NOTICE
import type { DateLib } from './date-library.js'
import type { CalendarDay } from './grid.js'
import { sameCalendarDay } from './grid.js'
import { dateMatchModifiers } from './matchers.js'
import type { Matcher } from './matcher-types.js'
import type { NavigationOptions } from './navigation.js'

export type Modifiers = Record<string, boolean>

export interface ModifierOptions extends NavigationOptions {
  readonly modifiers?: Record<string, Matcher | Array<Matcher> | undefined>
  readonly showOutsideDays?: boolean
}

function hasMatcher(
  matcher: Matcher | Array<Matcher> | undefined,
): matcher is Matcher | Array<Matcher> {
  return matcher !== undefined && matcher !== false
}

function internalModifiers(
  day: CalendarDay,
  options: ModifierOptions,
  today: Date,
  start: Date | undefined,
  end: Date | undefined,
  dateLib: DateLib,
): Modifiers {
  const outside = !dateLib.isSameMonth(day.date, day.displayMonth)

  return {
    focused: false,
    outside,
    disabled:
      hasMatcher(options.disabled) && dateMatchModifiers(day.date, options.disabled, dateLib),
    hidden:
      (hasMatcher(options.hidden) && dateMatchModifiers(day.date, options.hidden, dateLib)) ||
      (start !== undefined && dateLib.isBefore(day.date, start)) ||
      (end !== undefined && dateLib.isAfter(day.date, end)) ||
      (options.broadcastCalendar !== true && options.showOutsideDays !== true && outside) ||
      (options.broadcastCalendar === true && options.showOutsideDays === false && outside),
    today: dateLib.isSameDay(day.date, today),
  }
}

export function createModifiers(
  days: Array<CalendarDay>,
  options: ModifierOptions,
  navStart: Date | undefined,
  navEnd: Date | undefined,
  dateLib: DateLib,
): Map<CalendarDay, Modifiers> {
  const today = options.today ?? dateLib.today()

  const start = navStart === undefined ? undefined : dateLib.startOfMonth(navStart)

  const end = navEnd === undefined ? undefined : dateLib.endOfMonth(navEnd)

  const internal = new Map<CalendarDay, Modifiers>()

  const custom = new Map<string, Set<CalendarDay>>()

  for (const day of days) {
    internal.set(day, internalModifiers(day, options, today, start, end, dateLib))

    for (const [name, matcher] of Object.entries(options.modifiers ?? {})) {
      if (
        matcher === undefined ||
        matcher === false ||
        !dateMatchModifiers(day.date, matcher, dateLib)
      ) {
        continue
      }

      const matching = custom.get(name) ?? new Set<CalendarDay>()
      matching.add(day)
      custom.set(name, matching)
    }
  }

  // Custom keys exist only after matching a displayed day; false values then override built-ins.
  for (const [day, flags] of internal) {
    for (const [name, matching] of custom) {
      flags[name] = matching.has(day)
    }
  }

  return internal
}

function focusPriority(
  day: CalendarDay,
  flags: Modifiers,
  lastFocused: CalendarDay | undefined,
  isSelected: (date: Date) => boolean,
  dateLib: DateLib,
): number {
  if (flags.focused === true) {
    return 3
  }

  if (lastFocused !== undefined && sameCalendarDay(lastFocused, day, dateLib)) {
    return 2
  }

  if (isSelected(day.date)) {
    return 1
  }

  return flags.today === true ? 0 : -1
}

export function focusTarget(
  days: Array<CalendarDay>,
  modifiers: Map<CalendarDay, Modifiers>,
  isSelected: (date: Date) => boolean,
  lastFocused: CalendarDay | undefined,
  dateLib: DateLib,
): CalendarDay | undefined {
  let target: CalendarDay | undefined

  let priority = -1

  let first: CalendarDay | undefined

  for (const day of days) {
    const flags = modifiers.get(day)

    if (
      flags === undefined ||
      flags.disabled === true ||
      flags.hidden === true ||
      flags.outside === true
    ) {
      continue
    }
    first ??= day

    const level = focusPriority(day, flags, lastFocused, isSelected, dateLib)

    if (level > priority) {
      target = day
      priority = level
    }
  }

  return target ?? first
}
