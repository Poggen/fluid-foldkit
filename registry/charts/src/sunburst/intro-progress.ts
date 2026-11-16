import { animateSingleValue, motionValue } from 'motion-dom'
import { mountProgressOptions } from '../kit/motion/transition-options'
import type { EnterTransition } from '../kit/motion/phase'

/** Original useMountProgress + useEnterComplete: the first crossing of one switches to static geometry. */
export function createIntroProgress(
  transition: EnterTransition | undefined,
  delayMs: number,
  paint: () => void,
) {
  const value = motionValue(0)
  let complete = false

  const release = value.on('change', (next) => {
    if (complete) {
      return
    }

    complete = next >= 1
    paint()
  })

  animateSingleValue(value, 1, {
    ...mountProgressOptions(transition),
    delay: delayMs / 1000,
  })

  return {
    get progress() {
      return complete ? 1 : Math.max(0, Math.min(1, value.get()))
    },
    destroy() {
      release()
      value.destroy()
    },
  }
}
