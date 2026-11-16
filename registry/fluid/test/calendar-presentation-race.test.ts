import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Story } from 'foldkit'
import { TZDate } from '@date-fns/tz'
import { CalendarBlock, InMessage, layer, hoverModeOf } from '../src/calendar.js'
import {
  CalendarEffects,
  ComputeTransition,
  ContinueQueue,
  FocusDay,
  Message,
} from '../src/calendar-definition.js'
import { makeCalendarEnvironment, prepareCalendar } from '../src/calendar-environment.js'
import { Action, dateValue } from '../src/calendar-state.js'

const subject = { block: CalendarBlock, layer }
const environment = makeCalendarEnvironment(() => ({ timeZone: 'UTC' }))

describe('Calendar presentation during pending transitions', () => {
  it.effect('keeps accepted hover mode without losing an in-flight month navigation', () =>
    Effect.gen(function* () {
      const prepared = yield* prepareCalendar({
        id: 'hover-navigation',
        controlledMonth: false,
        month: new TZDate(2026, 10, 1, 'UTC'),
        presentation: { numberOfMonths: 1, orientation: 'horizontal', hoverMode: 'fluid' },
      })
      const initial = yield* Story.story(subject, Story.init(prepared), Story.Command.expectNone())
      const action = Action.cases.Navigated.make({ direction: 'next' })
      const command = ComputeTransition({ generation: 1, calendar: initial.calendar, action })
      const completion = yield* command.effect.pipe(Effect.provide(CalendarEffects))
      yield* Story.story(
        subject,
        Story.given(initial),
        Story.inMessage(InMessage.RequestedAction({ action })),
        Story.inMessage(InMessage.RequestedHoverMode({ mode: 'standard' })),
        Story.model((model) => expect(hoverModeOf(model)).toBe('standard')),
        Story.Command.resolve(command, completion),
        Story.expectOutMessage(
          CalendarBlock.OutMessage.cases.Transitioned.make({ events: completion.events }),
        ),
        Story.model((model) => {
          expect(hoverModeOf(model)).toBe('standard')
          expect(model.calendar.month).toEqual(dateValue(new TZDate(2026, 11, 1, 'UTC')))
        }),
        ...(completion.focus === null
          ? []
          : [Story.Command.resolve(FocusDay, Message.CompletedFocus())]),
        Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
        Story.Command.expectNone(),
      )
    }).pipe(Effect.provide(environment)),
  )

  for (const kind of ['Presented', 'Synchronized'] as const) {
    it.effect(`keeps newer hover policy when an in-flight ${kind} configuration completes`, () =>
      Effect.gen(function* () {
        const prepared = yield* prepareCalendar({
          id: `hover-${kind}`,
          month: new TZDate(2026, 10, 1, 'UTC'),
          presentation: { numberOfMonths: 1, orientation: 'horizontal', hoverMode: 'fluid' },
        })
        const initial = yield* Story.story(
          subject,
          Story.init(prepared),
          Story.Command.expectNone(),
        )
        const presentation = {
          numberOfMonths: 2,
          orientation: 'vertical',
          hoverMode: 'standard',
        } as const
        const synchronization = {
          selection: initial.calendar.selection,
          month: initial.calendar.month,
          controlledMonth: false,
          occurrenceFocus: false,
          presentation,
        }
        const action =
          kind === 'Presented'
            ? Action.cases.Presented.make({ presentation })
            : Action.cases.Synchronized.make(synchronization)
        const command = ComputeTransition({ generation: 1, calendar: initial.calendar, action })
        const completion = yield* command.effect.pipe(Effect.provide(CalendarEffects))
        yield* Story.story(
          subject,
          Story.given(initial),
          Story.inMessage(
            kind === 'Presented'
              ? InMessage.RequestedPresentation({ presentation })
              : InMessage.RequestedSynchronization(synchronization),
          ),
          Story.inMessage(InMessage.RequestedHoverMode({ mode: 'standard' })),
          Story.inMessage(InMessage.RequestedHoverMode({ mode: 'fluid' })),
          Story.Command.resolve(ComputeTransition, completion),
          Story.model((model) => {
            expect(hoverModeOf(model)).toBe('fluid')
            expect(model.calendar.presentation.numberOfMonths).toBe(2)
            expect(model.calendar.presentation.orientation).toBe('vertical')
            expect(model.calendar.projection.months).toHaveLength(2)
          }),
          ...(completion.focus === null
            ? []
            : [Story.Command.resolve(FocusDay, Message.CompletedFocus())]),
          Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
          Story.Command.expectNone(),
        )
      }).pipe(Effect.provide(environment)),
    )
  }
  it.effect('accepts full presentation hover changes and removal without a hover request', () =>
    Effect.gen(function* () {
      const prepared = yield* prepareCalendar({
        id: 'presentation-hover',
        month: new TZDate(2026, 10, 1, 'UTC'),
        presentation: { numberOfMonths: 1, orientation: 'horizontal', hoverMode: 'fluid' },
      })
      const initial = yield* Story.story(subject, Story.init(prepared), Story.Command.expectNone())
      const standard = {
        numberOfMonths: 1,
        orientation: 'horizontal',
        hoverMode: 'standard',
      } as const
      const inherited = { numberOfMonths: 1, orientation: 'horizontal' } as const
      const first = yield* ComputeTransition({
        generation: 1,
        calendar: initial.calendar,
        action: Action.cases.Presented.make({ presentation: standard }),
      }).effect.pipe(Effect.provide(CalendarEffects))
      const second = yield* ComputeTransition({
        generation: 3,
        calendar: first.calendar,
        action: Action.cases.Presented.make({ presentation: inherited }),
      }).effect.pipe(Effect.provide(CalendarEffects))
      yield* Story.story(
        subject,
        Story.given(initial),
        Story.inMessage(InMessage.RequestedPresentation({ presentation: standard })),
        Story.Command.resolve(ComputeTransition, first),
        Story.model((model) => expect(model.calendar.presentation.hoverMode).toBe('standard')),
        Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
        Story.inMessage(InMessage.RequestedPresentation({ presentation: inherited })),
        Story.Command.resolve(ComputeTransition, second),
        Story.model((model) => expect(model.calendar.presentation.hoverMode).toBeUndefined()),
        Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
        Story.Command.expectNone(),
      )
    }).pipe(Effect.provide(environment)),
  )
})
