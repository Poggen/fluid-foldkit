import { Schema } from 'effect'

export const GaugeOrientation = Schema.Literals(['arc', 'linear'])

export type GaugeOrientation = typeof GaugeOrientation.Type

export const GaugeLabelPlacement = Schema.Literals(['top', 'bottom', 'left', 'right'])

export type GaugeLabelPlacement = typeof GaugeLabelPlacement.Type

export const GaugeLabelAlign = Schema.Literals(['start', 'center', 'end'])

export type GaugeLabelAlign = typeof GaugeLabelAlign.Type

const easingFunction = Schema.declare<(progress: number) => number>(
  (value): value is (progress: number) => number => typeof value === 'function',
)

const easing = Schema.Union([Schema.Array(Schema.Finite), Schema.String, easingFunction])

export const GaugeEnterTransition = Schema.Struct({
  type: Schema.optionalKey(Schema.Unknown),
  duration: Schema.optionalKey(Schema.Finite),
  delay: Schema.optionalKey(Schema.Finite),
  ease: Schema.optionalKey(Schema.Union([easing, Schema.Array(easing)])),
  stiffness: Schema.optionalKey(Schema.Finite),
  damping: Schema.optionalKey(Schema.Finite),
  mass: Schema.optionalKey(Schema.Finite),
  bounce: Schema.optionalKey(Schema.Finite),
})

export type GaugeEnterTransition = typeof GaugeEnterTransition.Type

export const GaugeStatFormat = Schema.Struct({
  notation: Schema.optionalKey(Schema.Literals(['standard', 'compact'])),
  compactDisplay: Schema.optionalKey(Schema.Literals(['short', 'long'])),
  minimumFractionDigits: Schema.optionalKey(Schema.Finite),
  maximumFractionDigits: Schema.optionalKey(Schema.Finite),
  minimumIntegerDigits: Schema.optionalKey(Schema.Finite),
  minimumSignificantDigits: Schema.optionalKey(Schema.Finite),
  maximumSignificantDigits: Schema.optionalKey(Schema.Finite),
  style: Schema.optionalKey(Schema.Literals(['decimal', 'percent', 'currency'])),
  currency: Schema.optionalKey(Schema.String),
  currencyDisplay: Schema.optionalKey(Schema.Literals(['symbol', 'narrowSymbol', 'code', 'name'])),
  unit: Schema.optionalKey(Schema.String),
  unitDisplay: Schema.optionalKey(Schema.Literals(['short', 'long', 'narrow'])),
})

export type GaugeStatFormat = typeof GaugeStatFormat.Type

export const defaultGaugeStatFormat: GaugeStatFormat = {
  maximumFractionDigits: 0,
  notation: 'standard',
}

const gradientPair = Schema.Tuple([Schema.String, Schema.String])

export const GaugeProps = Schema.Struct({
  orientation: Schema.optionalKey(GaugeOrientation),
  value: Schema.Finite,
  totalNotches: Schema.optionalKey(Schema.Finite),
  spacing: Schema.optionalKey(Schema.Finite),
  notchCornerRadius: Schema.optionalKey(Schema.Finite),
  uniformWidth: Schema.optionalKey(Schema.Boolean),
  startAngle: Schema.optionalKey(Schema.Finite),
  endAngle: Schema.optionalKey(Schema.Finite),
  useGradient: Schema.optionalKey(Schema.Boolean),
  activeGradient: Schema.optionalKey(gradientPair),
  inactiveGradient: Schema.optionalKey(gradientPair),
  centerValue: Schema.optionalKey(Schema.Finite),
  defaultLabel: Schema.optionalKey(Schema.String),
  prefix: Schema.optionalKey(Schema.String),
  suffix: Schema.optionalKey(Schema.String),
  formatOptions: Schema.optionalKey(GaugeStatFormat),
  labelPlacement: Schema.optionalKey(GaugeLabelPlacement),
  labelAlign: Schema.optionalKey(GaugeLabelAlign),
  inactiveFill: Schema.optionalKey(Schema.String),
  activeFill: Schema.optionalKey(Schema.String),
  inactiveFillOpacity: Schema.optionalKey(Schema.Finite),
  activeFillOpacity: Schema.optionalKey(Schema.Finite),
  children: Schema.optionalKey(Schema.Unknown),
  className: Schema.optionalKey(Schema.String),
  width: Schema.optionalKey(Schema.Finite),
  height: Schema.optionalKey(Schema.Finite),
  minWidth: Schema.optionalKey(Schema.Finite),
  notchLengthPercent: Schema.optionalKey(Schema.Finite),
  notchWidthPercent: Schema.optionalKey(Schema.Finite),
  linearHeight: Schema.optionalKey(Schema.Finite),
  enterTransition: Schema.optionalKey(GaugeEnterTransition),
  enterStaggerScale: Schema.optionalKey(Schema.Finite),
  geometryScrubbing: Schema.optionalKey(Schema.Boolean),
})

export type GaugeProps = typeof GaugeProps.Type
