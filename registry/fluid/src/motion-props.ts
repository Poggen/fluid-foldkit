import type { MotionNodeOptions, ResolvedValues } from 'motion-dom'
import type { MotionTargetProperties } from './motion-contract.js'

export function motionProps(
  options: MotionTargetProperties,
  onAnimationComplete: () => void,
  onUpdate: (values: ResolvedValues) => void,
  adapter: Partial<MotionNodeOptions> | undefined,
): MotionNodeOptions {
  const result: MotionNodeOptions = { animate: options.animate, onAnimationComplete }

  if (options.onUpdate !== undefined) {
    result.onUpdate = onUpdate
  }

  if (options.initial !== undefined) {
    result.initial = options.initial
  }

  if (options.exit !== undefined) {
    result.exit = options.exit
  }

  if (options.transition !== undefined) {
    result.transition = options.transition
  }

  return { ...result, ...adapter }
}
