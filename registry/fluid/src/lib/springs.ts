/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import type { Transition } from 'motion-dom'

export const spring = {
  fast: {
    type: 'spring',
    duration: 0.08,
    bounce: 0,
    exit: { duration: 0.06 },
  },

  moderate: {
    type: 'spring',
    duration: 0.16,
    bounce: 0,
    exit: { duration: 0.12 },
  },
  slow: {
    type: 'spring',
    duration: 0.24,
    bounce: 0.12,
    exit: { duration: 0.16 },
  },
} satisfies Record<'fast' | 'moderate' | 'slow', Transition & { exit: { duration: number } }>

export const exitFallbackMs = (tier: { exit: { duration: number } }) =>
  Math.round(tier.exit.duration * 1000) + 100
