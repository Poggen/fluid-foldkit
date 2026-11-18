import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type { ChartRenderer, ChartScene, SceneNode } from '@tanstack/charts'
import { keyIs } from '../kit/renderer-dom'
import { mountNotchMotion } from './notch-motion'
import type { GaugeNotchRow } from './notches'
import type { GaugeProps } from './props'

interface GaugeEntrance {
  readonly props: GaugeProps
  readonly reduced: boolean
  readonly scrub: boolean
}

type Scene = ChartScene<GaugeNotchRow, number, number>

type NotchNode = Extract<SceneNode, { readonly kind: 'area' | 'rect' }>

const notchNodes: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<NotchNode> = (
  nodes: ReadonlyArray<SceneNode>,
) =>
  nodes.flatMap((node) => {
    if (node.kind === 'group') {
      return notchNodes(node.children)
    }

    return node.kind === 'area' || node.kind === 'rect' ? [node] : []
  })

const resetNotch = (element: SVGElement) => {
  element.removeAttribute('opacity')
  element.removeAttribute('transform')

  for (const property of ['opacity', 'transform', 'transform-origin', 'transform-box']) {
    element.style.removeProperty(property)
  }
}

/** One entrance owner per actual notch; renderer updates retain geometry and Motion keeps its playhead. */
export function createGaugeRenderer(read: () => GaugeEntrance) {
  const base = createSvgChartRenderer<GaugeNotchRow, number, number>()

  const renderer: ChartRenderer<GaugeNotchRow, number, number> = {
    ...base,
    mount(container, requestRender) {
      const surface = base.mount(container, requestRender)
      const owners = new Map<SVGElement, ReturnType<typeof mountNotchMotion>>()

      const sync = (scene: Scene) => {
        const entrance = read()
        const seen = new Set<SVGElement>()
        const points = new Map(scene.points.map((point) => [point.key, point]))

        for (const node of notchNodes(scene.nodes)) {
          const pointKey = node.interaction?.point?.key ?? node.interaction?.points?.[0]?.key
          const point = pointKey === undefined ? undefined : points.get(pointKey)

          if (point === undefined) {
            throw new TypeError('Gauge notch requires its public Scene point')
          }

          const element = container.querySelector<SVGElement>(keyIs(CSS.escape(node.key)))

          if (element === null) {
            throw new TypeError('Gauge renderer did not paint its Scene notch')
          }

          seen.add(element)
          const owner = owners.get(element)

          if (entrance.scrub) {
            owner?.destroy()
            owners.delete(element)
            resetNotch(element)
          } else if (owner === undefined) {
            owners.set(
              element,
              mountNotchMotion(
                element,
                entrance.props,
                point.datum.index,
                point.markId === 'gauge:active',
                entrance.reduced,
              ),
            )
          } else {
            owner.restore()
          }
        }

        for (const [element, owner] of owners) {
          if (!seen.has(element)) {
            owner.destroy()
            owners.delete(element)
          }
        }
      }

      return {
        renderer,
        supportsStateFocus: true,
        paintFocus: (...args) => surface.paintFocus(...args),
        clientToScene: (scene, x, y) => surface.clientToScene?.(scene, x, y) ?? null,
        get element() {
          return surface.element
        },
        render(scene, options) {
          surface.render(scene, options)
          sync(scene)
        },
        destroy() {
          for (const owner of owners.values()) {
            owner.destroy()
          }

          owners.clear()
          surface.destroy()
        },
      }
    },
  }

  return renderer
}
