import { Context, Layer } from 'effect'
import type { MotionValue } from 'motion-dom'

export interface TooltipBoxPositionSources {
  readonly left?: MotionValue<number>
  readonly top?: MotionValue<number>
}

/** Construction capabilities stay outside the serializable component Model. */
export interface TooltipBoxMotionPolicy {
  readonly reducedMotion: 'never' | 'user' | 'always'
  readonly positions?: ReadonlyMap<string, TooltipBoxPositionSources>
}

export const TooltipBoxMotionPolicy = Context.Reference<TooltipBoxMotionPolicy>(
  'BklitTooltipBoxMotionPolicy',
  { defaultValue: () => ({ reducedMotion: 'never' }) },
)

export function createTooltipBoxMotionLayer(policy: TooltipBoxMotionPolicy) {
  return Layer.succeed(TooltipBoxMotionPolicy, policy)
}
