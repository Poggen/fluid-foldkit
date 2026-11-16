import { animateVisualElement, SVGVisualElement } from 'motion-dom'
import type { CartesianSnapshot } from './definition'
import type { Interaction } from './state'
import type { TimeSeriesProps } from './root-options'
import { markerRevealDuration } from './reveal-transition'
import { keyAttr } from './build-state'
import { CLS, keyIs } from '../kit/renderer-dom'
import type { ResolvedSeries } from './series'

const visibleSeries = (series: ResolvedSeries, state: Interaction): boolean =>
  series.showMarkers &&
  series.marker.animate &&
  (series.kind === 'line' || state.phase === 'ready' || state.phase === 'concealing')

const entranceNode = (node: SVGGElement): SVGGElement =>
  node.closest<SVGGElement>('g.bkm-wipe-i') ?? node

/** Source's Motion marker clock is a real acquisition time, rather than CSS's previous document frame. */
export function markerEnterResource<Row>(
  element: HTMLElement,
  id: string,
  props: () => TimeSeriesProps<Row>,
) {
  const style = document.createElement('style')
  style.textContent = ''
  element.dataset.bkmPhysicalMarkers = id
  element.append(style)

  interface Entry {
    readonly restore: () => void
    readonly epoch: boolean
  }

  const entries = new Map<SVGGElement, Entry>()
  let state: Interaction | undefined
  let snapshot: CartesianSnapshot<Row> | undefined
  let epoch = false
  let disposed = false
  let pending = false

  const create = (node: SVGGElement, blur: number, delay: number): Entry => {
    const original = {
      opacity: node.getAttribute('opacity'),
      filter: node.getAttribute('filter'),
      opacityStyle: node.style.opacity,
      filterStyle: node.style.filter,
    }

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
    const opacity = visual.getValue('opacity', 0)
    const filter = visual.getValue('filter', `blur(${blur}px)`)
    node.dataset.bkmMarkerEnter = ''
    visual.render()
    void animateVisualElement(visual, {
      opacity: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.5, delay, ease: [0.85, 0, 0.15, 1] },
    })

    return {
      epoch,
      restore: () => {
        opacity?.stop()
        filter?.stop()
        visual.unmount()
        opacity?.destroy()
        filter?.destroy()
        delete node.dataset.bkmMarkerEnter

        for (const [key, value] of Object.entries({
          opacity: original.opacity,
          filter: original.filter,
        })) {
          if (value === null) {
            node.removeAttribute(key)
          } else {
            node.setAttribute(key, value)
          }
        }

        node.style.opacity = original.opacityStyle
        node.style.filter = original.filterStyle
      },
    }
  }

  const refresh = () => {
    if (disposed || state === undefined || snapshot === undefined) {
      return
    }

    const active = new Set<SVGGElement>()
    const isLoaded = state.phase === 'ready' && state.revealReady

    if (!isLoaded) {
      const { innerWidth } = snapshot
      const [start, end] = snapshot.domains.x
      const span = end.getTime() - start.getTime() || 1

      const revealMs = markerRevealDuration(
        props().enterTransition,
        state.configuration.animationDuration,
      )

      for (const series of snapshot.series) {
        if (!visibleSeries(series, state)) {
          continue
        }

        const { marker } = series
        const ring = marker.strokeWidth > 0 ? marker.ringGap + marker.strokeWidth : 0

        const extent =
          marker.radius +
          ring +
          marker.outlineWidth +
          (marker.showActiveHighlight ? marker.radius * 0.35 : 0) +
          2

        for (const [index, time] of snapshot.hover.times.entries()) {
          const cx = ((time - start.getTime()) / span) * innerWidth

          const delay =
            innerWidth > 0 ? ((Math.max(0, cx - extent) / innerWidth) * revealMs) / 1000 : 0

          for (const part of ['marker-out', 'marker-ring', 'marker']) {
            const node = element.querySelector<SVGGElement>(
              `g${CLS.dot}${keyIs(keyAttr(`${series.id}:${part}:${index}`))}`,
            )

            if (node === null) {
              continue
            }

            // Enter and hover dim belong to separate SVG layers in Original.
            const target = entranceNode(node)
            active.add(target)
            const old = entries.get(target)

            if (old?.epoch === epoch) {
              continue
            }

            old?.restore()
            entries.set(target, create(target, marker.enterBlur, delay))
          }
        }
      }
    }

    for (const [node, entry] of entries) {
      if (!active.has(node)) {
        entry.restore()
        entries.delete(node)
      }
    }
  }

  return {
    draw: (next: CartesianSnapshot<Row>) => {
      snapshot = next

      if (!pending) {
        pending = true
        queueMicrotask(() => {
          pending = false
          refresh()
        })
      }
    },
    update: (next: Interaction, revealEpoch: boolean) => {
      state = next
      epoch = revealEpoch
      refresh()
    },
    destroy: () => {
      disposed = true

      for (const entry of entries.values()) {
        entry.restore()
      }

      entries.clear()
      style.remove()
      delete element.dataset.bkmPhysicalMarkers
    },
  }
}
