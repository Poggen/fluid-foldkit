import type { ChartMotionTransition } from '@tanstack/charts'
import { toMotionTransition } from '../kit/motion/enter-transition'
import type { EnterSpring } from '../kit/motion/enter-transition'
import type { EnterTransition } from '../kit/motion/phase'

export type RadarEnterTransition = EnterTransition

export const RADAR_ENTER_SPRING: EnterSpring = { damping: 20, mass: 1, stiffness: 60 }

export const toChartTransition: (
  transition: RadarEnterTransition | undefined,
) => ChartMotionTransition = (transition: RadarEnterTransition | undefined) =>
  toMotionTransition(transition, { spring: RADAR_ENTER_SPRING })
