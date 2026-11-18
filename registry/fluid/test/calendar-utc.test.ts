import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Clock, Effect } from 'effect'
import { TZDate } from '@date-fns/tz'
import { UTCDate, UTCDateMini } from '@date-fns/utc'
import { addDays } from 'date-fns/addDays'
import { addMonths } from 'date-fns/addMonths'
import { endOfMonth } from 'date-fns/endOfMonth'
import { startOfWeek } from 'date-fns/startOfWeek'
import { format } from 'date-fns/format'
import { DateLib } from '../src/calendar-domain/date-library.js'
import { instantDate, zonedCivilDate, zonedDate } from '../src/calendar-domain/date-boundary.js'
import { createNoonOverrides } from '../src/calendar-domain/noon.js'
import { convertMatchersToTimeZone, toTimeZone } from '../src/calendar-domain/time-zone.js'
import { createCalendarRules } from '../src/calendar-domain/rules.js'
import {
  CalendarEnvironment,
  makeCalendarEnvironment,
  prepareCalendar,
} from '../src/calendar-environment.js'
import { calendarDate, selectedDate, selectedRange } from '../src/calendar-project.js'
import { Action, dateValue, restoreDate } from '../src/calendar-state.js'
import type { CalendarState, Event } from '../src/calendar-state.js'
import { transitionCalendar } from '../src/calendar-transition.js'

const civil = (date: Date) => [
  date.getTime(),
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
  date.getDay(),
  date.getHours(),
  date.getMinutes(),
  date.getSeconds(),
  date.getTimezoneOffset() + 0,
]

