import { expect } from 'vitest'
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
import { Action } from '../src/calendar-state.js'
import { Observation, panelKey } from '../src/calendar-view/state.js'

it.effect('remount occurrence rejects an old exit without replaying the initial entrance', () =>
  Effect.gen(function* verifiesRemountOccurrence() {
    const prepared = yield* prepareCalendar({
      id: 'remount-calendar',
      controlledMonth: false,
      month: new TZDate(2026, 10, 1, 'UTC'),
    })

    const subject = { block: CalendarBlock, layer }
    const initial = yield* Story.story(subject, Story.init(prepared), Story.Command.expectNone())
    const [month] = initial.calendar.projection.months

    if (month === undefined) {
      throw new Error('Missing initial month')
    }

    const oldKey = panelKey(initial.visual, month, 0)

    const remounted = yield* Story.story(
      subject,
      Story.given(initial),
      Story.message(Message.Disposed()),
      Story.model((model) => {
        expect(model.visual.generation).toBe(0)
        expect(panelKey(model.visual, month, 0)).not.toBe(oldKey)
      }),
      Story.Command.expectNone(),
    )

    const action = Action.cases.Navigated.make({ direction: 'next' })
    const command = ComputeTransition({ generation: 2, calendar: remounted.calendar, action })
    const completion = yield* command.effect.pipe(Effect.provide(CalendarEffects))
    yield* Story.story(
      subject,
      Story.given(remounted),
      Story.inMessage(InMessage.RequestedAction({ action })),
      Story.Command.resolve(command, completion),
      Story.model((model) => {
        expect(model.visual.retained).toHaveLength(1)
      }),
      Story.message(
        Message.VisualObserved({
          observation: Observation.cases.PanelExited.make({ key: oldKey }),
        }),
      ),
      Story.model((model) => {
        expect(model.visual.retained).toHaveLength(1)
      }),
      ...(completion.focus === null
        ? []
        : [Story.Command.resolve(FocusDay, Message.CompletedFocus())]),
      Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
      Story.Command.expectNone(),
    )
  }).pipe(Effect.provide(makeCalendarEnvironment(() => ({ timeZone: 'UTC' })))),
)

it.effect('decoration completions clear only their own current occurrence', () =>
  Effect.gen(function* verifiesIndependentDecorationCompletions() {
    const prepared = yield* prepareCalendar({
      id: 'decorations',
      month: new TZDate(2026, 10, 1, 'UTC'),
    })

    const subject = { block: CalendarBlock, layer }
    const initial = yield* Story.story(subject, Story.init(prepared), Story.Command.expectNone())
    yield* Story.story(
      subject,
      Story.given({
        ...initial,
        visual: {
          ...initial.visual,
          ghostGeneration: 3,
          ghost: { from: 10, to: 13, generation: 3 },
          committedEndGeneration: 2,
          committedEnd: 13,
        },
      }),
      Story.message(
        Message.VisualObserved({
          observation: Observation.cases.CommittedEndSettled.make({ generation: 1 }),
        }),
      ),
      Story.model((model) => {
        expect(model.visual.committedEnd).toBe(13)
      }),
      Story.message(
        Message.VisualObserved({
          observation: Observation.cases.CommittedEndSettled.make({ generation: 2 }),
        }),
      ),
      Story.model((model) => {
        expect(model.visual.committedEnd).toBeNull()
        expect(model.visual.ghost?.generation).toBe(3)
      }),
      Story.message(
        Message.VisualObserved({
          observation: Observation.cases.GhostSettled.make({ generation: 2 }),
        }),
      ),
      Story.model((model) => {
        expect(model.visual.ghost?.generation).toBe(3)
      }),
      Story.message(
        Message.VisualObserved({
          observation: Observation.cases.GhostSettled.make({ generation: 3 }),
        }),
      ),
      Story.model((model) => {
        expect(model.visual.ghost).toBeNull()
      }),
      Story.Command.expectNone(),
    )
  }).pipe(Effect.provide(makeCalendarEnvironment(() => ({ timeZone: 'UTC' })))),
)
