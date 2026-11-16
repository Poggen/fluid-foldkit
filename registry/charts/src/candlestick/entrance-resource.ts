import { animateVisualElement, SVGVisualElement } from 'motion-dom'
import type { TargetAndTransition } from 'motion-dom'
import type { CartesianSnapshot } from '../cartesian/definition'
import type { Interaction } from '../cartesian/state'
import type { TimeSeriesProps } from '../cartesian/root-options'
import { mountProgressOptions } from '../kit/motion/transition-options'

function animateNode(
  node: SVGElement,
  property: 'opacity' | 'scaleY',
  target: TargetAndTransition,
) {
  const ownedStyles =
    property === 'opacity' ? ['opacity'] : ['transform', 'transform-origin', 'transform-box']

  const originalStyles = ownedStyles.map((name) => ({
    name,
    value: node.style.getPropertyValue(name),
    priority: node.style.getPropertyPriority(name),
  }))

  const originalOpacity = node.getAttribute('opacity')

  const visual = new SVGVisualElement({
    visualState: {
      latestValues: { [property]: 0 },
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
    },
    props: {},
    presenceContext: null,
    reducedMotionConfig: 'never',
  })

  visual.mount(node)
  const value = visual.getValue(property, 0)
  visual.render()
  void animateVisualElement(visual, target)

  return () => {
    value?.stop()
    visual.unmount()
    value?.destroy()

    for (const { name, value: oldValue, priority } of originalStyles) {
      if (oldValue === '') {
        node.style.removeProperty(name)
      } else {
        node.style.setProperty(name, oldValue, priority)
      }
    }

    if (property === 'opacity') {
      if (originalOpacity === null) {
        node.removeAttribute('opacity')
      } else {
        node.setAttribute('opacity', originalOpacity)
      }
    }
  }
}

export function candleEntranceResource<Row>(
  element: HTMLElement,
  props: () => TimeSeriesProps<Row>,
) {
  const entries = new Map<SVGGElement, { readonly epoch: number; readonly release: () => void }>()
  let snapshot: CartesianSnapshot<Row> | undefined
  let state: Interaction | undefined
  let disposed = false

  const refresh = () => {
    if (disposed || snapshot === undefined || state === undefined) {
      return
    }

    const carrier = props().children.find((child) => child.kind === 'candlestick')
    const entering = !state.revealReady && carrier?.props.animate !== false
    const active = new Set<SVGGElement>()
    const groups = element.querySelectorAll<SVGGElement>('g.bkm-candle')

    for (const [index, group] of [...groups].entries()) {
      const center = snapshot.candleGeometry?.centers[index]

      if (center === undefined) {
        delete group.dataset.bkmCx
      } else {
        group.dataset.bkmCx = String(center)
      }

      if (!entering || !group.classList.contains('bkm-candle-enter')) {
        continue
      }

      active.add(group)
      const old = entries.get(group)

      if (old?.epoch === state.generation) {
        continue
      }

      old?.release()

      const delay =
        (index * state.configuration.animationDuration * 0.6) /
        Math.max(snapshot.rows.length, 1) /
        1000

      const transition = { ...mountProgressOptions(props().enterTransition), delay }

      const releases = [
        animateNode(group, 'opacity', {
          opacity: 1,
          transition: { ...transition, opacity: { duration: 0.15 } },
        }),
      ]

      for (const rect of group.querySelectorAll<SVGRectElement>('rect')) {
        releases.push(animateNode(rect, 'scaleY', { scaleY: 1, transition }))
      }

      entries.set(group, {
        epoch: state.generation,
        release: () => {
          for (const release of releases) {
            release()
          }
        },
      })
    }

    for (const [node, entry] of entries) {
      if (!active.has(node)) {
        entry.release()
        node.style.opacity = '1'
        entries.delete(node)
      }
    }
  }

  return {
    draw: (next: CartesianSnapshot<Row>) => {
      snapshot = next
    },
    update: (next: Interaction) => {
      state = next
      refresh()
    },
    refresh,
    destroy: () => {
      disposed = true

      for (const entry of entries.values()) {
        entry.release()
      }

      entries.clear()

      for (const node of element.querySelectorAll<SVGGElement>('g.bkm-candle')) {
        delete node.dataset.bkmCx
      }
    },
  }
}
