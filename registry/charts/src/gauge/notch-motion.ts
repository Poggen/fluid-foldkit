import { createAnimationState, SVGVisualElement } from 'motion-dom'
import type { MotionNodeOptions } from 'motion-dom'
import { mountProgressOptions } from '../kit/motion/transition-options'
import { GAUGE_NOTCH_ENTER_SPRING } from '../kit/motion/springs'
import { clampStagger } from './notches'
import type { GaugeProps } from './props'

export function mountNotchMotion(
  element: SVGElement,
  props: GaugeProps,
  index: number,
  active: boolean,
  reduced: boolean,
) {
  const transition = reduced
    ? { duration: 0 }
    : mountProgressOptions(props.enterTransition, { type: 'spring', ...GAUGE_NOTCH_ENTER_SPRING })

  const options: MotionNodeOptions = {
    animate: { opacity: 1, scale: 1 },
    transition: {
      ...transition,
      delay:
        (active ? 0.3 + index * 0.02 : index * 0.015) * clampStagger(props.enterStaggerScale ?? 1),
    },
  }

  const visual = new SVGVisualElement({
    visualState: {
      latestValues: { opacity: 0, scale: 0 },
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
    },
    props: options,
    presenceContext: null,
    reducedMotionConfig: 'never',
  })

  const animation = createAnimationState(visual)
  visual.animationState = animation
  visual.mount(element)
  visual.render()
  void animation.animateChanges()

  return {
    restore() {
      // Static Scene reconciliation owns geometry; restore the same live entrance pose afterward.
      visual.render()
    },
    destroy() {
      for (const value of visual.values.values()) {
        value.stop()
      }

      visual.unmount()
    },
  }
}
