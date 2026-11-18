import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Clock, Effect } from 'effect'
import { TZDate } from '@date-fns/tz'
import { UTCDate } from '@date-fns/utc'
import { instantDate } from '../src/calendar-domain/date-boundary.js'
import { DateLib, defaultLocale } from '../src/calendar-domain/date-library.js'
import { resolveFormatters } from '../src/calendar-domain/formatters.js'
import { resolveLabels } from '../src/calendar-domain/labels.js'
import { dateMatchModifiers, rangeContainsModifiers } from '../src/calendar-domain/matchers.js'
import { createCalendarRules } from '../src/calendar-domain/rules.js'
import { makeCalendarEnvironment, prepareCalendar } from '../src/calendar-environment.js'

const timestamp = Date.UTC(2026, 10, 10, 0, 30)

const oracle = new TZDate(timestamp, 'UTC')

const date = new UTCDate(timestamp)

const localeOptions = { timeZone: undefined }

const checkCallbackDate: (value: Date) => void = (value: Date) => {
  expect(value).toBeInstanceOf(TZDate)
  expect(value.getTime()).toBe(timestamp)
  expect(value.toLocaleString('en-US', localeOptions)).toBe(
    oracle.toLocaleString('en-US', localeOptions),
  )
  expect(value.toLocaleDateString('en-US', localeOptions)).toBe(
    oracle.toLocaleDateString('en-US', localeOptions),
  )
  expect(value.toLocaleTimeString('en-US', localeOptions)).toBe(
    oracle.toLocaleTimeString('en-US', localeOptions),
  )
  expect(value.toISOString()).toBe(oracle.toISOString())
  expect(Object.is(value.getTimezoneOffset(), oracle.getTimezoneOffset())).toBe(true)
}

const matcher: (value: Date) => boolean = (value: Date) => {
  checkCallbackDate(value)

  return value.toLocaleDateString('en-US', localeOptions) === '11/10/2026'
}

const unaryNumber: (value: Date) => number = (value: Date) => {
  checkCallbackDate(value)

  return 1
}

const binaryNumber: (left: Date, right: Date) => number = (left: Date, right: Date) => {
  checkCallbackDate(left)
  checkCallbackDate(right)

  return 0
}

const binaryBoolean: (left: Date, right: Date) => boolean = (left: Date, right: Date) => {
  checkCallbackDate(left)
  checkCallbackDate(right)

  return true
}

it('custom date formatters and labels retain TZDate UTC locale defaults', () => {
  const formatDate: (value: Date) => string = (value: Date) => {
    checkCallbackDate(value)

    return value.toLocaleDateString('en-US', localeOptions)
  }

  const formatters = resolveFormatters({
    formatCaption: formatDate,
    formatDay: formatDate,
    formatMonthDropdown: formatDate,
    formatWeekdayName: formatDate,
    formatYearDropdown: formatDate,
  })

  const expected = oracle.toLocaleDateString('en-US', localeOptions)
  const lib = new DateLib({ timeZone: 'UTC' })
  expect(formatters.formatCaption(date)).toBe(expected)
  expect(formatters.formatDay(date)).toBe(expected)
  expect(formatters.formatMonthDropdown(date, lib)).toBe(expected)
  expect(formatters.formatWeekdayName(date)).toBe(expected)
  expect(formatters.formatYearDropdown(date, lib)).toBe(expected)

  const absentMonth: Date | undefined = undefined

  const navigation: (value: Date | undefined) => string = (value: Date | undefined) =>
    value === undefined ? 'none' : formatDate(value)

  const custom = {
    labelDayButton: formatDate,
    labelGrid: formatDate,
    labelGridcell: formatDate,
    labelWeekday: formatDate,
    labelNext: navigation,
    labelPrevious: navigation,
  }

  for (const labels of [
    resolveLabels(custom, { timeZone: 'UTC' }),
    resolveLabels({}, { timeZone: 'UTC', locale: { ...defaultLocale, labels: custom } }),
  ]) {
    expect(labels.labelDayButton(date, {})).toBe(expected)
    expect(labels.labelGrid(date)).toBe(expected)
    expect(labels.labelGridcell(date)).toBe(expected)
    expect(labels.labelWeekday(date)).toBe(expected)
    expect(labels.labelNext(date)).toBe(expected)
    expect(labels.labelPrevious(date)).toBe(expected)
    expect(labels.labelNext(absentMonth)).toBe('none')
    expect(labels.labelPrevious(absentMonth)).toBe('none')
  }

  expect(lib.newDate(2026, 10, 10)).toBeInstanceOf(UTCDate)
  expect(lib.addDays(date, 1)).toBeInstanceOf(UTCDate)
})