describe('UTC calendar Date boundary', () => {
  it('matches TZDate civil normalization, leap days, overflow and constructor years 0 through 99', () => {
    for (const year of [0, 1, 99, 100, 1900, 2000, 2024, 2026]) {
      for (const day of [0, 1, 28, 29, 32]) {
        const date = zonedCivilDate(year, 1, day, 'UTC', 12, 45, 30)
        const oracle = new TZDate(year, 1, day, 12, 45, 30, 'UTC')
        expect(date).toBeInstanceOf(UTCDate)
        expect(civil(date)).toEqual(civil(oracle))
        expect(dateValue(date)).toEqual(dateValue(oracle))
      }
    }
  })

  it('preserves timestamp, civil ordinal and UTC zone through JSON and date-fns arithmetic', () => {
    for (const year of [0, 1, 99, 2024, 2026]) {
      const oracle = new TZDate(2024, 1, 29, 23, 45, 'UTC')
      oracle.setFullYear(year)
      const date = zonedDate(oracle.getTime(), 'UTC')
      const encoded = dateValue(date)
      expect(encoded).toEqual(dateValue(oracle))
      expect(JSON.stringify(encoded)).toBe(JSON.stringify(dateValue(oracle)))
      expect(civil(restoreDate(encoded))).toEqual(civil(oracle))
      expect(restoreDate(encoded)).toBeInstanceOf(UTCDate)
      expect(dateValue(new UTCDateMini(oracle.getTime()))).toEqual(encoded)

      const operations = [
        (value: Date) => addDays(value, 1),
        (value: Date) => addMonths(value, 1),
        (value: Date) => endOfMonth(value),
        (value: Date) => startOfWeek(value, { weekStartsOn: 1 }),
      ]

      for (const operation of operations) {
        const result = operation(date)
        expect(result).toBeInstanceOf(UTCDate)
        expect(civil(result)).toEqual(civil(operation(oracle)))
        expect(format(result, 'yyyy-MM-dd HH:mm XXX')).toBe(
          format(operation(oracle), 'yyyy-MM-dd HH:mm XXX'),
        )
      }
    }
  })

  it('provides UTC default public locale formatting and preserves explicit formatter zones', () => {
    const oracle = new TZDate(Date.UTC(2026, 10, 10, 0, 30), 'UTC')
    const date = toTimeZone(instantDate(oracle.getTime()), 'UTC')
    expect(date).toBeInstanceOf(UTCDate)
    expect(toTimeZone(date, 'UTC')).toBe(date)
    expect(date.toLocaleDateString('en-US')).toBe(oracle.toLocaleDateString('en-US'))
    expect(date.toLocaleTimeString('en-US')).toBe(oracle.toLocaleTimeString('en-US'))
    expect(date.toLocaleString('en-US')).toBe(oracle.toLocaleString('en-US'))
    const options = { timeZone: 'America/Los_Angeles' }
    expect(date.toLocaleString('en-US', options)).toBe(oracle.toLocaleString('en-US', options))
    expect(date.toString()).toContain('GMT+0000')
    expect(date.toDateString()).toContain('Nov 10 2026')
  })

  it('keeps local, named-zone and UTC-alias values on their existing paths across DST', () => {
    const local = instantDate(Date.UTC(2026, 2, 8, 4))
    expect(restoreDate(dateValue(local)).constructor).toBe(Date)

    for (const timeZone of [
      'America/New_York',
      'Europe/Stockholm',
      'America/Los_Angeles',
      'Etc/UTC',
    ]) {
      for (const month of [2, 9, 10]) {
        const date = zonedCivilDate(2026, month, 8, timeZone, 12)
        const oracle = new TZDate(2026, month, 8, 12, 0, 0, timeZone)
        expect(date).toBeInstanceOf(TZDate)
        expect(civil(date)).toEqual(civil(oracle))
        expect(civil(addDays(date, 1))).toEqual(civil(addDays(oracle, 1)))
        expect(civil(restoreDate(dateValue(date)))).toEqual(civil(oracle))
        expect(toTimeZone(date, timeZone)).toBe(date)
      }
    }

    const beforeDST = zonedCivilDate(2026, 2, 7, 'America/New_York', 12)
    expect(addDays(beforeDST, 1).getTime() - beforeDST.getTime()).toBe(23 * 60 * 60 * 1000)
  })

  it('keeps noon overrides and matcher normalization equivalent to the TZDate UTC oracle', () => {
    const utc = new DateLib({ timeZone: 'UTC' }, undefined, createNoonOverrides('UTC'))
    const oracle = new DateLib({ timeZone: 'Etc/UTC' }, undefined, createNoonOverrides('Etc/UTC'))

    for (const year of [0, 99, 2024, 2026]) {
      const date = utc.newDate(year, 1, 28)
      const original = oracle.newDate(year, 1, 28)
      expect(date).toBeInstanceOf(UTCDate)

      const results = [
        utc.addDays(date, 1),
        utc.addWeeks(date, 1),
        utc.addMonths(date, 1),
        utc.addYears(date, 1),
        utc.startOfDay(date),
        utc.startOfWeek(date),
        utc.startOfISOWeek(date),
        utc.startOfMonth(date),
        utc.startOfYear(date),
        utc.endOfWeek(date),
        utc.endOfISOWeek(date),
        utc.endOfMonth(date),
        utc.endOfYear(date),
        ...utc.eachMonthOfInterval({ start: date, end: utc.addMonths(date, 2) }),
        ...utc.eachYearOfInterval({ start: date, end: utc.addYears(date, 2) }),
      ]

      const expected = [
        oracle.addDays(original, 1),
        oracle.addWeeks(original, 1),
        oracle.addMonths(original, 1),
        oracle.addYears(original, 1),
        oracle.startOfDay(original),
        oracle.startOfWeek(original),
        oracle.startOfISOWeek(original),
        oracle.startOfMonth(original),
        oracle.startOfYear(original),
        oracle.endOfWeek(original),
        oracle.endOfISOWeek(original),
        oracle.endOfMonth(original),
        oracle.endOfYear(original),
        ...oracle.eachMonthOfInterval({ start: original, end: oracle.addMonths(original, 2) }),
        ...oracle.eachYearOfInterval({ start: original, end: oracle.addYears(original, 2) }),
      ]

      expect(results.map(civil)).toEqual(expected.map(civil))
      expect(results.every((value) => value instanceof UTCDate && value.getHours() === 12)).toBe(
        true,
      )
      expect(utc.getWeek(date)).toBe(oracle.getWeek(original))
      expect(utc.getISOWeek(date)).toBe(oracle.getISOWeek(original))
      expect(utc.differenceInCalendarDays(utc.addDays(date, 5), date)).toBe(5)
      expect(utc.differenceInCalendarMonths(utc.addMonths(date, 2), date)).toBe(2)
      const converted = convertMatchersToTimeZone(date, 'UTC', true)
      const expectedMatcher = convertMatchersToTimeZone(original, 'Etc/UTC', true)
      expect(converted).toEqual(expectedMatcher)
    }
  })

  it.effect(
    'retains standalone and injected DateLib overrides and inherited-zone restoration',
    () =>
      Effect.gen(function* retainsOverrides() {
        const clock = yield* Clock.Clock
        const authored = new TZDate(2026, 10, 7, 12, 'America/Los_Angeles')

        const rules = createCalendarRules(
          {
            timeZone: 'UTC',
            noonSafe: true,
            dateLib: {
              today: () => authored,
              newDate: () => authored,
              format: (date) => `custom ${date.getDate()}`,
            },
          },
          clock,
        )

        expect(rules.dateLib.today()).toBe(authored)
        expect(rules.options.today).toBe(authored)
        expect(rules.dateLib.newDate(2000, 0, 1)).toBe(authored)
        expect(rules.dateLib.format(authored, 'yyyy')).toBe('custom 7')
        const defaultRules = createCalendarRules({}, clock)
        expect(calendarDate(authored.getTime(), defaultRules, 'UTC')).toBeInstanceOf(UTCDate)
        expect(new DateLib({ timeZone: 'UTC' }).today()).toBeInstanceOf(UTCDate)
        expect(new DateLib({ timeZone: 'UTC' }).newDate(2026, 10, 10)).toBeInstanceOf(UTCDate)
      }),
  )
})

