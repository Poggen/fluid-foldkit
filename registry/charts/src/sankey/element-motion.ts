import { createAnimationState, SVGVisualElement } from 'motion-dom'
import type { MotionNodeOptions, ResolvedValues } from 'motion-dom'
import { Predicate } from 'effect'

/** Preserve Motion's per-property retargeting on the native renderer's existing SVG elements. */
export function mountElementMotion(
  element: SVGElement,
  initial: ResolvedValues,
  props: MotionNodeOptions,
  publish: () => void,
) {
  const visual = new SVGVisualElement({
    visualState: {
      latestValues: initial,
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
    },
    props,
    presenceContext: null,
    reducedMotionConfig: 'never',
  })

  const animation = createAnimationState(visual)
  visual.animationState = animation

  // An onUpdate prop would force Source's accelerated opacity onto the JS backend.
  // Only transform values affect hit geometry, so observe those owned values directly.
  const subscriptions = Object.entries(initial).flatMap(([key, value]) =>
    key !== 'opacity' && Predicate.isNumber(value)
      ? [visual.getValue(key, value).on('change', publish)]
      : [],
  )

  element.dataset.bkmOwnedMotion = ''
  visual.mount(element)
  visual.render()
  void animation.animateChanges()

  return {
    element,
    update(next: MotionNodeOptions) {
      element.dataset.bkmOwnedMotion = ''
      visual.update(next, null)
      // A native scene refresh may restore destination attributes; put the current physical pose back.
      visual.render()
      void animation.animateChanges()
    },
    destroy() {
      for (const release of subscriptions) {
        release()
      }

      for (const value of visual.values.values()) {
        value.stop()
      }

      visual.unmount()
      delete element.dataset.bkmOwnedMotion
    },
  }
}