it('single-date and range function matchers receive compatible UTC dates', () => {
  expect(dateMatchModifiers(date, matcher)).toBe(true)
  expect(rangeContainsModifiers({ from: date, to: date }, matcher)).toBe(true)
})

it('DateLib adapts Date, interval and array arguments only for custom operations', () => {
  const unaryDate: (value: Date) => Date = (value: Date) => {
    checkCallbackDate(value)

    return oracle
  }

  const intervalDates: DateLib['eachMonthOfInterval'] = (interval) => {
    expect(interval.start).toBeInstanceOf(TZDate)
    expect(interval.end).toBeInstanceOf(TZDate)

    if (interval.start instanceof Date && interval.end instanceof Date) {
      checkCallbackDate(interval.start)
      checkCallbackDate(interval.end)
    }

    return [oracle]
  }

  const arrayDate: (values: Array<Date>) => Date = (values: Array<Date>) => {
    for (const value of values) {
      checkCallbackDate(value)
    }

    return oracle
  }

  const lib = new DateLib(
    { timeZone: 'UTC' },
    {
      today: () => oracle,
      newDate: () => oracle,
      addDays: unaryDate,
      addMonths: unaryDate,
      addWeeks: unaryDate,
      addYears: unaryDate,
      differenceInCalendarDays: binaryNumber,
      differenceInCalendarMonths: binaryNumber,
      eachMonthOfInterval: intervalDates,
      eachYearOfInterval: intervalDates,
      endOfBroadcastWeek: unaryDate,
      endOfISOWeek: unaryDate,
      endOfMonth: unaryDate,
      endOfWeek: unaryDate,
      endOfYear: unaryDate,
      format: (value) => {
        checkCallbackDate(value)

        return value.toLocaleString('en-US', localeOptions)
      },
      getISOWeek: unaryNumber,
      getMonth: unaryNumber,
      getWeek: unaryNumber,
      getYear: unaryNumber,
      isAfter: binaryBoolean,
      isBefore: binaryBoolean,
      isDate: (value): value is Date => {
        if (value instanceof Date) {
          checkCallbackDate(value)
        }

        return value instanceof Date
      },
      isSameDay: binaryBoolean,
      isSameMonth: binaryBoolean,
      isSameYear: binaryBoolean,
      max: arrayDate,
      min: arrayDate,
      setMonth: unaryDate,
      setYear: unaryDate,
      startOfBroadcastWeek: unaryDate,
      startOfDay: unaryDate,
      startOfISOWeek: unaryDate,
      startOfMonth: unaryDate,
      startOfWeek: unaryDate,
      startOfYear: unaryDate,
    },
  )

  expect(lib.today()).toBe(oracle)
  expect(lib.newDate(2000, 0, 1)).toBe(oracle)

  for (const result of [
    lib.addDays(date, 1),
    lib.addMonths(date, 1),
    lib.addWeeks(date, 1),
    lib.addYears(date, 1),
    lib.endOfBroadcastWeek(date),
    lib.endOfISOWeek(date),
    lib.endOfMonth(date),
    lib.endOfWeek(date),
    lib.endOfYear(date),
    lib.setMonth(date, 1),
    lib.setYear(date, 2000),
    lib.startOfBroadcastWeek(date, lib),
    lib.startOfDay(date),
    lib.startOfISOWeek(date),
    lib.startOfMonth(date),
    lib.startOfWeek(date),
    lib.startOfYear(date),
    lib.max([date]),
    lib.min([date]),
  ]) {
    expect(result).toBe(oracle)
  }

  expect(lib.eachMonthOfInterval({ start: date, end: date })).toEqual([oracle])
  expect(lib.eachYearOfInterval({ start: date, end: date })).toEqual([oracle])
  expect(lib.differenceInCalendarDays(date, date)).toBe(0)
  expect(lib.differenceInCalendarMonths(date, date)).toBe(0)
  expect(lib.getISOWeek(date)).toBe(1)
  expect(lib.getMonth(date)).toBe(1)
  expect(lib.getWeek(date)).toBe(1)
  expect(lib.getYear(date)).toBe(1)
  expect(lib.isAfter(date, date)).toBe(true)
  expect(lib.isBefore(date, date)).toBe(true)
  expect(lib.isSameDay(date, date)).toBe(true)
  expect(lib.isSameMonth(date, date)).toBe(true)
  expect(lib.isSameYear(date, date)).toBe(true)
  expect(lib.isDate(date)).toBe(true)
  expect(lib.isDate('other')).toBe(false)
  expect(lib.format(date, 'yyyy')).toBe(oracle.toLocaleString('en-US', localeOptions))
})

