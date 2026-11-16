import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Clock, Effect } from 'effect'
import { CalendarEnvironment, makeCalendarEnvironment } from '../src/calendar-environment.js'
import { localDate } from '../src/calendar-domain/date-boundary.js'

it.effect(
  'initial today uses the UTC civil day, then uses the configured client zone without replacing the Clock',
  () =>
    Effect.gen(function* () {
      const clock = yield* Clock.Clock
      const instant = Date.UTC(2026, 10, 10, 0, 30)
      yield* Effect.gen(function* () {
        const environment = yield* CalendarEnvironment
        const initial = environment.rulesFor('today', 0, undefined, true).options.today
        const local = environment.rulesFor('today', 0).options.today
        expect(initial?.getDate()).toBe(10)
        expect(local?.getDate()).toBe(9)
      }).pipe(
        Effect.provide(makeCalendarEnvironment(() => ({ timeZone: 'America/Los_Angeles' }))),
        Effect.provideService(Clock.Clock, {
          currentTimeMillisUnsafe: () => instant,
          currentTimeMillis: Effect.succeed(instant),
          currentTimeNanosUnsafe: () => clock.currentTimeNanosUnsafe(),
          currentTimeNanos: clock.currentTimeNanos,
          monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
          monotonicTimeNanos: clock.monotonicTimeNanos,
          sleep: (duration) => clock.sleep(duration),
        }),
      )
    }),
)

it.effect('explicit authored today wins during preparation and after mount', () =>
  Effect.gen(function* () {
    const environment = yield* CalendarEnvironment
    expect(environment.rulesFor('fixed', 0, undefined, true).options.today?.getDate()).toBe(7)
    expect(environment.rulesFor('fixed', 0).options.today?.getDate()).toBe(7)
  }).pipe(Effect.provide(makeCalendarEnvironment(() => ({ today: localDate(2026, 10, 7) })))),
)
