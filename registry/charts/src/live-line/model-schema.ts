import { Schema } from 'effect'
import { PlannerRow } from './input'

export const LiveRowSchema = PlannerRow

const Pair = Schema.Tuple([Schema.NumberFromString, Schema.NumberFromString])

const MutablePair = Schema.mutable(Pair)

const YAxis = Schema.Struct({
  kind: Schema.Literal('liveYAxis'),
  props: Schema.Struct({
    minGap: Schema.NumberFromString,
    position: Schema.Literals(['left', 'right']),
    allowDecimals: Schema.Boolean,
  }),
})

export const LogicalProps = Schema.Struct({
  data: Schema.Array(LiveRowSchema),
  value: Schema.NumberFromString,
  dataKey: Schema.String,
  window: Schema.NumberFromString,
  numXTicks: Schema.NumberFromString,
  nowOffsetUnits: Schema.NumberFromString,
  exaggerate: Schema.Boolean,
  lerpSpeed: Schema.NumberFromString,
  paused: Schema.Boolean,
  margin: Schema.Struct({
    top: Schema.NumberFromString,
    right: Schema.NumberFromString,
    bottom: Schema.NumberFromString,
    left: Schema.NumberFromString,
  }),
  style: Schema.Struct({ height: Schema.NumberFromString }),
  children: Schema.Array(YAxis),
})

export type LogicalProps = Schema.Schema.Type<typeof LogicalProps>

export const ConfigurationSchema = Schema.Struct({ props: LogicalProps })

const Roll = Schema.Struct({
  x: Schema.NumberFromString,
  s: Schema.NumberFromString,
  t: Schema.NumberFromString,
  d: Schema.NumberFromString,
  ak: Schema.NumberFromString,
  xa: Schema.NumberFromString,
  b0: Schema.NumberFromString,
})

const Frame = Schema.Struct({
  rows: Schema.Array(
    Schema.Struct({
      key: Schema.String,
      t: Schema.NumberFromString,
      v: Schema.NumberFromString,
      pad: Schema.Boolean,
    }),
  ),
  xDomain: Pair,
  yDomain: Pair,
  areaFloor: Schema.NumberFromString,
  tip: Schema.UndefinedOr(
    Schema.Struct({ t: Schema.NumberFromString, v: Schema.NumberFromString }),
  ),
  momentum: Schema.Literals(['up', 'down', 'flat']),
  rollMs: Schema.NumberFromString,
  seed: Schema.Boolean,
  intro: Schema.Boolean,
  disp0: Schema.NumberFromString,
  parity: Schema.NumberFromString,
  roll: Roll,
  jump: Schema.Boolean,
  dy: Schema.NumberFromString,
  k: Schema.NumberFromString,
  yTarget: Pair,
  interval: Schema.NumberFromString,
})

const RollClock = Schema.Struct({
  x: Schema.NumberFromString,
  s: Schema.NumberFromString,
  t: Schema.NumberFromString,
  dur: Schema.NumberFromString,
  ease: Schema.Union([
    Schema.Struct({ kind: Schema.Literal('linear') }),
    Schema.Struct({
      kind: Schema.Literal('intro'),
      lerp: Schema.NumberFromString,
      durationMs: Schema.NumberFromString,
    }),
  ]),
  at: Schema.NullOr(Schema.NumberFromString),
})

const FrameState = Schema.Struct({
  slots: Schema.NumberFromString,
  interval: Schema.NumberFromString,
  windowSecs: Schema.NumberFromString,
  y: Schema.NullOr(MutablePair),
  drawn: Schema.NullOr(MutablePair),
  seedY: Schema.NullOr(MutablePair),
  jump: Schema.Boolean,
  ry: Schema.Struct({ s: Schema.NumberFromString, t: Schema.NumberFromString }),
  x0: Schema.NullOr(Schema.NumberFromString),
  roll: Schema.NullOr(RollClock),
  floor: Schema.NullOr(Schema.NumberFromString),
  stamp: Schema.NumberFromString,
  introIdentity: Schema.NullOr(Schema.String),
  last: Schema.NullOr(Frame),
  newest: Schema.NullOr(Schema.String),
  disp: Schema.NumberFromString,
  target: Schema.NumberFromString,
  dispStamp: Schema.NumberFromString,
  arrival: Schema.NumberFromString,
  parity: Schema.NumberFromString,
  tipAt: Schema.NullOr(Schema.NumberFromString),
})

export const StateSchema = Schema.Struct({
  state: FrameState,
  pick: Schema.Struct({
    range: Schema.NumberFromString,
    interval: Schema.NumberFromString,
    commit: Schema.NumberFromString,
    raw: Schema.NullOr(MutablePair),
  }),
  frame: Schema.NullOr(Frame),
  revision: Schema.NumberFromString,
  width: Schema.NumberFromString,
  introStarted: Schema.Boolean,
  follow: Schema.Boolean,
  labelDomain: Pair,
  labelValues: Schema.Array(Schema.NumberFromString),
  leavingLabels: Schema.Array(Schema.NumberFromString),
  labelInterval: Schema.NumberFromString,
  clockActive: Schema.Boolean,
  timeOrigin: Schema.NullOr(Schema.Finite),
})
