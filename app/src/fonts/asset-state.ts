import { Schema } from 'effect'
import { GoogleFont } from './catalogue'
export const FontAsset = Schema.Union([
  Schema.TaggedStruct('Idle', {}),
  Schema.TaggedStruct('Preparing', { revision: Schema.Natural }),
  Schema.TaggedStruct('Stylesheet', { revision: Schema.Natural, font: GoogleFont }),
  Schema.TaggedStruct('Loading', { revision: Schema.Natural, font: GoogleFont }),
  Schema.TaggedStruct('Ready', { revision: Schema.Natural, font: GoogleFont }),
  Schema.TaggedStruct('Failed', { revision: Schema.Natural, message: Schema.String }),
])
export type FontAsset = typeof FontAsset.Type
export const fontAssetFamily = (asset: FontAsset) => ('font' in asset ? asset.font : undefined)
