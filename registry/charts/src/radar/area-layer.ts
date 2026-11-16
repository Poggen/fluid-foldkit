import type {
  ChartLayerRenderer,
  ChartPoint,
  ChartRenderer,
  ChartScene,
  SceneNode,
} from '@tanstack/charts'
import { createSvgLayer } from '../ring/svg-layer'
import { composeLayers } from '../ring/compose-layers'
import { createRadarAreaVisual } from './area-visual'
import { mountRadarLabels } from './label-layer'
import type { RadarLabelPosition } from './label-visual'
import { extract } from './extract'
import type { RadarChartProps } from './options'
import type { RadarRow } from './rows'

type Point = ChartPoint<RadarRow, string | number, number>

type Scene = ChartScene<RadarRow, string | number, number>

type Visual = ReturnType<typeof createRadarAreaVisual>

const activeRoles = (
  nodes: ReadonlyArray<SceneNode>,
  roles: ReadonlyArray<number>,
): Set<number> => {
  const found = new Set<number>()

  for (const node of nodes) {
    if (node.kind !== 'group') {
      continue
    }

    const classes = node.className?.split(/\s+/u) ?? []

    for (const role of roles) {
      if (classes.includes(`bkm-radar-role${role}`)) {
        found.add(role)
      }
    }

    for (const role of activeRoles(node.children, roles)) {
      found.add(role)
    }
  }

  return found
}

export function createRadarAreaLayer() {
  let props: RadarChartProps | undefined
  let hovered: number | null = null

  const composed = new WeakMap<
    ChartRenderer<RadarRow, string | number, number>,
    ChartRenderer<RadarRow, string | number, number>
  >()

  const listeners = new Set<() => void>()
  const visuals = new Map<number, Visual>()

  const labelPositions = new Map<string, RadarLabelPosition>()

  const publish = () => {
    for (const listener of listeners) {
      listener()
    }
  }

  const progressOf = (series: number): number => {
    if (props === undefined) {
      return 1
    }

    const { areas } = extract(props.children)

    for (const [role, visual] of visuals) {
      if (areas[role]?.index === series) {
        return visual.progress()
      }
    }

    return 1
  }

  const raw = createSvgLayer<RadarRow, string | number>('radar-source-areas', (svg) => {
    const root = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svg.append(root)

    const labels = mountRadarLabels(root, labelPositions, publish)

    return {
      destroy() {
        labels.destroy()
        root.remove()
      },
      render(scene) {
        if (props === undefined) {
          return
        }

        root.setAttribute('transform', `translate(${scene.width / 2} ${scene.height / 2})`)
        labels.render(scene.nodes, scene.points, props)

        const { areas } = extract(props.children)

        const active = activeRoles(
          scene.nodes,
          areas.map((_, role) => role),
        )

        for (const [role] of areas.entries()) {
          if (!active.has(role)) {
            continue
          }

          const visual = visuals.get(role)

          if (visual !== undefined) {
            root.append(visual.element)
          }
        }

        for (const [role, visual] of visuals) {
          if (!active.has(role) && visual.element.parentNode === root) {
            visual.element.remove()
          }
        }
      },
    }
  })

  const layer: ChartLayerRenderer<RadarRow, string | number, number> = {
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

      const base = composeLayers(defaultRenderer, layer)

      const renderer: ChartRenderer<RadarRow, string | number, number> = {
        ...base,
        mount(container, requestRender) {
          const surface = base.mount(container, requestRender)
          let scene: Scene | undefined
          const presentationListeners = new Set<(points: ReadonlyArray<Point>) => void>()

          const points = (): ReadonlyArray<Point> | undefined => {
            if (scene === undefined) {
              return undefined
            }

            const current = surface.getPresentationPoints?.() ?? scene.points

            const cx = scene.width / 2
            const cy = scene.height / 2

            return current.map((point) => {
              if (point.datum.series < 0) {
                const label = labelPositions.get(point.key)

                return label === undefined ? point : { ...point, x: cx + label.x, y: cy + label.y }
              }

              const progress = progressOf(point.datum.series)

              return {
                ...point,
                x: cx + (point.x - cx) * progress,
                y: cy + (point.y - cy) * progress,
              }
            })
          }

          const notify = () => {
            const current = points()

            if (current === undefined) {
              return
            }

            for (const listener of presentationListeners) {
              listener(current)
            }
          }

          listeners.add(notify)
          const release = surface.subscribePresentationPoints?.(notify)

          return {
            renderer,
            get element() {
              return surface.element
            },
            get defaultElement() {
              return surface.defaultElement ?? surface.element
            },
            get layers() {
              return surface.layers ?? []
            },
            supportsStateFocus: true,
            getPresentationPoints: points,
            subscribePresentationPoints(listener) {
              presentationListeners.add(listener)

              return () => {
                presentationListeners.delete(listener)
              }
            },
            clientToScene: (current, x, y) => surface.clientToScene?.(current, x, y) ?? null,
            paintFocus: (...args) => surface.paintFocus(...args),
            render(current, options) {
              scene = current
              surface.render(current, options)
              notify()
            },
            destroy() {
              listeners.delete(notify)
              release?.()
              presentationListeners.clear()
              surface.destroy()
            },
          }
        },
      }

      composed.set(defaultRenderer, renderer)

      return renderer
    },
  }

  return {
    layer,
    configure(next: RadarChartProps) {
      props = next

      const { areas } = extract(next.children)

      for (const [role, area] of areas.entries()) {
        let visual = visuals.get(role)

        if (visual === undefined) {
          visual = createRadarAreaVisual(next, area, publish)
          visuals.set(role, visual)
        } else {
          visual.configure(next, area)
        }

        visual.hover(hovered)
      }

      for (const [role, visual] of visuals) {
        if (role >= areas.length) {
          visual.destroy()
          visuals.delete(role)
        }
      }
    },
    destroy() {
      for (const visual of visuals.values()) {
        visual.destroy()
      }

      visuals.clear()
      listeners.clear()
    },
    hover(index: number | null) {
      hovered = index

      for (const visual of visuals.values()) {
        visual.hover(index)
      }
    },
  }
}
