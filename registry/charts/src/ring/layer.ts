import type { ChartLayerRenderer, ChartRenderer } from '@tanstack/charts'
import { createSvgLayer } from './svg-layer'
import { composeLayers } from './compose-layers'
import { createRingVisual } from './visual'
import { ringGeometry } from './geometry'
import type { RingArcRow } from './arc'
import type { RingChartProps } from './options'

/** A retained Host owns the Ring hooks; replacing its SVG surface does not restart them. */
export function createRingLayer(retained = false) {
  const visuals = new Map<number, ReturnType<typeof createRingVisual>>()

  const composed = new WeakMap<
    ChartRenderer<RingArcRow, number, number>,
    ChartRenderer<RingArcRow, number, number>
  >()

  let props: RingChartProps | undefined
  let size = 0
  let active = false
  let hovered: number | null = null

  const destroy = () => {
    for (const visual of visuals.values()) {
      visual.destroy()
    }

    visuals.clear()
    active = false
  }

  const sync = () => {
    if (props === undefined || !active) {
      return
    }

    const geometry = ringGeometry(props, size)

    const { rings } = geometry

    for (const [role, ring] of rings.entries()) {
      let visual = visuals.get(role)

      if (visual === undefined) {
        visual = createRingVisual(props, ring, props.geometryScrubbing === true ? null : hovered)
        visuals.set(role, visual)
      }

      visual.configure(
        props,
        ring,
        geometry.rows.find((row) => row.roleIndex === role && row.kind === 'track'),
        geometry.rows.find((row) => row.roleIndex === role && row.kind === 'progress'),
        geometry.fit,
      )
      visual.hover(props.geometryScrubbing === true ? null : hovered)
    }

    for (const [role, visual] of visuals) {
      if (role >= rings.length) {
        visual.destroy()
        visuals.delete(role)
      }
    }
  }

  const start = () => {
    active = true
    sync()
  }

  const raw = createSvgLayer('ring-source-roles', (svg) => {
    svg.classList.add('[contain:layout_style_paint]')
    svg.classList.remove('overflow-visible')
    svg.classList.add('overflow-hidden!')
    start()
    const root = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svg.append(root)

    return {
      destroy() {
        root.remove()

        if (!retained) {
          destroy()
        }
      },
      render(scene) {
        root.setAttribute('transform', `translate(${scene.width / 2} ${scene.height / 2})`)
        const geometry = props === undefined ? undefined : ringGeometry(props, size)

        for (const [role, visual] of visuals) {
          if (
            geometry?.rows.some((row) => row.roleIndex === role && row.kind === 'track') === true
          ) {
            root.append(visual.element)
          } else if (visual.element.parentNode === root) {
            visual.element.remove()
          }
        }
      },
    }
  })

  const layer: ChartLayerRenderer<RingArcRow, number, number> = {
    ...raw,
    mount(container, requestRender) {
      const surface = raw.mount(container, requestRender)

      return {
        renderer: layer,
        get element() {
          return surface.element
        },
        supportsStateFocus: true,
        render: surface.render,
        paintFocus: (...args) => surface.paintFocus(...args),
        destroy: surface.destroy,
      }
    },
    compose(defaultRenderer) {
      const existing = composed.get(defaultRenderer)

      if (existing !== undefined) {
        return existing
      }

      const renderer = composeLayers(defaultRenderer, layer)
      composed.set(defaultRenderer, renderer)

      return renderer
    },
  }

  return {
    renderer: layer,
    configure(next: RingChartProps, nextSize: number) {
      if ((props?.geometryScrubbing === true) !== (next.geometryScrubbing === true) && active) {
        destroy()
        active = true
      }

      props = next
      size = nextSize
      sync()
    },
    start,
    hover(index: number | null) {
      hovered = index

      for (const visual of visuals.values()) {
        visual.hover(props?.geometryScrubbing === true ? null : index)
      }
    },
    scale(index: number) {
      if (props === undefined || props.geometryScrubbing === true) {
        return 1
      }

      return visuals.get(index)?.scale() ?? 1
    },
    destroy,
  }
}
