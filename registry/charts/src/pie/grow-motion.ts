import type { MotionNodeOptions } from 'motion-dom'
import { createAnimationState, springValue, SVGVisualElement } from 'motion-dom'

export function createPieGrowMotion(initialRadius: number, paint: () => void) {
  const radius = springValue(initialRadius, { stiffness: 400, damping: 25 })
  let target = initialRadius
  let visual: SVGVisualElement | undefined
  let animation: ReturnType<typeof createAnimationState> | undefined
  let element: SVGPathElement | undefined
  const release = radius.on('change', paint)

  const destroyVisual = () => {
    if (visual === undefined) {
      return
    }

    for (const value of visual.values.values()) {
      value.stop()
    }

    visual.unmount()
    visual = undefined
    animation = undefined
    element = undefined
  }

  return {
    radius: () => radius.get(),
    retarget(next: number) {
      if (target === next) {
        return
      }

      target = next
      radius.set(next)
    },
    paintComplete(path: SVGPathElement, d: string) {
      if (element !== path) {
        destroyVisual()
      }

      const props: MotionNodeOptions = {
        animate: { d },
        transition: { d: { type: 'spring', stiffness: 400, damping: 25 } },
      }

      if (visual === undefined) {
        visual = new SVGVisualElement({
          visualState: {
            latestValues: { d },
            renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
          },
          props,
          presenceContext: null,
          reducedMotionConfig: 'never',
        })
        animation = createAnimationState(visual)
        visual.animationState = animation
        visual.mount(path)
        element = path
      }

      visual.update(props, null)
      visual.render()
      void animation?.animateChanges()
    },
    destroy() {
      release()
      radius.destroy()
      destroyVisual()
    },
  }
}
