import { HTMLVisualElement, createAnimationState } from 'motion-dom'
import type { MotionNodeOptions, ResolvedValues } from 'motion-dom'

export function mountHtmlMotion(
  element: HTMLElement,
  initial: ResolvedValues,
  props: MotionNodeOptions,
  reducedMotion: 'never' | 'user' | 'always',
) {
  const visual = new HTMLVisualElement({
    visualState: {
      latestValues: initial,
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {} },
    },
    props,
    presenceContext: null,

    reducedMotionConfig: reducedMotion,
  })

  const animation = createAnimationState(visual)
  visual.animationState = animation
  visual.mount(element)
  visual.render()
  void animation.animateChanges()

  return {
    render: () => {
      visual.render()
    },
    update(next: MotionNodeOptions) {
      visual.update(next, null)
      visual.render()
      void animation.animateChanges()
    },
    destroy() {
      for (const value of visual.values.values()) {
        value.stop()
      }

      visual.unmount()
    },
  }
}
