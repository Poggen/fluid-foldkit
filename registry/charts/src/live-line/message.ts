import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { PlannerRow as Row } from './input'

export const ClockObservation = Schema.Struct({
  timeOrigin: Schema.Finite,
  now: Schema.Finite,
  wallNow: Schema.Finite,
  timelineNow: Schema.Finite,
  displayFrameMs: Schema.Finite,
})

export const Tooltip = Schema.NullOr(
  Schema.Struct({
    time: Schema.Finite,
    value: Schema.NumberFromString,
    x: Schema.Finite,
    y: Schema.Finite,
    pinned: Schema.Boolean,
  }),
)

export const Cursor = Schema.NullOr(
  Schema.Struct({
    key: Schema.String,
    t: Schema.Finite,
    v: Schema.NumberFromString,
    x: Schema.Finite,
    y: Schema.Finite,
    index: Schema.Int,
  }),
)

export const Focus = Schema.Struct({ cursor: Cursor })

export const Message = defineMessageUnion({
  CompletedInput: { generation: Schema.Int, identity: Schema.String, data: Schema.Array(Row) },
  ObservedFocus: Focus.fields,
  ObservedSize: { size: Schema.Finite },
  ObservedClock: ClockObservation.fields,
  ObservedTooltip: { tooltip: Tooltip },
  CompletedPrepare: {},
  CompletedMount: {},
  Unmounted: {},
})
