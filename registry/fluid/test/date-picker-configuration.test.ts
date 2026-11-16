import { it } from '@effect/vitest'
import { DateTime, Effect } from 'effect'
import { TestClock } from 'effect/testing'
import { Story } from 'foldkit'
import { expect, vi } from 'vitest'
import { DatePickerBlock, layer } from '../src/date-picker.js'
import { RawPrimaryTime } from '../src/date-picker-bindings.js'
import { TimeFieldBlock } from '../src/date-picker-time.js'
import { HoverBlock, test as hoverTest } from '../src/hover.js'
import { DatePickerPresentation, prepareDatePicker } from '../src/date-picker-config.js'
import { Message, SampleTime } from '../src/date-picker-definition.js'
import { makeCalendarEnvironment } from '../src/calendar-environment.js'
import { Action, dateValue } from '../src/calendar-state.js'
import {
  CalendarEffects,
  ComputeTransition,
  ContinueQueue,
  FocusDay,
  Message as CalendarMessage,
} from '../src/calendar-definition.js'

const subject = { block: DatePickerBlock, layer }
const now = DateTime.toEpochMillis(
  DateTime.makeZonedUnsafe(
    { year: 2026, month: 11, day: 12, hour: 10, minute: 14, second: 20 },
    { timeZone: DateTime.zoneMakeLocal(), adjustForTimeZone: true },
  ),
)
const presentation = DatePickerPresentation.make({
  hoverMode: 'fluid',
  compact: false,
  disabled: false,
  variant: 'outline',
  orientation: 'auto',
  numberOfMonths: 1,
  cellSize: null,
  showWeekNumber: false,
  locale: 'en-US',
  hourCycle: 24,
  step: 15,
  triggerId: null,
  placeholder: null,
  name: null,
  ariaLabel: null,
  clearable: true,
  className: '',
  required: false,
  min: 0,
  max: 0,
  presets: [],
})
const environment = makeCalendarEnvironment(() => ({ timeZone: 'UTC' }))

const calendarReplies = (initial: typeof DatePickerBlock.Model.Type, refresh = true) =>
  Effect.gen(function* () {
    const synchronization = Action.cases.Synchronized.make({
      selection: initial.calendar.calendar.selection,
      month: initial.picker.month,
      controlledMonth: initial.picker.month !== null,
      presentation: initial.calendar.calendar.presentation,
      occurrenceFocus: false,
    })
    const first = yield* ComputeTransition({
      generation: 1,
      calendar: initial.calendar.calendar,
      action: refresh ? Action.cases.Refreshed.make({ revision: 0 }) : synchronization,
    }).effect.pipe(Effect.provide(CalendarEffects))
    const second = refresh
      ? yield* ComputeTransition({
          generation: 3,
          calendar: first.calendar,
          action: synchronization,
        }).effect.pipe(Effect.provide(CalendarEffects))
      : undefined
    return Story.steps(
      Story.Command.resolve(ComputeTransition, first),
      ...(first.focus === null
        ? []
        : [Story.Command.resolve(FocusDay, CalendarMessage.CompletedFocus())]),
      Story.Command.resolve(ContinueQueue, CalendarMessage.ContinuedQueue()),
      ...(second === undefined
        ? []
        : [
            Story.Command.resolve(ComputeTransition, second),
            ...(second.focus === null
              ? []
              : [Story.Command.resolve(FocusDay, CalendarMessage.CompletedFocus())]),
            Story.Command.resolve(ContinueQueue, CalendarMessage.ContinuedQueue()),
          ]),
    )
  })

