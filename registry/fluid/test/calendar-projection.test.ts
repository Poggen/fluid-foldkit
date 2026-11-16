import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { TZDate } from '@date-fns/tz'
import {
  CalendarEnvironment,
  makeCalendarEnvironment,
  prepareCalendar,
} from '../src/calendar-environment.js'
import { projectCalendar } from '../src/calendar-project.js'
import { dateValue } from '../src/calendar-state.js'
import { initialVisual, transitionVisual } from '../src/calendar-view/state.js'

describe.each(['Europe/Stockholm', 'America/Los_Angeles'])(
  'Calendar display month in %s',
  (timeZone) => {
    it.effect(
      'accepted dates keep complete month grids and stable same-month animation identity',
      () =>
        Effect.gen(function* () {
          const result = yield* Effect.gen(function* () {
            const prepared = yield* prepareCalendar({
              id: 'month-grid',
              month: new TZDate(2026, 10, 1, timeZone),
              controlledMonth: true,
              presentation: { numberOfMonths: 2, orientation: 'horizontal' },
            })
            const environment = yield* CalendarEnvironment
            const rules = environment.rulesFor('month-grid', 0, prepared.initial.presentation)
            const acceptedDates = [
              new TZDate(2026, 10, 7, 13, 42, 16, timeZone),
              new TZDate(2026, 10, 10, 9, 30, 0, timeZone),
            ]
            return acceptedDates.map((date) => {
              const accepted = { ...prepared.initial, month: dateValue(date) }
              const projection = projectCalendar(accepted, rules)
              const visual = transitionVisual(
                initialVisual(accepted.selection.selected),
                prepared.initial,
                { ...accepted, projection },
                null,
              )
              return { accepted, projection, visual, date }
            })
          }).pipe(Effect.provide(makeCalendarEnvironment(() => ({ timeZone, numberOfMonths: 2 }))))

          for (const { accepted, projection, visual, date } of result) {
            expect(accepted.month.timestamp).toBe(date.getTime())
            expect(accepted.month.timeZone).toBe(timeZone)
            expect(projection.firstMonth).toBe(new TZDate(2026, 10, 1, timeZone).getTime())
            const days = projection.months.map((month) =>
              month.weeks
                .flatMap((week) => week.days)
                .filter((day) => day.flags.outside !== true)
                .map((day) => day.isoDate),
            )
            expect(days[0]).toEqual(
              Array.from(
                { length: 30 },
                (_, index) => `2026-11-${String(index + 1).padStart(2, '0')}`,
              ),
            )
            expect(days[1]).toEqual(
              Array.from(
                { length: 31 },
                (_, index) => `2026-12-${String(index + 1).padStart(2, '0')}`,
              ),
            )
            expect(visual.retained).toEqual([])
            expect(visual.generation).toBe(0)
          }
        }),
    )
  },
)
