import { TZDate } from '@date-fns/tz'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { expect } from 'vitest'
import { makeCalendarEnvironment, prepareCalendar } from '../src/calendar-environment.js'

it.effect(
  'projects a supplied month in the configured calendar zone before truncating to its start',
  () =>
    Effect.gen(function* () {
      const calendar = yield* prepareCalendar({
        id: 'zone-boundary',
        month: new TZDate(2026, 10, 10, 'Europe/Stockholm'),
        presentation: { numberOfMonths: 2, orientation: 'horizontal' },
      })
      expect(calendar.initial.projection.months.map((month) => month.caption)).toEqual([
        'November 2026',
        'December 2026',
      ])
    }).pipe(Effect.provide(makeCalendarEnvironment(() => ({ timeZone: 'UTC' })))),
)
