import { sankeyHoverVars } from './hover-css'
import type { SankeyChartProps } from './props'

/** Source Node/Link props belong to each authored carrier; duplicated graph paint shares semantic hover indexes. */
export function styleOccurrences(root: HTMLElement, props: SankeyChartProps) {
  for (const group of root.querySelectorAll<SVGGElement>("g[data-ts-key^='sankey:']")) {
    const key = group.getAttribute('data-ts-key') ?? ''
    const occurrence = /-role-(\d+)(?:-node-\d+)?$/u.exec(key)?.[1]
    const role = occurrence === undefined ? undefined : props.children?.at(Number(occurrence))
    if (role === undefined || (role.role !== 'node' && role.role !== 'link')) continue
    const vars =
      role.role === 'node'
        ? sankeyHoverVars(role.props.fadedOpacity ?? 0.4, 0.1, 0.5)
        : sankeyHoverVars(0.4, role.props.fadedOpacity ?? 0.1, role.props.strokeOpacity ?? 0.5)
    for (const [name, value] of Object.entries(vars)) group.style.setProperty(name, String(value))
    const node = /:sankey-node-(\d+)/u.exec(key)?.[1]
    if (node !== undefined) group.style.setProperty('--bkm-sk-i', node)
    const label = /:([nv]label)-role-\d+-node-(\d+)/u.exec(key)?.[2]
    if (label !== undefined) {
      const stagger =
        (Number(label) / Math.max(1, props.data.nodes.length)) *
        (props.animationDuration ?? 1100) *
        0.24
      for (const text of group.querySelectorAll<SVGTextElement>(':scope > text'))
        text.style.setProperty('--bkm-sankey-stagger', `${stagger}ms`)
    }
  }
}
