import { Schema } from 'effect'

export const LineLoadingPulseStrokeConfiguration = Schema.Struct({
  pathD: Schema.String,
  mode: Schema.optionalKey(Schema.Literals(['loop', 'exit', 'enter'])),
  loopEpoch: Schema.optionalKey(Schema.Finite),
  stroke: Schema.optionalKey(Schema.String),
  strokeOpacity: Schema.optionalKey(Schema.Finite),
  strokeWidth: Schema.optionalKey(Schema.Finite),
  innerWidth: Schema.optionalKey(Schema.Finite),
  innerHeight: Schema.optionalKey(Schema.Finite),
})

export type LineLoadingPulseStrokeConfiguration = typeof LineLoadingPulseStrokeConfiguration.Type

export type LineLoadingPulseStrokeProps = LineLoadingPulseStrokeConfiguration

export interface LineLoadingPulseStrokeInputs {
  readonly dimensions?: { readonly innerWidth: number; readonly innerHeight: number }
}

export const PulseTransport = Schema.Struct({
  id: Schema.String,
  generation: Schema.Int,
  configuration: LineLoadingPulseStrokeConfiguration,
})

export type PulseTransport = typeof PulseTransport.Type

export const PulseTransportCodec = Schema.fromJsonString(PulseTransport)

export const PULSE_CONFIGURATION = 'data-bkm-pulse-configuration'