for (const offset of [1000, 60000]) {
  it.effect(
    `density changes avoid time formatting while a ${offset}ms clock sample stays current`,
    () =>
      Effect.gen(function* () {
        yield* TestClock.setTime(now)
        const prepared = yield* prepareDatePicker({ id: 'density-clock', time: null }, presentation)
        const initial = yield* Story.story(
          subject,
          Story.init(prepared),
          Story.messageIn(
            RawPrimaryTime,
            TimeFieldBlock.Message.Requested({
              action: { _tag: 'Typed', value: '11:' },
            }),
          ),
          Story.Command.resolve(hoverTest.ControlHover, HoverBlock.Message.CompletedControl()),
          Story.Command.expectNone(),
        )
        const settleCalendar = yield* calendarReplies(initial)
        // Pass-through instrumentation counts actual formatting constructors; no result is faked.
        const formats = vi.spyOn(Intl, 'DateTimeFormat')
        try {
          yield* Story.story(
            subject,
            Story.given(initial),
            Story.inMessage(
              DatePickerBlock.InMessage.RequestedConfigure({
                presentation: { ...presentation, compact: true },
                calendarRevision: 0,
              }),
            ),
            Story.model((model) => {
              expect(model.presentation.compact).toBe(true)
              expect(model.primaryTime.field.draft).toBe('11:')
              expect(model.primaryTime.field.open).toBe(true)
              expect(model.primaryTime.field.activeIndex).toBe(
                initial.primaryTime.field.activeIndex,
              )
              expect(model.primaryTime.field.config).toEqual(initial.primaryTime.field.config)
              expect(model.endTime.field.config).toEqual(initial.endTime.field.config)
              expect(formats).not.toHaveBeenCalled()
            }),
            Story.Command.expectHas(SampleTime({ generation: 1 }), ComputeTransition),
            Story.models(
              Story.steps(
                Story.inMessage(DatePickerBlock.InMessage.RequestedDensity({ compact: false })),
                Story.inMessage(DatePickerBlock.InMessage.RequestedDensity({ compact: true })),
                Story.inMessage(DatePickerBlock.InMessage.RequestedDensity({ compact: true })),
              ),
              (before, after) => {
                expect(after.calendar).toEqual(before.calendar)
                expect(after.picker).toEqual(before.picker)
                expect(after.popup).toEqual(before.popup)
                expect(after.primaryTime).toEqual(before.primaryTime)
                expect(after.endTime).toEqual(before.endTime)
                expect(after.timeGeneration).toBe(before.timeGeneration)
                expect(after.renderNow).toBe(before.renderNow)
                expect(formats).not.toHaveBeenCalled()
              },
            ),
            Story.Command.resolve(
              SampleTime({ generation: 1 }),
              Message.CapturedTime({ generation: 1, now: now + offset }),
            ),
            Story.model((model) => {
              expect(model.renderNow).toBe(now + offset)
              expect(model.primaryTime.field.draft).toBe('11:')
              expect(model.primaryTime.field.config.fallback).toBe(offset < 60000 ? 614 : 615)
              expect(model.endTime.field.config.slots[0]?.minutes).toBe(offset < 60000 ? 615 : 630)
              if (offset < 60000) expect(formats).not.toHaveBeenCalled()
              else expect(formats).toHaveBeenCalled()
            }),
            // Older clock results cannot undo the latest generation or time-list configuration.
            Story.message(Message.CapturedTime({ generation: 0, now: now + 120000 })),
            Story.model((model) => expect(model.renderNow).toBe(now + offset)),
            settleCalendar,
            Story.Command.expectNone(),
          )
        } finally {
          formats.mockRestore()
        }
      }).pipe(Effect.provide(environment)),
  )
}

it.effect('format and interval changes reconfigure both time lists through the real owner', () =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now)
    const prepared = yield* prepareDatePicker({ id: 'format-change', time: null }, presentation)
    const initial = yield* Story.story(subject, Story.init(prepared), Story.Command.expectNone())
    const settleCalendar = yield* calendarReplies(initial)
    yield* Story.story(
      subject,
      Story.given(initial),
      Story.inMessage(
        DatePickerBlock.InMessage.RequestedConfigure({
          presentation: { ...presentation, step: 30, hourCycle: 12, disabled: true },
          calendarRevision: 0,
        }),
      ),
      Story.model((model) => {
        expect(model.primaryTime.field.config.slots).toHaveLength(48)
        expect(model.primaryTime.field.config.slots[0]?.label).toBe('12:00 AM')
        expect(model.endTime.field.config.slots[0]?.minutes).toBe(630)
        expect(model.endTime.field.config.slots[0]?.label).toBe('10:30 AM')
        expect(model.primaryTime.field.config.disabled).toBe(true)
        expect(model.endTime.field.config.disabled).toBe(true)
      }),
      Story.Command.resolve(
        SampleTime({ generation: 1 }),
        Message.CapturedTime({ generation: 1, now }),
      ),
      settleCalendar,
      Story.Command.expectNone(),
    )
  }).pipe(Effect.provide(environment)),
)

