// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
import type { ChartMotionTransition } from '@tanstack/charts'
import { toMotionTransition } from '../kit/motion/enter-transition'
import type { Transition } from '../kit/motion/phase'
import type { EntranceOrigin } from '../kit/entrance/entrance-origin'

/** bklit: the node and label opacities are WAAPI (motion.rect / motion.g), the node scaleY and label slide are JS-driven (motion clock) (see alignEntranceStart). */
export const SANKEY_ENTRANCE_ORIGINS = {
  'bkm-sankey-label-in': 'frame',
  'bkm-sankey-node-grow': 'motion',
  'bkm-sankey-label-in-left': 'motion',
  'bkm-sankey-label-in-right': 'motion',
} satisfies Readonly<Record<string, EntranceOrigin>>

// bklit enter transition prop -> native motion transition (default: 1100ms cubic-bezier tween; springs use motion's rest thresholds).
const MOTION_REST = { restDelta: 0.5, restSpeed: 2 }

export const toNativeTransition = (
  transition: Transition | undefined,
  durationMs: number,
): ChartMotionTransition => {
  const native = toMotionTransition({ duration: durationMs / 1000, ...transition })

  return native.type === 'spring' ? { ...native, ...MOTION_REST } : native
}
