import { Schema } from 'effect'
import { GraceObservation, Point } from './base-grace.js'
import { Side } from './domain.js'
import { TransferGeometry } from './group-visual.js'
import { defineMessageUnion } from 'foldkit/message'

export const Observation = defineMessageUnion({
  MeasuredTransfer: {
    generation: Schema.Natural,
    connected: Schema.Boolean,
    fromSide: Side,
    toSide: Side,
    geometry: TransferGeometry,
  },
  PlacedGroup: { generation: Schema.Natural, side: Side },
  CompletedTransfer: { generation: Schema.Natural },
  StartedBaseGrace: { origin: Point, side: Side, observation: GraceObservation },
  MovedInBaseGrace: { observation: GraceObservation },
  CompletedBaseGraceWait: { generation: Schema.Natural, hasOpenChild: Schema.Boolean },
  WindowBlurred: {},
  CompletedWait: { generation: Schema.Natural },
  CancelledWait: {},
  ClearedGrace: {},
  Mounted: {},
  Unmounted: {},
  NestedHover: { nested: Schema.Boolean, pointerType: Schema.String },
  Entered: { pointerType: Schema.String },
  Moved: { pointerType: Schema.String, movementSquared: Schema.Number },
  Left: {},
  Focused: { focusVisible: Schema.Boolean },
  BlurStarted: {},
  Blurred: { remainsInBranch: Schema.Boolean },
  Pressed: {},
  Clicked: {},
  Escaped: {},
  Dismissed: { reason: Schema.String },
  CompletedExit: { generation: Schema.Natural },
  CompletedAnimation: { generation: Schema.Natural },
})

export type Observation = typeof Observation.Type

export type TriggerObservation = Extract<
  Observation,
  {
    readonly _tag:
      | 'Mounted'
      | 'NestedHover'
      | 'Entered'
      | 'Moved'
      | 'Left'
      | 'Focused'
      | 'BlurStarted'
      | 'Blurred'
      | 'Pressed'
      | 'Clicked'
      | 'Escaped'
      | 'StartedBaseGrace'
      | 'MovedInBaseGrace'
      | 'WindowBlurred'
  }
>

export type PopupObservation = Extract<
  Observation,
  {
    readonly _tag:
      | 'MeasuredTransfer'
      | 'PlacedGroup'
      | 'CompletedTransfer'
      | 'CompletedAnimation'
      | 'StartedBaseGrace'
      | 'MovedInBaseGrace'
      | 'Dismissed'
      | 'Escaped'
  }
>
