import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { CalendarBlock, layer } from '../src/calendar.js'
import {
  CalendarEffects,
  ComputeTransition,
  ContinueQueue,
  Message,
} from '../src/calendar-definition.js'
import { Action } from '../src/calendar-state.js'
import { makeCalendarEnvironment, prepareCalendar } from '../src/calendar-environment.js'
import { Observation } from '../src/calendar-view/state.js'

const observed = (observation: Observation) => Message.VisualObserved({ observation })
const active = (ordinal: number, keyboard = false) =>
  observed(Observation.cases.Active.make({ ordinal, keyboard }))
const rect = { left: 0, top: 0, width: 32, height: 32 }
const measured = Observation.cases.Measured.make({
  generation: 0,
  heights: { '0': 224 },
  navRects: { 'next:0': rect },
  fits: true,
  stride: 248,
  rects: { '10': rect, '11': { ...rect, left: 32 } },
  reduceMotion: false,
})
const subject = { block: CalendarBlock, layer }
const environment = makeCalendarEnvironment(() => ({ timeZone: 'UTC' }))

it.effect('repeated pointer observations keep the Calendar model and overlays settled', () =>
  Effect.gen(function* () {
    const prepared = yield* prepareCalendar({ id: 'observations' })
    const initial = yield* Story.story(
      subject,
      Story.init(prepared),
      Story.message(observed(measured)),
    )
    const transition = ComputeTransition({
      generation: 1,
      calendar: initial.calendar,
      action: Action.cases.HoverPreview.make({ ordinal: 10 }),
    })
    const completion = yield* transition.effect.pipe(Effect.provide(CalendarEffects))
    const nextTransition = ComputeTransition({
      generation: 3,
      calendar: completion.calendar,
      action: Action.cases.HoverPreview.make({ ordinal: 11 }),
    })
    const nextCompletion = yield* nextTransition.effect.pipe(Effect.provide(CalendarEffects))
    yield* Story.story(
      subject,
      Story.given(initial),
      Story.message(active(10)),
      Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
      Story.Command.resolve(transition, completion),
      Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
      Story.models(
        Story.steps(
          Story.message(observed(Observation.cases.NavActive.make({ key: null }))),
          Story.message(active(10)),
          Story.message(active(10)),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.models(Story.steps(Story.message(active(11))), (before, after) => {
        expect(before.working).toBe(false)
        expect(after.visual.active).toBe(11)
        expect(after.pending).toHaveLength(before.pending.length + 1)
        expect(after.visual.overlays[0]?.rect.left).toBe(32)
        expect(after.visual.overlays[0]?.key).toBe(before.visual.overlays[0]?.key)
      }),
      Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
      Story.Command.resolve(nextTransition, nextCompletion),
      Story.Command.resolve(ContinueQueue(), Message.ContinuedQueue()),
      Story.message(active(11, true)),
      Story.models(Story.steps(Story.message(active(11))), (before, after) => {
        expect(before.visual.focused).toBe(11)
        expect(after.visual.focused).toBeNull()
        expect(after.visual.overlays.find((slot) => slot.group === 'focus')?.present).toBe(false)
        expect(after.pending).toBe(before.pending)
        expect(after.calendar).toBe(before.calendar)
      }),
      Story.models(Story.steps(Story.message(active(11))), (before, after) => {
        expect(after).toBe(before)
      }),
      Story.Command.expectNone(),
    )
  }).pipe(Effect.provide(environment)),
)

it.effect(
  'unchanged measurements and stale exits are inert; resized overlay geometry is retained',
  () =>
    Effect.gen(function* () {
      const prepared = yield* prepareCalendar({ id: 'measurements' })
      yield* Story.story(
        subject,
        Story.init(prepared),
        Story.message(observed(measured)),
        Story.message(observed(Observation.cases.NavActive.make({ key: 'next:0' }))),
        Story.models(
          Story.steps(
            Story.message(
              observed(
                Observation.cases.Measured.make({
                  ...measured,
                  heights: { ...measured.heights },
                  rects: { '10': { ...rect }, '11': { ...rect, left: 32 } },
                  navRects: { 'next:0': { ...rect } },
                }),
              ),
            ),
            Story.message(observed(Observation.cases.Pressed.make({ value: false }))),
            Story.message(observed(Observation.cases.SnapReleased.make({}))),
            Story.message(observed(Observation.cases.PanelExited.make({ key: 'old-panel' }))),
            Story.message(
              observed(Observation.cases.OverlayExited.make({ key: 'old-overlay', generation: 2 })),
            ),
            Story.message(observed(Observation.cases.GhostSettled.make({ generation: 2 }))),
            Story.message(observed(Observation.cases.CommittedEndSettled.make({ generation: 2 }))),
          ),
          (before, after) => expect(after).toBe(before),
        ),
        Story.models(
          Story.steps(
            Story.message(
              observed(
                Observation.cases.Measured.make({
                  ...measured,
                  navRects: { 'next:0': { ...rect, width: 40 } },
                }),
              ),
            ),
          ),
          (before, after) => {
            expect(after.visual.overlays[0]?.rect.width).toBe(40)
            expect(after.visual.overlays[0]?.key).toBe(before.visual.overlays[0]?.key)
            expect(after.pending).toBe(before.pending)
          },
        ),
        Story.Command.expectNone(),
      )
    }).pipe(Effect.provide(environment)),
)
