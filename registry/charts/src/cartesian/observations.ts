import { Schema } from 'effect'

export const FocusObservation = Schema.Struct({
  index: Schema.NullOr(Schema.Int),
  seriesIndex: Schema.optionalKey(Schema.NullOr(Schema.Int)),
})

export const KeyboardObservation = Schema.Struct({
  key: Schema.Literals([
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    'Escape',
  ]),
})

export const DragObservation = Schema.Struct({
  kind: Schema.Literals(['start', 'move', 'end']),
  x: Schema.Finite,
  index: Schema.Int,
})

export type DragObservation = typeof DragObservation.Type

export const SweepObservation = Schema.Struct({
  kind: Schema.Literals(['mounted', 'cycle', 'removed']),
  generation: Schema.Int,
  seriesId: Schema.String,
})

export type SweepObservation = typeof SweepObservation.Type

export const PhaseTimingObservation = Schema.Struct({
  generation: Schema.Int,
  elapsed: Schema.NullOr(Schema.Finite),
  at: Schema.Finite,
})

export type PhaseTimingObservation = typeof PhaseTimingObservation.Type
