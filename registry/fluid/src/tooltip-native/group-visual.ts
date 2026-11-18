import { Option, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const GroupPresentation = Schema.Literals(['independent', 'morph'])
export type GroupPresentation = typeof GroupPresentation.Type
export const GroupSide = Schema.Literals(['top', 'right', 'bottom', 'left'])
export type GroupSide = typeof GroupSide.Type
export const TransferGeometry = Schema.Struct({
  left: Schema.Finite,
  right: Schema.Finite,
  top: Schema.Finite,
  bottom: Schema.Finite,
  rideX: Schema.Finite,
  rideY: Schema.Finite,
})
export type TransferGeometry = typeof TransferGeometry.Type
export const GroupVisual = defineTaggedUnion({
  Empty: { generation: Schema.Natural },
  Shown: { key: Schema.String, generation: Schema.Natural },
  Holding: { key: Schema.String, generation: Schema.Natural },
  Transferring: {
    from: Schema.String,
    to: Schema.String,
    generation: Schema.Natural,
    geometry: Schema.Option(TransferGeometry),
  },
  Exiting: { key: Schema.String, generation: Schema.Natural },
})
export type GroupVisual = typeof GroupVisual.Type

export const visualOwner: (visual: GroupVisual) => string | undefined = (visual: GroupVisual) =>
  visual._tag === 'Empty'
    ? undefined
    : visual._tag === 'Transferring'
      ? Option.isSome(visual.geometry)
        ? visual.to
        : visual.from
      : visual.key

export const GroupPaint = defineTaggedUnion({
  Shown: { generation: Schema.Natural },
  Holding: { generation: Schema.Natural },
  Measuring: { generation: Schema.Natural, from: Schema.String },
  Gliding: { generation: Schema.Natural, geometry: TransferGeometry },
  Exiting: { generation: Schema.Natural },
})
export type GroupPaint = typeof GroupPaint.Type

export const groupPaint: (
  visual: GroupVisual,
  key: string,
  open: boolean,
  generation: number,
) => GroupPaint = (visual: GroupVisual, key: string, open: boolean, generation: number) => {
  if (visual._tag === 'Transferring') {
    if (visual.to === key)
      return Option.match(visual.geometry, {
        onNone: () => GroupPaint.Measuring({ generation: visual.generation, from: visual.from }),
        onSome: (geometry) => GroupPaint.Gliding({ generation: visual.generation, geometry }),
      })
    if (visual.from === key && Option.isNone(visual.geometry))
      return GroupPaint.Holding({ generation: visual.generation })
  }
  if (visual._tag === 'Holding' && visual.key === key)
    return GroupPaint.Holding({ generation: visual.generation })
  return open
    ? GroupPaint.Shown({
        generation: visual._tag === 'Shown' && visual.key === key ? visual.generation : generation,
      })
    : GroupPaint.Exiting({ generation })
}
