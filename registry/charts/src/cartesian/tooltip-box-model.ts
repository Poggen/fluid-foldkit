import { Schema } from 'effect'
import type { ChartContent, ChartStyle } from './content-types'
import type { ChartEnvironment } from './chart-config'

/** Serializable public positioning contract; the container is resolved by its DOM id on mount. */
export const TooltipBoxConfiguration = Schema.Struct({
  containerId: Schema.String,
  x: Schema.Finite,
  y: Schema.Finite,
  containerWidth: Schema.Finite,
  containerHeight: Schema.Finite,
  visible: Schema.Boolean,
  offset: Schema.optionalKey(Schema.Finite),
  left: Schema.optionalKey(Schema.Finite),
  top: Schema.optionalKey(Schema.Finite),
  flipped: Schema.optionalKey(Schema.Boolean),
  animate: Schema.optionalKey(Schema.Boolean),
  entrance: Schema.optionalKey(Schema.Boolean),
  springConfig: Schema.optionalKey(
    Schema.Struct({ stiffness: Schema.Finite, damping: Schema.Finite }),
  ),
})

export type TooltipBoxConfiguration = typeof TooltipBoxConfiguration.Type

export type TooltipBoxProps = TooltipBoxConfiguration

export interface TooltipBoxInputs {
  readonly environment?: ChartEnvironment
  readonly children?: ChartContent
  readonly className?: string
  readonly panelStyle?: ChartStyle
  readonly backgroundColor?: string
}
