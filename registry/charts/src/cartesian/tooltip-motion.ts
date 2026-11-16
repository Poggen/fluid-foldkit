import type { ChartMotionTransition } from '@tanstack/charts'
import type { ChartTooltipProps } from './tooltip-options'
import type { SpringConfig } from './series-options'
import { REST_PX } from '../kit/motion/spring-curve'
import { CROSSHAIR_SPRING, TOOLTIP_BOX_SPRING } from '../kit/motion/springs'

export function tooltipBoxMotion(
  props:
    | Pick<ChartTooltipProps, 'boxSpringConfig' | 'matchCrosshair' | 'springConfig' | 'damping'>
    | undefined,
  inheritedCrosshairSpring: SpringConfig = CROSSHAIR_SPRING,
): ChartMotionTransition {
  const base = {
    type: 'spring',
    ...TOOLTIP_BOX_SPRING,
    restSpeed: REST_PX.speed,
    restDelta: REST_PX.delta,
  } satisfies ChartMotionTransition

  if (props?.boxSpringConfig !== undefined) {
    return { ...base, ...props.boxSpringConfig }
  }

  if (props?.matchCrosshair === true) {
    return { ...base, ...(props.springConfig ?? inheritedCrosshairSpring) }
  }

  const damping = props?.damping ?? TOOLTIP_BOX_SPRING.damping

  if (damping === 0) {
    return { type: 'tween', duration: 0 }
  }

  if (damping === TOOLTIP_BOX_SPRING.damping) {
    return base
  }

  const stiffness =
    damping < 20 ? 100 + ((20 - damping) / 20) * 400 : 100 - ((damping - 20) / 80) * 85

  return { ...base, stiffness: Math.max(12, Math.round(stiffness)), damping }
}
