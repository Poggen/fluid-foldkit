import { createAnimationState, SVGVisualElement } from 'motion-dom'
import type { MotionNodeOptions, MotionValue, ResolvedValues } from 'motion-dom'

export type RadarMotionProps = MotionNodeOptions & {
  readonly style?: {
    readonly x: MotionValue<number>
    readonly y: MotionValue<number>
  }
}

export function mountRadarVisual(
  element: SVGElement,
  latestValues: ResolvedValues,
  props: RadarMotionProps,
  animate = true,
) {
  const visual = new SVGVisualElement({
    visualState: {
      latestValues,
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
    },
    props,
    presenceContext: null,
    reducedMotionConfig: 'user',
  })

  const animation = createAnimationState(visual)
  visual.animationState = animation
  visual.mount(element)
  const apply = (next: RadarMotionProps, shouldAnimate: boolean) => {
    visual.update(next, null)

    if (shouldAnimate) {
      void animation.animateChanges()
    } else if (
      typeof next.animate === 'object' &&
      next.animate !== null &&
      !Array.isArray(next.animate)
    ) {
      for (const [name, value] of Object.entries(next.animate)) {
        if (typeof value === 'number' || typeof value === 'string') {
          visual.getValue(name, value)?.jump(value)
        }
      }
    }

    visual.render()
  }

  apply(props, animate)

  return {
    update(next: RadarMotionProps, shouldAnimate = true) {
      apply(next, shouldAnimate)
    },
    destroy() {
      for (const value of visual.values.values()) {
        value.stop()
      }

      visual.unmount()
    },
  }
}
