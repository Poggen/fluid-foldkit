import type { ChartMotionTiming } from '@tanstack/charts'
import { resumeEnter } from '../kit/motion/resume-enter'
import type { EnterPlan } from '../kit/motion/resume-enter'

export const enterOrResume: (clock: EnterClock, phase: string, plan: EnterPlan) => EnterTiming =
  function enterOrResume(clock: EnterClock, phase: string, plan: EnterPlan) {
    return clock.at === null || phase === 'enter'
      ? {
          delay: plan.delay,
          transition: { type: 'tween', duration: plan.duration, easing: plan.easing },
        }
      : resumeEnter(plan, clock.at, clock.now())
  }

export type EnterTiming = false | ChartMotionTiming

export interface EnterClock {
  readonly at: number | null
  readonly now: () => number
}
