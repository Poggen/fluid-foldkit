import { Schema } from 'effect'
import { HoverBlock } from '@foldkit-visuals/fluid/hover'

const fields = HoverBlock.Model.fields

export const ObservedHover = Schema.Struct({
  activeIndex: fields.activeIndex,
  session: fields.session,
  isMeasured: fields.isMeasured,
  itemRects: fields.itemRects,
})
export type ObservedHover = typeof ObservedHover.Type

export const decodeSnapshot = Schema.decodeUnknownSync(Schema.fromJsonString(ObservedHover))
