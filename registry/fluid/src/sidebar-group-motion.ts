import { animateTarget } from 'motion-dom'
import type { AnimationPlaybackControlsWithThen } from 'motion-dom'
import type { MotionResource } from './motion-resource.js'
import { spring } from './lib/springs.js'

/** Descendant resizes snap; only this physical wrapper's own toggles spring. */
const measuredSidebarMotion = (
  openAttribute: string,
  settledOverflow: 'visible' | 'hidden',
): MotionResource => ({
  key: {},
  mount(visual) {
    const element = visual.current

    if (!(element instanceof HTMLElement)) {
      throw new Error('SidebarGroup motion requires an HTML panel with an HTML measurement child')
    }

    const inner = element.firstElementChild

    if (!(inner instanceof HTMLElement)) {
      throw new Error('SidebarGroup motion requires an HTML panel with an HTML measurement child')
    }

    let open = element.getAttribute(openAttribute) === 'true'
    let toggling = false
    let generation = 0
    let disposed = false
    let height = inner.offsetHeight
    let controls: Array<AnimationPlaybackControlsWithThen> = []

    const render = () => {
      generation += 1
      const current = generation
      element.style.overflow = open && !toggling ? settledOverflow : 'hidden'
      const toggledTransition = open ? spring.moderate : spring.moderate.exit
      controls = animateTarget(visual, {
        height: open ? height : 0,
        opacity: open ? 1 : 0,
        transition: toggling ? toggledTransition : { duration: 0 },
      })

      // oxlint-disable-next-line promise/prefer-await-to-then -- Motion returns native thenable controls; completion stays in this resource's generation and disposal scope.
      void Promise.all(controls).then(() => {
        if (disposed || generation !== current) {
          return
        }

        toggling = false
        element.style.overflow = open ? settledOverflow : 'hidden'
      })
    }

    render()

    const resize = new ResizeObserver(() => {
      const measured = inner.offsetHeight

      if (height === measured) {
        return
      }

      height = measured
      render()
    })

    resize.observe(inner)

    const attributes = new MutationObserver(() => {
      const next = element.getAttribute(openAttribute) === 'true'

      if (next === open) {
        return
      }

      open = next
      toggling = true
      height = inner.offsetHeight
      render()
    })

    attributes.observe(element, { attributes: true, attributeFilter: [openAttribute] })

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
})

export const sidebarGroupMotion = measuredSidebarMotion('data-sidebar-group-open', 'visible')

export const sidebarMenuSubMotion = measuredSidebarMotion('data-sidebar-sub-open', 'hidden')
