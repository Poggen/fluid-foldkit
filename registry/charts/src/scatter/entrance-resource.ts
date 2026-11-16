import { animateVisualElement, SVGVisualElement } from 'motion-dom'
import type { CartesianSnapshot } from '../cartesian/definition'
import type { Interaction } from '../cartesian/state'

function enterPoint(node: SVGGElement, blur: number, delay: number) {
  const styles = ['opacity', 'filter'].map((name) => ({
    name,
    value: node.style.getPropertyValue(name),
    priority: node.style.getPropertyPriority(name),
  }))
  const attributes = ['opacity', 'filter'].map((name) => ({
    name,
    value: node.getAttribute(name),
  }))
  const visual = new SVGVisualElement({
    visualState: {
      latestValues: { opacity: 0, filter: `blur(${blur}px)` },
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
    },
    props: {},
    presenceContext: null,
    reducedMotionConfig: 'never',
  })

  visual.mount(node)
  const alpha = visual.getValue('opacity', 0)
  const filter = visual.getValue('filter', `blur(${blur}px)`)
  visual.render()
  void animateVisualElement(visual, {
    opacity: 1,
    filter: 'blur(0px)',
    transition: { delay, duration: 0.5, ease: [0.85, 0, 0.15, 1] },
  })

  return () => {
    alpha?.stop()
    filter?.stop()
    visual.unmount()
    alpha?.destroy()
    filter?.destroy()

    for (const { name, value, priority } of styles) {
      if (value === '') {
        node.style.removeProperty(name)
      } else {
        node.style.setProperty(name, value, priority)
      }
    }

    for (const { name, value } of attributes) {
      if (value === null) {
        node.removeAttribute(name)
      } else {
        node.setAttribute(name, value)
      }
    }
  }
}

/** Existing chart-resource acquisition owns Source's one Motion paint group per point. */
export function scatterEntranceResource<Row>(element: HTMLElement) {
  const entries = new Map<
    SVGGElement,
    { readonly generation: number; readonly release: () => void }
  >()
  let snapshot: CartesianSnapshot<Row> | undefined
  let state: Interaction | undefined
  let disposed = false

  const refresh = () => {
    if (disposed || snapshot === undefined || state === undefined) {
      return
    }

    const active = new Set<SVGGElement>()
    const islands = [...element.querySelectorAll<SVGSVGElement>('svg.bkm-scatter-island')].filter(
      (svg) => svg.closest('[data-bkm-chart="scatter"]') === element,
    )

    if (!state.revealReady) {
      for (const point of snapshot.scatterPaint?.entrance ?? []) {
        const node =
          islands
            .map((svg) =>
              svg.querySelector<SVGGElement>(`.${point.className} > g.bkm-scatter-enter`),
            )
            .find((node) => node !== null) ?? null

        if (node === null || active.has(node)) {
          continue
        }

        active.add(node)
        const previous = entries.get(node)

        if (previous?.generation === state.generation) {
          continue
        }

        previous?.release()
        entries.set(node, {
          generation: state.generation,
          release: enterPoint(node, point.blur, point.delay),
        })
      }
    }

    for (const [node, entry] of entries) {
      if (!active.has(node)) {
        entry.release()
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
    },
  }
}
