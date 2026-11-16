import { Schema } from 'effect'

export const SeriesPointMarkerProps = Schema.Struct({
  dataKey: Schema.String,
  index: Schema.Number,
  cx: Schema.Number,
  cy: Schema.Number,
  revealDelay: Schema.Number,
  revealEpoch: Schema.Number,
  enterDuration: Schema.Number,
  fill: Schema.optionalKey(Schema.String),
  stroke: Schema.optionalKey(Schema.String),
  strokeWidth: Schema.optionalKey(Schema.Number),
  ringGap: Schema.optionalKey(Schema.Number),
  outlineWidth: Schema.optionalKey(Schema.Number),
  outlineColor: Schema.optionalKey(Schema.String),
  radius: Schema.optionalKey(Schema.Number),
  enterBlur: Schema.optionalKey(Schema.Number),
  fadeOnHover: Schema.optionalKey(Schema.Boolean),
  inactiveOpacity: Schema.optionalKey(Schema.Number),
  inactiveBlur: Schema.optionalKey(Schema.Number),
  showActiveHighlight: Schema.optionalKey(Schema.Boolean),
})

export type SeriesPointMarkerProps = typeof SeriesPointMarkerProps.Type
