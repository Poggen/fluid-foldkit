import { Schema } from 'effect'
import { defineInMessageUnion } from 'foldkit/message'
import { HoverMode } from './hover-observation.js'
import { HoverBlock } from './hover.js'
import { HoverHighlightBlock } from './hover-highlight.js'
import { SelectionBackgroundsBlock } from './selection-backgrounds.js'

const SnapKey = Schema.Union([Schema.String, Schema.Finite])
const Configuration = {
  selectedIndices: Schema.Array(Schema.Finite),
  heldHeadIndex: Schema.NullOr(Schema.Finite),
  hideHeadHighlight: Schema.Boolean,
  snapKey: Schema.optionalKey(SnapKey),
}
export const Model = Schema.Struct({
  id: Schema.String,
  selectedIndices: Schema.Array(Schema.Finite),
  heldHeadIndex: Schema.OptionFromNullOr(Schema.Finite),
  hideHeadHighlight: Schema.Boolean,
  snapKey: Schema.OptionFromNullOr(SnapKey),
  snapGeneration: Schema.Natural,
  snapping: Schema.Boolean,
  rulesGeneration: Schema.Natural,
  snapRules: Schema.Boolean,
  pressedHeadIndex: Schema.OptionFromNullOr(Schema.Finite),
  keyboardOwns: Schema.Boolean,
  lastPointer: Schema.OptionFromNullOr(Schema.Struct({ x: Schema.Finite, y: Schema.Finite })),
  repeating: Schema.Boolean,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
  headHover: HoverBlock.Model,
  headHighlight: HoverHighlightBlock.Model,
  selection: SelectionBackgroundsBlock.Model,
})
export type Model = typeof Model.Type
export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedConfigure: Configuration,
  RequestedHighlight: { index: Schema.NullOr(Schema.Finite) },
})
export const Config = Schema.Struct({
  id: Schema.String,
  hoverMode: Schema.optionalKey(HoverMode),
  selectedIndices: Schema.optionalKey(Configuration.selectedIndices),
  heldHeadIndex: Schema.optionalKey(Configuration.heldHeadIndex),
  hideHeadHighlight: Schema.optionalKey(Schema.Boolean),
  snapKey: Schema.optionalKey(SnapKey),
})
export type TableConfig = typeof Config.Type
