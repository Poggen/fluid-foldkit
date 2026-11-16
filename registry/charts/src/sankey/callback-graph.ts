import type { SankeyPropNode, SankeyPropLink } from './types'
import type { SankeyInputLinkRow } from './marks'
import type { NodeLayoutRow } from './label-geometry'

interface NodeLayout extends NodeLayoutRow {
  readonly value: number
  readonly depth: number
  readonly height: number
  readonly layer: number
  readonly outgoingLinks: ReadonlyArray<{ readonly sourceIndex: number }>
  readonly incomingLinks: ReadonlyArray<{ readonly sourceIndex: number }>
}
interface CallbackNode extends SankeyPropNode {
  readonly sourceLinks: Array<SankeyPropLink>
  readonly targetLinks: Array<SankeyPropLink>
}

/** Adapt the complete public native Sankey layout to the actual d3 callback graph, in source inner-chart coordinates. */
export function callbackGraph(
  rows: ReadonlyArray<NodeLayout>,
  links: ReadonlyArray<SankeyInputLinkRow>,
  origin: { readonly x: number; readonly y: number },
) {
  const nodes: Array<CallbackNode> = rows.map((row) => ({
    ...row.data,
    index: row.key,
    value: row.value,
    depth: row.depth,
    height: row.height,
    layer: row.layer,
    x0: row.x0 - origin.x,
    x1: row.x1 - origin.x,
    y0: row.y0 - origin.y,
    y1: row.y1 - origin.y,
    sourceLinks: [],
    targetLinks: [],
  }))
  const nodeByIndex = new Map(nodes.map((node) => [node.index, node]))
  const placed = links.map((row, index): SankeyPropLink => ({
    ...row.data,
    index: row.sourceIndex ?? index,
    source: nodeByIndex.get(row.sourceKey) ?? row.sourceKey,
    target: nodeByIndex.get(row.targetKey) ?? row.targetKey,
    y0: row.y1 - origin.y,
    y1: row.y2 - origin.y,
    width: row.width,
  }))
  const linkByIndex = new Map(placed.map((link) => [link.index, link]))
  for (const row of rows) {
    const node = nodeByIndex.get(row.key)
    if (node === undefined) continue
    for (const link of row.outgoingLinks) {
      const placed = linkByIndex.get(link.sourceIndex)
      if (placed !== undefined) node.sourceLinks.push(placed)
    }
    for (const link of row.incomingLinks) {
      const placed = linkByIndex.get(link.sourceIndex)
      if (placed !== undefined) node.targetLinks.push(placed)
    }
  }
  return { nodes: nodeByIndex, links: linkByIndex }
}