it('preserves native and named-zone callback object and collection identities', () => {
  for (const original of [instantDate(timestamp), new TZDate(timestamp, 'Europe/Stockholm')]) {
    const dates = [original]
    const interval = { start: original, end: original }

    const lib = new DateLib(
      {},
      {
        addDays: (value) => {
          expect(value).toBe(original)

          return value
        },
        max: (values) => {
          expect(values).toBe(dates)

          return original
        },
        eachMonthOfInterval: (value) => {
          expect(value).toBe(interval)

          return dates
        },
      },
    )

    expect(lib.addDays(original, 1)).toBe(original)
    expect(lib.max(dates)).toBe(original)
    expect(lib.eachMonthOfInterval(interval)).toBe(dates)
  }
})

it.effect(
  'configured calendar callbacks retain UTC output while default and noon operations remain UTCDate',
  () =>
    Effect.gen(function* checksCalendarCallbacks() {
      const clock = yield* Clock.Clock

      for (const noonSafe of [false, true]) {
        const rules = createCalendarRules({ timeZone: 'UTC', noonSafe }, clock)
        const initial = rules.dateLib.newDate(2026, 10, 10)
        expect(initial).toBeInstanceOf(UTCDate)
        expect(rules.dateLib.startOfDay(initial)).toBeInstanceOf(UTCDate)
        expect(rules.dateLib.addDays(initial, 1)).toBeInstanceOf(UTCDate)
        expect(rules.dateLib.startOfDay(initial).getHours()).toBe(noonSafe ? 12 : 0)
      }

      const authored = new UTCDate(timestamp)

      const custom = createCalendarRules(
        {
          timeZone: 'UTC',
          dateLib: {
            today: () => authored,
            format: (value) => {
              checkCallbackDate(value)

              return value.toLocaleDateString('en-US', localeOptions)
            },
          },
        },
        clock,
      )

      expect(custom.dateLib.today()).toBe(authored)
      expect(custom.options.today).toBe(authored)
      expect(custom.dateLib.format(date, 'yyyy')).toBe('11/10/2026')

      const prepared = yield* prepareCalendar({ id: 'callbacks', month: date }).pipe(
        Effect.provide(
          makeCalendarEnvironment(() => ({
            timeZone: 'UTC',
            today: date,
            formatters: { formatDay: (value) => value.toLocaleDateString('en-US', localeOptions) },
            labels: { labelDayButton: (value) => value.toLocaleString('en-US', localeOptions) },
            disabled: (value) => value.toLocaleDateString('en-US', localeOptions) === '11/10/2026',
          })),
        ),
      )

      const day = prepared.initial.projection.months
        .flatMap((month) => month.weeks.flatMap((week) => week.days))
        .find((value) => value.isoDate === '2026-11-10')

      const expected = new TZDate(2026, 10, 10, 'UTC')
      expect(day?.text).toBe('11/10/2026')
      expect(day?.label).toBe(expected.toLocaleString('en-US', localeOptions))
      expect(day?.flags.disabled).toBe(true)
    }),
)
