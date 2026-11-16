import { animateTarget, HTMLVisualElement } from 'motion-dom'

/** Source motion.svg opacity entrance belongs to the chart mount, independently of segment playKey. */
export function mountStageFade(element: HTMLDivElement) {
  const visual = new HTMLVisualElement({
    visualState: {
      latestValues: { opacity: 0 },
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {} },
    },
    props: {},
    presenceContext: null,
    reducedMotionConfig: 'never',
  })
  visual.mount(element)
  visual.render()
  const controls = animateTarget(visual, {
    opacity: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  })
  return () => {
    for (const control of controls) control.stop()
    visual.unmount()
  }
}
