import { HoverMode } from './hover-observation.js'
import { VisualState, Observation } from './calendar-view/state.js'
import { Effect, Layer, Schema } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { CalendarEnvironment } from './calendar-environment.js'
import {
  Action,
  CalendarPresentation,
  CalendarState,
  DateValue,
  Event,
  SelectionControl,
} from './calendar-state.js'
import type { CalendarViewInputs } from './calendar-view/contracts.js'
import { transitionCalendar } from './calendar-transition.js'

export const Model = Schema.Struct({
  calendar: CalendarState,
  visual: VisualState,
  pending: Schema.Array(Action),
  working: Schema.Boolean,
  generation: Schema.Int,
})

export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Mounted: {},
  VisualObserved: { observation: Observation },
  Requested: { action: Action },
  CompletedTransition: {
    generation: Schema.Int,
    calendar: CalendarState,
    events: Schema.Array(Event),
    focus: Schema.NullOr(Schema.Finite),
  },
  CompletedFocus: {},
  ContinuedQueue: {},
  Disposed: {},
})

export const OutMessage = Schema.TaggedUnion({
  Transitioned: { events: Schema.Array(Event) },
})

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedAction: { action: Action },
  RequestedOccurrenceFocus: {},
  RequestedPresentation: { presentation: CalendarPresentation },
  RequestedSynchronization: {
    selection: SelectionControl,
    month: Schema.NullOr(DateValue),
    controlledMonth: Schema.Boolean,
    presentation: CalendarPresentation,
    occurrenceFocus: Schema.Boolean,
  },
  RequestedRefresh: { revision: Schema.Int },
  RequestedAcceptance: {
    selection: SelectionControl,
    month: Schema.NullOr(DateValue),
    controlledMonth: Schema.Boolean,
  },
  RequestedEscape: {},
})

export const CalendarKey = Symbol('Calendar')

export const CalendarBlock = Block.make('Calendar', {
  key: CalendarKey,
  InitArgs: Schema.Tuple([Schema.Struct({ initial: CalendarState })]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<CalendarViewInputs>() },
  effects: Block.makeEffectsContract<never, CalendarEnvironment>(),
})

export const ComputeTransition = CalendarBlock.makeCommand('ComputeTransition', {
  args: { generation: Schema.Int, calendar: CalendarState, action: Action },
  messages: [Message.CompletedTransition],
  *handler() {
    const environment = yield* CalendarEnvironment

    return ({ generation, calendar, action }) =>
      Effect.sync(() => {
        const result = transitionCalendar(
          calendar,
          action,
          environment.rulesFor(
            calendar.id,
            Action.isAnyOf(['Refreshed'])(action) ? action.revision : calendar.revision,
            Action.isAnyOf(['Presented', 'Synchronized'])(action)
              ? action.presentation
              : calendar.presentation,
          ),
        )

        return Message.CompletedTransition({
          generation,
          calendar: result.state,
          events: result.events,
          focus: result.focus,
        })
      })
  },
})

export const FocusDay = CalendarBlock.makeCommand('FocusDay', {
  args: { id: Schema.String, date: Schema.Finite },
  messages: [Message.CompletedFocus],
  *handler() {
    return ({ id, date }) =>
      Dom.focus(
        `#${CSS.escape(id)} [data-calendar-panel][data-calendar-present="true"]:not([inert]) [data-calendar-date="${date}"][data-calendar-outside="false"] button[data-calendar-button]`,
        { preventScroll: true },
      ).pipe(Effect.ignore, Effect.as(Message.CompletedFocus()))
  },
})

export const ContinueQueue = CalendarBlock.makeCommand('ContinueQueue', {
  messages: [Message.ContinuedQueue],
  *handler() {
    return () => Effect.succeed(Message.ContinuedQueue())
  },
})

export const CalendarEffects = Layer.mergeAll(
  ComputeTransition.layer,
  FocusDay.layer,
  ContinueQueue.layer,
)
