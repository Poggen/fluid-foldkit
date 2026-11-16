import { animateTarget } from 'motion-dom'
import type { AnimationPlaybackControlsWithThen } from 'motion-dom'
import type { MotionResource } from './motion-resource.js'
import { spring } from './lib/springs.js'
import { accordionMotionComplete } from './accordion-observer.js'

export const accordionPanelMotion: MotionResource = {
  key: {},
  mount(visual) {
    const element = visual.current

    if (!(element instanceof HTMLElement)) {
      throw new Error('Accordion panel motion requires an HTML wrapper')
    }

    const inner = element.firstElementChild

    if (!(inner instanceof HTMLElement)) {
      throw new Error('Accordion panel motion requires an HTML measurement child')
    }

    let open = element.dataset.accordionOpen === 'true'
    let admittedGeneration = element.dataset.accordionGeneration
    let toggling = false
    let height = inner.offsetHeight
    let revision = 0
    let disposed = false
    let controls: Array<AnimationPlaybackControlsWithThen> = []

    const render = () => {
      revision += 1

      const current = revision
      const generation = admittedGeneration
      const reduceMotion = element.dataset.accordionReduceMotion === 'true'

      const toggleTransition = open
        ? { ...spring.fast, opacity: { duration: 0.06 } }
        : { ...spring.fast.exit, opacity: { duration: 0.04 } }

      controls = animateTarget(visual, {
        height: open ? height : 0,
        opacity: open ? 1 : 0,
        transition: reduceMotion || !toggling ? { duration: 0 } : toggleTransition,
      })

      // oxlint-disable-next-line promise/prefer-await-to-then -- Motion returns native thenable controls; completion remains scoped to this panel's accepted generation and resource lifetime.
      void Promise.all(controls).then(() => {
        if (
          disposed ||
          current !== revision ||
          generation !== element.dataset.accordionGeneration
        ) {
          return
        }

        toggling = false
        accordionMotionComplete(element)
      })
    }

    render()

    const resize = new ResizeObserver(() => {
      const measured = inner.offsetHeight

      if (!open || measured <= 0 || measured === height) {
        return
      }

      height = measured
      render()
    })

    resize.observe(inner)

    const attributes = new MutationObserver(() => {
      const next = element.dataset.accordionOpen === 'true'
      const nextGeneration = element.dataset.accordionGeneration

      if (next === open && nextGeneration === admittedGeneration) {
        return
      }

      open = next
      admittedGeneration = nextGeneration
      toggling = true

      if (open) {
        height = inner.offsetHeight
      }

      render()
    })

    attributes.observe(element, {
      attributes: true,
      attributeFilter: ['data-accordion-open', 'data-accordion-generation'],
    })

    return () => {
      disposed = true
      revision += 1
      resize.disconnect()
      attributes.disconnect()

      for (const control of controls) {
        control.stop()
      }
    }
  },
}
