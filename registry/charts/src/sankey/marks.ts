/* @license Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT. */
import { callbackGraph } from './callback-graph'
import type { SankeyPropNode, SankeyPropLink } from './types'

import { link } from '@tanstack/charts/link'
import {
  NAME_FONT_SIZE,
  VALUE_FONT_SIZE,
  VALUE_LABEL_OPACITY,
  placeLabels,
  labelHitBoxes,
  baselineShift,
  intFmt,
} from './label-geometry'
import type { LabelRow, NodeLayoutRow, NodeRowShape, SankeyTextWidth } from './label-geometry'
import { rect } from '@tanstack/charts/rect'
import { text } from '@tanstack/charts/text'
import { sankeyDiagram } from '@tanstack/charts/network/sankey'
import { BUMP_CURVE } from './bump'
import type { ChartLinearGradient, ChartMotionTransition } from '@tanstack/charts'

export interface SankeyNodeInput {
  readonly name: string
  readonly category?: string
  readonly [key: string]: unknown
}

interface SankeyLinkInput {
  readonly source: number
  readonly target: number
  readonly value: number
  readonly [key: string]: unknown
}

interface SankeyInputData {
  readonly nodes: ReadonlyArray<SankeyNodeInput>
  readonly links: ReadonlyArray<SankeyLinkInput>
}

type LabelOrientation = 'horizontal' | 'vertical'

export interface SankeyMarkConfig {
  readonly occurrence?: number
  readonly role?: 'node' | 'link'
  readonly roles?: ReadonlyArray<SankeyMarkConfig>
  readonly now: () => number
  readonly data: SankeyInputData
  readonly nodeWidth: number
  readonly nodePadding: number
  /** bklit's side margins: the diagram is laid out in the full chart width and mapped into the area they leave (see `layoutColumns`). */
  readonly sideMargin: { readonly left: number; readonly right: number }
  readonly nodeColor: (index: number, node?: SankeyPropNode) => string
  readonly beginLayout?: () => void
  readonly onLayout?: (
    graph: ReturnType<typeof callbackGraph>,
    links: ReadonlyArray<SankeyInputLinkRow>,
  ) => void
  readonly linkStroke: (
    link: SankeyInputLinkRow,
    sourceColor: string,
    gradientId: string | null,
    laidOut?: SankeyPropLink,
  ) => string
  readonly useGradient: boolean
  readonly strokeOpacity: number
  readonly lineCap: number
  readonly showLabels: boolean
  readonly showValueLabels: boolean
  readonly formatValue?: (value: number) => string
  readonly labelOrientation: LabelOrientation
  readonly enter: SankeyEnter
}

interface SankeyInputLinkRow {
  readonly sourceIndex?: number | undefined
  readonly key: unknown
  readonly sourceKey: number
  readonly targetKey: number
  readonly x1: number
  readonly x2: number
  readonly y1: number
  readonly y2: number
  readonly width: number
  readonly data: SankeyInputLink
}

type SankeyInputLink = SankeyLinkInput

interface SankeyEnter {
  readonly durationMs: number
  readonly transition: ChartMotionTransition
}

const SANKEY_LABEL_FILL = 'var(--bkm-foreground)'

const flowGradientId: (index: number, occurrence?: number) => string = (
  index: number,
  occurrence?: number,
) => `sankey-flow-${index}${occurrence === undefined ? '' : `-role-${occurrence}`}`

