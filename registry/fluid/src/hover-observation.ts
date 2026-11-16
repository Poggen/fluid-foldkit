import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { HoverRowLayout } from './hover-layout.js'

import { Rect, IndexedGeometry } from './lib/indexed-geometry.js'

export { Rect } from './lib/indexed-geometry.js'

export const HoverMode = Schema.Literals(['fluid', 'standard'])
export type HoverMode = typeof HoverMode.Type

export const Index = Schema.NullOr(Schema.Finite)

const Point = Schema.Struct({ x: Schema.Finite, y: Schema.Finite })

export const Options = Schema.Struct({
  axis: Schema.Literals(['x', 'y', 'xy']),
  nearest: Schema.Boolean,
  gapClick: Schema.Boolean,
  maxDistance: Schema.NullOr(Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))),
})

export interface HoverOptions {
  readonly axis: 'x' | 'y' | 'xy'
  readonly nearest: boolean
  readonly gapClick: boolean
  readonly maxDistance: number
}

export const toModelOptions = (options: HoverOptions): typeof Options.Type =>
  Options.make({
    ...options,
    maxDistance: options.maxDistance === Infinity ? null : options.maxDistance,
  })

export const Snapshot = Schema.Struct({
  activeIndex: Index,
  session: Schema.Finite,
  itemRects: IndexedGeometry,
  isMeasured: Schema.Boolean,
})

export type HoverSnapshot = Schema.Schema.Type<typeof Snapshot>

/** DOM observations contain measurements and containment, never selection policy. */
export const observationFields = {
  PointerEntered: {},
  PointerLeft: {},
  PointerMoved: {
    point: Point,
    containerRect: Rect,
    scroll: Point,
    border: Point,
    layoutSize: Schema.Struct({ width: Schema.Finite, height: Schema.Finite }),
    targetIndices: Schema.Array(Schema.Finite),
    disabledIndices: Schema.Array(Schema.Finite),
  },
  Registered: { indices: Schema.Array(Schema.Finite) },
  Measured: {
    itemRects: IndexedGeometry,
    ready: Schema.Boolean,
    rowLayout: Schema.optionalKey(HoverRowLayout),
  },
  Clicked: {
    point: Point,
    targetIsItem: Schema.Boolean,
    targetIsControl: Schema.Boolean,
    items: Schema.Array(
      Schema.Struct({ index: Schema.Finite, disabled: Schema.Boolean, rect: Rect }),
    ),
  },
}

export const HoverObservation = defineMessageUnion(observationFields)