it.effect('UTC preparation keeps captured SSR today and explicit today overrides', () =>
  Effect.gen(function* preparesToday() {
    const clock = yield* Clock.Clock
    const timestamp = Date.UTC(2026, 10, 10, 0, 30)
    yield* Effect.gen(function* checksCapturedClock() {
      const environment = yield* CalendarEnvironment
      const initial = environment.rulesFor('today', 0, undefined, true).options.today
      const current = environment.rulesFor('today', 0).options.today
      expect(initial).toBeInstanceOf(UTCDate)
      expect(current).toBeInstanceOf(UTCDate)
      expect(initial?.getTime()).toBe(Date.UTC(2026, 10, 10))
      expect(current?.getTime()).toBe(timestamp)
    }).pipe(
      Effect.provide(makeCalendarEnvironment(() => ({ timeZone: 'UTC' }))),
      Effect.provideService(Clock.Clock, {
        currentTimeMillisUnsafe: () => timestamp,
        currentTimeMillis: Effect.succeed(timestamp),
        currentTimeNanosUnsafe: () => clock.currentTimeNanosUnsafe(),
        currentTimeNanos: clock.currentTimeNanos,
        monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
        monotonicTimeNanos: clock.monotonicTimeNanos,
        sleep: (duration) => clock.sleep(duration),
      }),
    )
    const authored = new UTCDate(2026, 10, 7, 11)

    for (const options of [{ today: authored }, { dateLib: { today: () => authored } }]) {
      yield* Effect.gen(function* checksAuthoredToday() {
        const environment = yield* CalendarEnvironment
        expect(environment.rulesFor('today', 0, undefined, true).options.today).toBe(authored)
        expect(environment.rulesFor('today', 0).options.today).toBe(authored)
      }).pipe(Effect.provide(makeCalendarEnvironment(() => ({ timeZone: 'UTC', ...options }))))
    }
  }),
)

