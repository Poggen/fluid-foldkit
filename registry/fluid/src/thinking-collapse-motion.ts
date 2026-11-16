import { animateTarget } from 'motion-dom'
import type { AnimationPlaybackControlsWithThen } from 'motion-dom'
import type { MotionResource } from './motion-resource.js'
import { spring } from './lib/springs.js'

export const thinkingCollapseMotion: MotionResource = {
  key: {},
  mount(visual) {
    const element = visual.current

    if (!(element instanceof HTMLElement)) {
      throw new Error('Thinking collapse requires an HTML wrapper')
    }

    const inner = element.firstElementChild

    if (!(inner instanceof HTMLElement)) {
      throw new Error('Thinking collapse requires an HTML measurement child')
    }

    let open = element.dataset.thinkingOpen === 'true'
    let needsInitialSnap = open
    let height = inner.offsetHeight
    let generation = 0
    let disposed = false
    let controls: Array<AnimationPlaybackControlsWithThen> = []

    const render = (snap: boolean) => {
      generation += 1

      const current = generation
      const completion = element.dataset.thinkingCompletion

      controls = animateTarget(visual, {
        height: open ? height : 0,
        transition: snap ? { duration: 0 } : { ...spring.moderate, bounce: 0 },
      })

      if (open && height > 0) {
        needsInitialSnap = false
      }

      // oxlint-disable-next-line promise/prefer-await-to-then -- Motion returns native thenable controls; completion stays in this resource's generation and disposal scope.
      void Promise.all(controls).then(() => {
        if (disposed || current !== generation || open || completion === undefined) {
          return
        }

        element.dispatchEvent(new CustomEvent(completion))
      })
    }

    render(true)

    const resize = new ResizeObserver(() => {
      const measured = inner.offsetHeight

      if (!open || measured <= 0 || measured === height) {
        return
      }

      height = measured
      render(needsInitialSnap)
    })

    resize.observe(inner)

    const attributes = new MutationObserver(() => {
      const next = element.dataset.thinkingOpen === 'true'

      if (next === open) {
        return
      }

      open = next

      if (open) {
        height = inner.offsetHeight
      }

      render(needsInitialSnap)
    })

    attributes.observe(element, { attributes: true, attributeFilter: ['data-thinking-open'] })

    return () => {
      disposed = true
      generation += 1
      resize.disconnect()
      attributes.disconnect()

      for (const control of controls) {
        control.stop()
      }
    }
  },
}