const mix: (color: string, percent: number) => string = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${Math.round(percent * 100)}%, transparent)`

const buildSankeyGradients: (
  data: SankeyInputData,
  nodeColor: (index: number) => string,
  reversed: boolean,
  occurrence?: number,
) => ReadonlyArray<ChartLinearGradient> = (
  data: SankeyInputData,
  nodeColor: (index: number) => string,
  reversed: boolean,
  occurrence?: number,
) =>
  data.links.map((linkDatum, index) => ({
    id: flowGradientId(index, occurrence),
    stops: [
      { color: nodeColor(reversed ? linkDatum.target : linkDatum.source), offset: 0 },
      { color: nodeColor(reversed ? linkDatum.source : linkDatum.target), offset: 1 },
    ],
    x1: 0,
    x2: 1,
    y1: 0,
    y2: 0,
  }))

interface LayoutNode {
  readonly key: number
  readonly layer: number
  readonly x0: number
  readonly x1: number
}

interface LayoutLink {
  readonly sourceKey: number
  readonly targetKey: number
  readonly x1: number
  readonly x2: number
}

interface ColumnArea {
  readonly x: number
  readonly width: number
}

interface ColumnLayout<Node, Link> {
  readonly nodes: ReadonlyArray<Node>
  readonly links: ReadonlyArray<Link>
  readonly area: ColumnArea
}

const layoutColumns: <Node extends LayoutNode, Link extends LayoutLink>(
  nodes: ReadonlyArray<Node>,
  links: ReadonlyArray<Link>,
  chart: ColumnArea,
  config: Pick<SankeyMarkConfig, 'nodeWidth' | 'sideMargin'>,
) => ColumnLayout<Node, Link> = <Node extends LayoutNode, Link extends LayoutLink>(
  nodes: ReadonlyArray<Node>,
  links: ReadonlyArray<Link>,
  chart: ColumnArea,
  config: Pick<SankeyMarkConfig, 'nodeWidth' | 'sideMargin'>,
) => {
  const area = {
    width: chart.width - config.sideMargin.left - config.sideMargin.right,
    x: chart.x + config.sideMargin.left,
  }

  let lastLayer = 0

  for (const node of nodes) {
    lastLayer = Math.max(lastLayer, node.layer)
  }

  const step = lastLayer > 0 ? (area.width - config.nodeWidth) / lastLayer : 0

  const placed = nodes.map((node) => ({
    ...node,
    x0: area.x + node.layer * step,
    x1: area.x + node.layer * step + config.nodeWidth,
  }))

  const byKey = new Map(placed.map((node) => [node.key, node]))

  const joined = links.map((row) => ({
    ...row,
    x1: byKey.get(row.sourceKey)?.x1 ?? row.x1,
    x2: byKey.get(row.targetKey)?.x0 ?? row.x2,
  }))

  return { area, links: joined, nodes: placed } satisfies ColumnLayout<Node, Link>
}

const createSankeyMark: (
  config: Readonly<SankeyMarkConfig>,
  measureTextWidth?: SankeyTextWidth,
) => ReturnType<typeof sankeyDiagram> = (
  config: Readonly<SankeyMarkConfig>,
  measureTextWidth?: SankeyTextWidth,
) => {
  return sankeyDiagram({
    align: 'center',
    id: 'sankey',
    links: config.data.links,
    marks: (layout) => {
      const { chart: bounds, nodes: laidNodes, links: laidLinks } = layout
      // WARNING: SAFETY: sankeyDiagram's laid-out rows carry key/layer/x0..y2/width/data exactly as NodeLayoutRow and SankeyInputLinkRow declare (package row types are looser).
      const columns = layoutColumns(
        laidNodes.map((row) => ({ ...row, key: row.sourceIndexes[0] ?? 0 })),
        laidLinks.map((row) => ({
          ...row,
          sourceKey: row.sourceNode.sourceIndexes[0] ?? 0,
          targetKey: row.targetNode.sourceIndexes[0] ?? 0,
        })),
        bounds,
        config,
      )

      config.beginLayout?.()
      const callbacks = callbackGraph(columns.nodes, columns.links, {
        x: columns.area.x,
        y: bounds.y,
      })
      let labelFamily: string | undefined
      const build = (config: Readonly<SankeyMarkConfig>) => {
        const suffix = config.occurrence === undefined ? '' : `-role-${config.occurrence}`
        config.onLayout?.(callbacks, columns.links)
        const chart = columns.area
        const fullNodes: ReadonlyArray<NodeLayoutRow> = columns.nodes
        const fullLinks = columns.links

        const labels =
          config.role !== 'link' && config.showLabels
            ? placeLabels(
                fullNodes,
                chart,
                config.labelOrientation,
                config.showValueLabels,
                config.formatValue,
              )
            : []

        if (labels.length > 0 && labelFamily === undefined)
          labelFamily =
            typeof document === 'undefined'
              ? 'sans-serif'
              : getComputedStyle(document.body).fontFamily

        const hitBoxesOf = new Map(
          labels.map((label) => [
            label.key,
            labelHitBoxes(
              label,
              config.showValueLabels,
              labelFamily ?? 'sans-serif',
              measureTextWidth,
            ),
          ]),
        )

        const nodeRows: Array<NodeRowShape> = fullNodes.map((row) => ({
          ...row,
          labelBoxes: hitBoxesOf.get(row.key) ?? [],
          radius: config.lineCap,
        }))

        const linkRows = fullLinks

        const flow = link(linkRows, {
          curve: BUMP_CURVE,
          id: `flow${suffix}`,
          lineCap: 'butt',

          motion: false,
          stroke: (row, { index }: { readonly index: number }) => {
            const sourceColor = config.nodeColor(row.sourceKey, callbacks.nodes.get(row.sourceKey))

            return config.linkStroke(
              row,
              sourceColor,
              config.useGradient ? flowGradientId(index, config.occurrence) : null,
              callbacks.links.get(row.sourceIndex ?? index),
            )
          },
          strokeOpacity: config.strokeOpacity,
          strokeWidth: (row) => Math.max(1, row.width),
          x1: 'x1',
          x2: 'x2',
          y1: 'y1',
          y2: 'y2',
        })

        const nodeMarks = nodeRows.map((row, nodeIndex) =>
          rect([row], {
            fill: config.nodeColor(row.key, callbacks.nodes.get(row.key)),
            id: `sankey-node-${nodeIndex}${suffix}`,
            inset: 0,
            key: 'key',

            motion: false,
            radius: config.lineCap,
            x1: 'x0',
            x2: 'x1',
            y1: 'y0',
            y2: 'y1',
          }),
        )

        if (config.role === 'link') return [flow]
        const flows = config.role === 'node' ? [] : [flow]

        if (!config.showLabels) {
          return [...flows, ...nodeMarks]
        }

        const nameOptions = {
          anchor: (row) => row.anchor,
          dx: (row) => baselineShift(NAME_FONT_SIZE, row.rotate).dx,
          dy: (row) => baselineShift(NAME_FONT_SIZE, row.rotate).dy,
          fill: SANKEY_LABEL_FILL,
          fontSize: NAME_FONT_SIZE,
          fontWeight: 500,
          id: `nlabel${suffix}`,
          key: 'key',
          motion: false,
          rotate: (row) => row.rotate,
          text: 'name',
          x: 'nameX',
          y: 'nameY',
        } satisfies Parameters<typeof text<LabelRow>>[1]
        const nameMark = text(labels, nameOptions)
        const nodeNames = labels.map((label, index) =>
          text([label], {
            ...nameOptions,
            id: `${nameOptions.id}-node-${index}`,
          }),
        )

        if (!config.showValueLabels) {
          if (config.role === 'node')
            return nodeMarks.flatMap((node, index) => {
              const name = nodeNames.at(index)
              return name === undefined ? [node] : [node, name]
            })
          return [...flows, ...nodeMarks, nameMark]
        }

        const valueOptions = {
          anchor: (row) => row.anchor,
          dx: (row) => baselineShift(VALUE_FONT_SIZE, row.rotate).dx,
          dy: (row) => baselineShift(VALUE_FONT_SIZE, row.rotate).dy,
          fill: mix(SANKEY_LABEL_FILL, VALUE_LABEL_OPACITY),
          fontSize: VALUE_FONT_SIZE,
          id: `vlabel${suffix}`,
          key: 'key',
          motion: false,
          rotate: (row) => row.rotate,
          text: 'value',
          x: 'valueX',
          y: 'valueY',
        } satisfies Parameters<typeof text<LabelRow>>[1]
        const valueMark = text(labels, valueOptions)
        const nodeValues = labels.map((label, index) =>
          text([label], {
            ...valueOptions,
            id: `${valueOptions.id}-node-${index}`,
          }),
        )

        if (config.role === 'node')
          return nodeMarks.flatMap((node, index) => {
            const name = nodeNames.at(index),
              value = nodeValues.at(index)
            return [
              node,
              ...(name === undefined ? [] : [name]),
              ...(value === undefined ? [] : [value]),
            ]
          })
        return [...flows, ...nodeMarks, nameMark, valueMark]
      }
      const [first, ...rest] =
        config.roles === undefined ? build(config) : config.roles.flatMap(build)
      if (first !== undefined)
        return [first, ...rest] satisfies readonly [typeof first, ...typeof rest]

      const empty = text([], { id: 'empty', text: () => '', x: () => 0, y: () => 0 })
      return [empty] satisfies readonly [typeof empty]
    },
    nodeKey: (_node, { index }) => index,
    nodePadding: config.nodePadding,

    nodeWidth: 1,
    nodes: config.data.nodes,
    source: (row) => row.source,
    target: (row) => row.target,
    value: (row) => row.value,
  })
}

type SankeyDatum = SankeyInputLinkRow | NodeRowShape | LabelRow

export { buildSankeyGradients, createSankeyMark, intFmt }

export type { SankeyDatum, LabelOrientation, SankeyInputData, SankeyInputLinkRow }