const comparable: (value: {
  readonly state: CalendarState
  readonly events: ReadonlyArray<Event>
  readonly focus?: number | null
}) => string = (value: {
  readonly state: CalendarState
  readonly events: ReadonlyArray<Event>
  readonly focus?: number | null
}) => JSON.stringify(value).replaceAll('Etc/UTC', 'UTC')

const dayIn = (state: CalendarState, day: string) => {
  const result = state.projection.months
    .flatMap((month) => month.weeks.flatMap((week) => week.days))
    .find((value) => value.isoDate === day && value.flags.outside !== true)

  if (result === undefined) {
    throw new Error(`Missing calendar day ${day}`)
  }

  return result
}

describe.each(['single', 'range'] as const)('UTC %s calendar interaction oracle', (mode) => {
  it.effect(
    'keeps projection, custom callbacks, leap selection, keyboard focus and navigation',
    () =>
      Effect.gen(function* comparesInteractions() {
        const snapshots: Array<string> = []

        for (const timeZone of ['UTC', 'Etc/UTC']) {
          yield* Effect.gen(function* interactsWithCalendar() {
            const prepared = yield* prepareCalendar({
              id: 'oracle',
              mode,
              month: new TZDate(2024, 1, 1, timeZone),
              controlledMonth: false,
              selected:
                mode === 'single'
                  ? new TZDate(2024, 1, 28, timeZone)
                  : { from: new TZDate(2024, 1, 28, timeZone) },
              presentation: { numberOfMonths: 2, orientation: 'horizontal' },
            })

            const environment = yield* CalendarEnvironment
            const rules = environment.rulesFor('oracle', 0)
            let state = prepared.initial
            const leap = dayIn(state, '2024-02-29')

            const selected = transitionCalendar(
              state,
              Action.cases.Picked.make({
                date: leap.date,
                displayMonth: leap.displayMonth,
                modifiers: leap.flags,
              }),
              rules,
            )

            ;({ state } = selected)

            const restored =
              mode === 'single'
                ? selectedDate(state.selection.selected, rules)
                : selectedRange(state.selection.selected, rules)?.to

            expect(restored?.getDate()).toBe(29)
            expect(restored instanceof UTCDate).toBe(timeZone === 'UTC')
            snapshots.push(comparable({ state, events: selected.events }))

            const moved = transitionCalendar(
              state,
              Action.cases.KeyDown.make({
                date: leap.date,
                modifiers: leap.flags,
                key: 'ArrowRight',
                shift: false,
              }),
              rules,
            )

            expect(moved.focus).toBe(new TZDate(2024, 2, 1, timeZone).getTime())
            expect(moved.state.projection.focused).toBe(moved.focus)
            snapshots.push(comparable(moved))

            const paged = transitionCalendar(
              moved.state,
              Action.cases.KeyDown.make({
                date: moved.focus ?? leap.date,
                modifiers: {},
                key: 'PageDown',
                shift: false,
              }),
              rules,
            )

            snapshots.push(comparable(paged))

            const navigated = transitionCalendar(
              paged.state,
              Action.cases.Navigated.make({ direction: 'next' }),
              rules,
            )

            snapshots.push(comparable(navigated))
          }).pipe(
            Effect.provide(
              makeCalendarEnvironment(() => ({
                timeZone,
                today: new TZDate(2024, 1, 28, timeZone),
                numberOfMonths: 2,
                weekStartsOn: 1,
                showWeekNumber: true,
                disabled: (date) => date.getDate() === 15,
                formatters: {
                  formatDay: (date) => date.toLocaleDateString('en-US', { day: 'numeric' }),
                  formatCaption: (date) =>
                    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                },
                labels: {
                  labelDayButton: (date) =>
                    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
                },
              })),
            ),
          )
        }

        expect(snapshots.slice(0, 4)).toEqual(snapshots.slice(4))
      }),
  )
})
