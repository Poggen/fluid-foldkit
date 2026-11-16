import { HoverMode } from './hover-observation.js'
import { constVoid } from 'effect/Function'
import { Clock, Effect, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { CalendarBlock } from './calendar.js'
import { Action, CalendarState, Event } from './calendar-state.js'
import { DatePickerAction, DatePickerEvent, DatePickerState } from './date-picker-state.js'
import type { DatePickerViewInputs } from './date-picker.js'
import type { CalendarEnvironment } from './calendar-environment.js'
import type { PopupAuthority } from './date-picker-popup-authority.js'
import { DatePickerPresentation } from './date-picker-config.js'
import { HoverBlock } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'
import { PresenceBlock } from './presence.js'
import { OpeningInteraction } from './date-picker-popup-definition.js'
import { PopupBlock } from './date-picker-popup.js'
import { TimeFieldBlock } from './date-picker-time.js'

export const Model = Schema.Struct({
  picker: DatePickerState,
  presentation: DatePickerPresentation,
  renderNow: Schema.Finite,
  segments: HoverBlock.Model,
  segmentHighlight: HoverHighlightBlock.Model,
  presets: HoverBlock.Model,
  presetHighlight: HoverHighlightBlock.Model,
  clear: PresenceBlock.Model,
  twoRows: Schema.Boolean,
  popup: PopupBlock.Model,
  calendar: CalendarBlock.Model,
  primaryTime: TimeFieldBlock.Model,
  endTime: TimeFieldBlock.Model,
  timeGeneration: Schema.Int,
})

export const Message = defineMessageUnion({
  Requested: { action: DatePickerAction },
  CalendarRequested: { action: Action },
  TriggeredOpen: {
    interaction: OpeningInteraction,
    open: Schema.Boolean,
    now: Schema.Finite,
    viewportWidth: Schema.NullOr(Schema.Finite),
  },
  RowsMeasured: { twoRows: Schema.Boolean },
  PresetFocused: { index: Schema.NullOr(Schema.Int) },
  CapturedTime: { generation: Schema.Int, now: Schema.Finite },
  Disposed: {},
})

export const Notice = Schema.TaggedUnion({
  Picker: { event: DatePickerEvent },
  Calendar: { event: Event },
})

export const OutMessage = defineMessageUnion({ Transitioned: { notices: Schema.Array(Notice) } })

export const InMessage = defineInMessageUnion({
  RequestedDensity: { compact: Schema.Boolean },
  RequestedHoverMode: { mode: HoverMode },
  RequestedAction: {
    action: Schema.Union([
      DatePickerAction.cases.CalendarSelected,
      DatePickerAction.cases.PresetSelected,
      DatePickerAction.cases.Cleared,
      DatePickerAction.cases.TimeCommitted,
      DatePickerAction.cases.StartCommitted,
      DatePickerAction.cases.EndCommitted,
      DatePickerAction.cases.AckElapsed,
      DatePickerAction.cases.MonthChanged,
      DatePickerAction.cases.Accepted,
      DatePickerAction.cases.Disposed,
    ]),
  },
  RequestedOpen: {
    open: Schema.Boolean,
    now: Schema.Finite,
    viewportWidth: Schema.NullOr(Schema.Finite),
  },
  RequestedCalendar: { action: Action },
  RequestedConfigure: { presentation: DatePickerPresentation, calendarRevision: Schema.Int },
})

export const DatePickerKey = Symbol('DatePicker')

export const DatePickerBlock = Block.make('DatePicker', {
  key: DatePickerKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      initial: DatePickerState,
      calendar: Schema.Struct({ initial: CalendarState }),
      presentation: DatePickerPresentation,
      now: Schema.Finite,
    }),
  ]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<DatePickerViewInputs>() },
  effects: Block.makeEffectsContract<never, CalendarEnvironment | PopupAuthority>(),
  inMessageOutputs: {
    RequestedAction: { outMessage: OutMessage.Transitioned },
    RequestedOpen: { outMessage: OutMessage.Transitioned },
  },
})

export const TriggerResource = DatePickerBlock.makeMountStream('DateTrigger', {
  messages: [Message.TriggeredOpen],
  *handler() {
    const clock = yield* Clock.Clock

    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.TriggeredOpen.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const window = element.ownerDocument.defaultView

                    if (window === null || !(element instanceof window.HTMLElement)) {
                      return constVoid
                    }

                    const click = (event: MouseEvent) => {
                      let interaction: 'touch' | 'pen' | 'keyboard' | 'mouse' = 'mouse'

                      if (event instanceof window.PointerEvent && event.pointerType === 'touch') {
                        interaction = 'touch'
                      } else if (
                        event instanceof window.PointerEvent &&
                        event.pointerType === 'pen'
                      ) {
                        interaction = 'pen'
                      } else if (event.detail === 0) {
                        interaction = 'keyboard'
                      }

                      Queue.offerUnsafe(
                        queue,
                        Message.TriggeredOpen({
                          interaction,
                          open: (element.dataset.pickerOpen ?? null) !== 'true',
                          now: clock.currentTimeMillisUnsafe(),
                          viewportWidth: window.innerWidth,
                        }),
                      )
                    }

                    element.addEventListener('click', click)

                    return () => {
                      element.removeEventListener('click', click)
                    }
                  }),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})

export const SampleTime = DatePickerBlock.makeCommand('SampleTime', {
  args: { generation: Schema.Int },
  messages: [Message.CapturedTime],
  *handler() {
    const clock = yield* Clock.Clock

    return ({ generation }) =>
      Effect.sync(() => Message.CapturedTime({ generation, now: clock.currentTimeMillisUnsafe() }))
  },
})

export const subscriptions = DatePickerBlock.makeSubscriptions((entry) => ({
  acknowledgement: entry(
    'PickAcknowledgement',
    { generation: Schema.Int },
    {
      messages: [Message.Requested],
      when: (model) => model.picker.ackPending,
      modelToDependencies: (model) => ({ generation: model.picker.ackGeneration }),
      *handler() {
        return ({ generation }) =>
          Stream.fromEffect(
            Effect.sleep(200).pipe(
              Effect.as(
                Message.Requested({
                  action: DatePickerAction.cases.AckElapsed.make({ generation }),
                }),
              ),
            ),
          )
      },
    },
  ),
}))
