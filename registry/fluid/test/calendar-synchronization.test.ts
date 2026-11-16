import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Story } from 'foldkit'
import { TZDate } from '@date-fns/tz'
import { CalendarBlock, InMessage, layer } from '../src/calendar.js'
import {
  CalendarEffects,
  ComputeTransition,
  ContinueQueue,
  FocusDay,
  Message,
} from '../src/calendar-definition.js'
import { makeCalendarEnvironment, prepareCalendar } from '../src/calendar-environment.js'
import { Action, Event, dateValue, selectionValue } from '../src/calendar-state.js'

describe('Calendar parent synchronization', () => {
  it.effect(
    'accepts final presentation and focus before queued navigation, ignoring late completion',
    () =>
      Effect.gen(function* synchronizedCalendar() {
        const date = new TZDate(2026, 10, 7, 13, 30, 'Europe/Stockholm')
        const prepared = yield* prepareCalendar({ id: 'synchronized-calendar', month: date })
        const subject = { block: CalendarBlock, layer }

        const initial = yield* Story.story(
          subject,
          Story.init(prepared),
          Story.Command.expectNone(),
        )

        const firstAction = Action.cases.HoverPreview.make({ ordinal: null })

        const first = ComputeTransition({
          generation: 1,
          calendar: initial.calendar,
          action: firstAction,
        })

        const earlier = yield* first.effect.pipe(Effect.provide(CalendarEffects))

        const synchronization = {
          selection: {
            ...initial.calendar.selection,
            controlled: true,
            selected: selectionValue(date),
          },
          month: dateValue(date),
          controlledMonth: true,
          presentation: { numberOfMonths: 2, orientation: 'horizontal' },
          occurrenceFocus: true,
        } satisfies Omit<typeof InMessage.RequestedSynchronization.Type, '_tag'>

        const next = ComputeTransition({
          generation: 3,
          calendar: earlier.calendar,
          action: Action.cases.Synchronized.make(synchronization),
        })

        const completion = yield* next.effect.pipe(Effect.provide(CalendarEffects))

        const navigating = ComputeTransition({
          generation: 5,
          calendar: completion.calendar,
          action: Action.cases.Navigated.make({ direction: 'next' }),
        })

        const navigated = yield* navigating.effect.pipe(Effect.provide(CalendarEffects))
        yield* Story.story(
          subject,
          Story.given(initial),
          Story.inMessage(InMessage.RequestedAction({ action: firstAction })),
          Story.inMessage(
            InMessage.RequestedAction({
              action: Action.cases.Navigated.make({ direction: 'next' }),
            }),
          ),
          Story.inMessage(InMessage.RequestedSynchronization(synchronization)),
          Story.Command.resolve(first, earlier),
          Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
          Story.Command.resolve(next, completion),
          Story.model((model) => {
            expect(model.calendar.selection.selected).toEqual(selectionValue(date))
            expect(model.calendar.month).toEqual(dateValue(date))
            expect(model.calendar.projection.months).toHaveLength(2)
            expect(model.calendar.projection.firstMonth).toBe(
              new TZDate(2026, 10, 1, 'Europe/Stockholm').getTime(),
            )
            expect(model.calendar.focused).toBe(
              new TZDate(2026, 10, 7, 'Europe/Stockholm').getTime(),
            )
            expect(model.pending.map((action) => action._tag)).toEqual(['Navigated'])
          }),
          Story.message(earlier),
          Story.model((model) => {
            expect(model.calendar).toEqual(completion.calendar)
          }),
          Story.Command.resolve(FocusDay, Message.CompletedFocus()),
          Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
          Story.Command.resolve(navigating, navigated),
          Story.expectOutMessage(
            CalendarBlock.OutMessage.cases.Transitioned.make({
              events: [
                Event.cases.MonthChanged.make({
                  month: dateValue(new TZDate(2026, 11, 1, 'Europe/Stockholm')),
                }),
                Event.cases.NextClicked.make({
                  month: dateValue(new TZDate(2026, 11, 1, 'Europe/Stockholm')),
                }),
              ],
            }),
          ),
          ...(navigated.focus === null
            ? []
            : [Story.Command.resolve(FocusDay, Message.CompletedFocus())]),
          Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
          Story.model((model) => {
            expect(model.pending).toEqual([])
            expect(model.working).toBe(false)
            expect(model.calendar.internalMonth).toEqual(
              dateValue(new TZDate(2026, 11, 1, 'Europe/Stockholm')),
            )
            expect(model.calendar.projection.firstMonth).toBe(
              new TZDate(2026, 10, 1, 'Europe/Stockholm').getTime(),
            )
          }),
          Story.Command.expectNone(),
        )
      }).pipe(Effect.provide(makeCalendarEnvironment(() => ({ timeZone: 'Europe/Stockholm' })))),
  )
})