it.effect('committing a range start updates the dependent end slots and preserves duration', () =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now)
    const prepared = yield* prepareDatePicker(
      {
        id: 'range-start',
        mode: 'range',
        defaultTimeRange: { start: '10:00', end: '11:00' },
      },
      presentation,
    )
    const initial = yield* Story.story(subject, Story.init(prepared), Story.Command.expectNone())
    const settleCalendar = yield* calendarReplies(initial, false)
    yield* Story.story(
      subject,
      Story.given(initial),
      Story.messageIn(
        RawPrimaryTime,
        TimeFieldBlock.Message.Requested({
          action: { _tag: 'Picked', index: 42 },
        }),
      ),
      Story.model((model) => {
        expect(model.picker.timeRange).toEqual({ start: '10:30', end: '11:30' })
        expect(model.primaryTime.field.config.value).toBe(630)
        expect(model.endTime.field.config.value).toBe(690)
        expect(model.endTime.field.config.slots[0]?.minutes).toBe(645)
        expect(model.endTime.field.config.slots[0]?.duration).toBe(15)
      }),
      Story.Command.resolve(
        SampleTime({ generation: 1 }),
        Message.CapturedTime({ generation: 1, now }),
      ),
      settleCalendar,
      Story.Command.expectNone(),
    )
  }).pipe(Effect.provide(environment)),
)

it.effect('density preserves an open time draft without scheduling data or clock work', () =>
  Effect.gen(function* () {
    yield* TestClock.setTime(now)
    const prepared = yield* prepareDatePicker(
      { id: 'density-only', time: null, defaultOpen: true },
      presentation,
    )
    const initial = yield* Story.story(
      subject,
      Story.init(prepared),
      Story.messageIn(
        RawPrimaryTime,
        TimeFieldBlock.Message.Requested({ action: { _tag: 'Typed', value: '11:' } }),
      ),
      Story.Command.resolve(hoverTest.ControlHover, HoverBlock.Message.CompletedControl()),
      Story.Command.expectNone(),
    )
    yield* TestClock.setTime(now + 60000)
    yield* Story.story(
      subject,
      Story.given(initial),
      Story.inMessage(DatePickerBlock.InMessage.RequestedDensity({ compact: true })),
      Story.model((model) => {
        expect(model.presentation.compact).toBe(true)
        expect(model.primaryTime.field.draft).toBe('11:')
        expect(model.primaryTime.field.open).toBe(true)
        expect(model.primaryTime).toEqual(initial.primaryTime)
        expect(model.endTime).toEqual(initial.endTime)
        expect(model.calendar).toEqual(initial.calendar)
        expect(model.picker).toEqual(initial.picker)
        expect(model.popup).toEqual(initial.popup)
        expect(model.timeGeneration).toBe(initial.timeGeneration)
        expect(model.renderNow).toBe(now)
      }),
      Story.Command.expectNone(),
    )
  }).pipe(Effect.provide(environment)),
)

for (const { compact, cellSize, layout } of [
  { compact: true, cellSize: null, layout: 'horizontal' },
  { compact: false, cellSize: null, layout: 'vertical' },
  { compact: true, cellSize: 36, layout: 'vertical' },
] as const) {
  it.effect(
    `opening after density ${compact} with cell size ${cellSize} uses ${layout} geometry`,
    () =>
      Effect.gen(function* () {
        yield* TestClock.setTime(now)
        const prepared = yield* prepareDatePicker(
          { id: 'density-opening', mode: 'range' },
          { ...presentation, compact: !compact, numberOfMonths: 2, cellSize },
        )
        const initial = yield* Story.story(
          subject,
          Story.init(prepared),
          Story.Command.expectNone(),
        )
        const openedAt = now + 60000
        const month = dateValue(DateTime.toDateUtc(DateTime.makeUnsafe(openedAt)))
        const completed = yield* ComputeTransition({
          generation: 1,
          calendar: initial.calendar.calendar,
          action: Action.cases.Synchronized.make({
            selection: initial.calendar.calendar.selection,
            month,
            controlledMonth: true,
            presentation: { ...initial.calendar.calendar.presentation, orientation: layout },
            occurrenceFocus: true,
          }),
        }).effect.pipe(Effect.provide(CalendarEffects))
        yield* Story.story(
          subject,
          Story.given(initial),
          Story.inMessage(DatePickerBlock.InMessage.RequestedDensity({ compact })),
          Story.Command.expectNone(),
          Story.inMessage(
            DatePickerBlock.InMessage.RequestedOpen({
              open: true,
              now: openedAt,
              viewportWidth: 540,
            }),
          ),
          Story.model((model) => {
            expect(model.picker.open).toBe(true)
            expect(model.picker.layout).toBe(layout)
            expect(model.picker.month).toEqual(month)
            expect(model.renderNow).toBe(openedAt)
          }),
          Story.Command.resolve(ComputeTransition, completed),
          ...(completed.focus === null
            ? []
            : [Story.Command.resolve(FocusDay, CalendarMessage.CompletedFocus())]),
          Story.Command.resolve(ContinueQueue, CalendarMessage.ContinuedQueue()),
          Story.Command.expectNone(),
        )
      }).pipe(Effect.provide(environment)),
  )
}
