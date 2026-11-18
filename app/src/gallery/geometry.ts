import { Schema } from 'effect'
import type { ResolvedSettings } from '../settings'

export const PreviewHeight = Schema.Struct({
  width: Schema.Finite,
  layout: Schema.String,
  height: Schema.Finite,
})
export type PreviewHeight = typeof PreviewHeight.Type
export const PreviewHeights = Schema.Record(Schema.String, PreviewHeight)
export type PreviewHeights = typeof PreviewHeights.Type
export const previewLayoutKey = (settings: ResolvedSettings) =>
  `${settings.size}:${settings.font}:${settings.customFont?.family ?? ''}:${settings.customFont?.weight ?? ''}:${settings.shape}`
