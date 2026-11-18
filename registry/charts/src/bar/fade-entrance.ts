import { animateVisualElement, SVGVisualElement } from 'motion-dom'
import type { ValueAnimationTransition } from 'motion-dom'

/** Give Motion the real SVG element so opacity/filter use the same browser animation path as Source. */
export function mountBarFade(node: SVGRectElement, transition: ValueAnimationTransition<number>) {
  const previous = { opacity: node.getAttribute('opacity'), filter: node.getAttribute('filter') }

  const visual = new SVGVisualElement({
    visualState: {
      latestValues: { opacity: 0, filter: 'blur(2px)' },
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
    },
    props: {},
    presenceContext: null,
    reducedMotionConfig: 'never',
  })

  visual.mount(node)

  const opacity = visual.getValue('opacity', 0)
  const filter = visual.getValue('filter', 'blur(2px)')
  visual.render()
  void animateVisualElement(visual, { opacity: 1, filter: 'blur(0px)', transition })

  return {
    draw: () => {
      visual.render()
    },
    destroy: () => {
      opacity.stop()
      filter.stop()
      visual.unmount()
      opacity.destroy()
      filter.destroy()

      for (const [name, value] of Object.entries(previous)) {
        if (value === null) {
          node.removeAttribute(name)
        } else {
          node.setAttribute(name, value)
        }
      }
    },
  }
}
