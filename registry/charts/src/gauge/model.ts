import { Schema, Struct } from 'effect'
import { GaugeEnterTransition, GaugeProps } from './props'

const Easing = Schema.Union([Schema.Array(Schema.Finite), Schema.String])

export const GaugeTransitionConfiguration = Schema.Struct({
  ...Struct.omit(GaugeEnterTransition.fields, ['type', 'ease']),
  type: Schema.optionalKey(Schema.Json),
  ease: Schema.optionalKey(Schema.Union([Easing, Schema.Array(Easing)])),
})

export type GaugeTransitionConfiguration = typeof GaugeTransitionConfiguration.Type

export const GaugeConfiguration = Schema.Struct({
  ...Struct.omit(GaugeProps.fields, ['children', 'enterTransition']),
  enterTransition: Schema.optionalKey(GaugeTransitionConfiguration),
})

export type GaugeConfiguration = typeof GaugeConfiguration.Type

export interface GaugeViewInputs {
  readonly enterTransition?: (
    configuration: GaugeTransitionConfiguration | undefined,
  ) => GaugeEnterTransition | undefined
  readonly children?: () => GaugeProps['children']
}

export function gaugePresentation(
  configuration: GaugeConfiguration,
  inputs: GaugeViewInputs,
): GaugeProps {
  const { enterTransition, ...logical } = configuration

  const transition =
    inputs.enterTransition === undefined ? enterTransition : inputs.enterTransition(enterTransition)

  return {
    ...logical,
    ...(transition === undefined ? {} : { enterTransition: transition }),
    ...(inputs.children === undefined ? {} : { children: inputs.children() }),
  }
}
