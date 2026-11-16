import type { ChartPoint, SceneGroup, SceneNode } from '@tanstack/charts'
import { SVG_NS } from '../ring/svg-layer'
import { createRadarLabelVisual } from './label-visual'
import type { RadarLabelPosition } from './label-visual'
import type { RadarChartProps } from './options'
import type { RadarRow } from './rows'

const labelGroup = (nodes: ReadonlyArray<SceneNode>): SceneGroup | undefined => {
  for (const node of nodes) {
    if (node.kind !== 'group') {
      continue
    }

    if (node.className?.split(/\s+/u).includes('bkm-radar-axis-labels') === true) {
      return node
    }

    const nested = labelGroup(node.children)

    if (nested !== undefined) {
      return nested
    }
  }

  return undefined
}

export function mountRadarLabels(
  parent: SVGGElement,
  positions: Map<string, RadarLabelPosition>,
  publish: () => void,
) {
  const root = document.createElementNS(SVG_NS, 'g')
  const visuals = new Map<string, ReturnType<typeof createRadarLabelVisual>>()
  parent.append(root)

  return {
    render(
      nodes: ReadonlyArray<SceneNode>,
      points: ReadonlyArray<ChartPoint<RadarRow, string | number, number>>,
      props: RadarChartProps,
    ) {
      const group = labelGroup(nodes)
      const seen = new Set<string>()
      const indices = new Map(points.map((point) => [point.key, point.datumIndex]))

      root.setAttribute('class', group?.className ?? '')

      const interactive = group?.className?.split(/\s+/u).includes('bkm-radar-label-i') ?? false
      let cursor = root.firstChild

      for (const node of group?.children ?? []) {
        if (node.kind !== 'label') {
          continue
        }

        seen.add(node.key)

        let visual = visuals.get(node.key)

        if (visual === undefined) {
          const index = indices.get(node.key)

          if (index === undefined) {
            throw new TypeError('Radar label requires its public Scene point')
          }

          const animate = props.animate ?? true
          visual = createRadarLabelVisual(
            root,
            node,
            interactive,
            animate,
            animate ? (props.levels ?? 5) * 0.04 + index * 0.08 : 0,
            (position) => {
              positions.set(node.key, position)
              publish()
            },
          )
          visuals.set(node.key, visual)
        } else {
          visual.update(node, interactive, props.animate ?? true)
        }

        if (visual.element !== cursor) {
          if (cursor === null) {
            if (visual.element !== root.lastChild) {
              root.append(visual.element)
            }
          } else {
            cursor.before(visual.element)
          }
        }

        cursor = visual.element.nextSibling
      }

      for (const [key, visual] of visuals) {
        if (!seen.has(key)) {
          visual.destroy()
          visuals.delete(key)
          positions.delete(key)
        }
      }
    },
    destroy() {
      for (const [key, visual] of visuals) {
        visual.destroy()
        positions.delete(key)
      }

      visuals.clear()
      root.remove()
    },
  }
}
