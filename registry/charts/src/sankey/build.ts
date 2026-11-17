import type { SankeyTextWidth } from './label-geometry'
import { createPaintFeed } from './paint-feed'
import type { SankeyPaintFeed } from './paint-feed'
import type { DomChartDefinition, ChartTooltipExtension } from '@tanstack/charts'
import type { SankeyDatum, SankeyMarkConfig } from './marks'
import { defineChart } from '@tanstack/charts/scene'
import { createSankeyMark, intFmt } from './marks'
import type { SankeyChartProps } from './props'
import { createSankeyFocus, sankeyTooltipKey } from './focus'
import { toNativeTransition } from './entrance'
import { nativeTooltip } from './private/native-tooltip'
import { hasText } from '../kit/guards'
import { SankeyNode, SankeyLink } from './carriers'
import type { SankeyNodeProps, SankeyLinkProps, SankeyTooltipProps } from './carriers'

export function sankeyPlan(
  props: SankeyChartProps,
  normalizedData: SankeyChartProps['data'] = sanitizeSankeyData(props.data),
) {
  let node: SankeyNodeProps = {},
    link: SankeyLinkProps = {},
    tooltip: SankeyTooltipProps = {}

  for (const child of props.children ?? [])
    switch (child.role) {
      case 'node':
        node = child.props
        break
      case 'link':
        link = child.props
        break
      case 'tooltip':
        tooltip = child.props
        break
    }

  const data = normalizedData

  const nodeColor = (index: number): string => {
    if (hasText(node.fill)) return node.fill

    const datum = data.nodes.at(index),
      custom = node.getNodeColor ?? link.getNodeColor

    return custom !== undefined && datum !== undefined
      ? custom({ ...datum, index }, index)
      : `var(--chart-${(index % 5) + 1})`
  }

  return {
    data,
    node,
    link,
    tooltip,
    paintChildren: [SankeyLink(link), SankeyNode(node)],
    nodeColor,
    margin: { top: 40, right: 180, bottom: 40, left: 180, ...props.margin },
  }
}

export function sanitizeSankeyData(data: SankeyChartProps['data']): SankeyChartProps['data'] {
  const valid = (value: number) => Number.isFinite(value) && value >= 0

  if (!data.links.some((link) => valid(link.value) && link.value > 0))
    return { nodes: [], links: [] }

  return data.links.every((link) => valid(link.value))
    ? data
    : {
        nodes: data.nodes,
        links: data.links.map((link) => (valid(link.value) ? link : { ...link, value: 0 })),
      }
}

export function sankeyDefinition(
  props: SankeyChartProps,
  id: string,
  reverse: (value: boolean) => void,
  now: () => number,
  plan: ReturnType<typeof sankeyPlan> = sankeyPlan(props),
  feed: SankeyPaintFeed = createPaintFeed(),
  tooltipExtension?: ChartTooltipExtension,
  measureTextWidth?: SankeyTextWidth,
): DomChartDefinition<SankeyDatum, number, number> {
  const { data, tooltip, margin } = plan

  const nodeWidth = props.nodeWidth ?? 16,
    duration = props.animationDuration ?? 1100
  const roles: Array<SankeyMarkConfig> = plan.paintChildren.flatMap((child, occurrence) => {
    if (child.role !== 'node' && child.role !== 'link') return []
    const { node, link } = plan
    const nodeColor = (index: number, laidOut?: import('./types').SankeyPropNode): string => {
      if (hasText(node.fill)) return node.fill
      const datum = data.nodes.at(index),
        custom = node.getNodeColor ?? link.getNodeColor
      return custom !== undefined && datum !== undefined
        ? custom(laidOut ?? { ...datum, index }, index)
        : `var(--chart-${(index % 5) + 1})`
    }
    return [
      {
        occurrence,
        role: child.role,
        now,
        data,
        enter: {
          durationMs: duration,
          transition: toNativeTransition(props.enterTransition, duration),
        },
        ...(node.formatValue === undefined ? {} : { formatValue: node.formatValue }),
        labelOrientation: node.labelOrientation ?? 'horizontal',
        lineCap: node.lineCap ?? 4,
        linkStroke: (row, sourceColor, gradientId, laidOut) => {
          const index = row.sourceIndex ?? data.links.indexOf(row.data),
            value = laidOut ?? { ...row.data, index },
            pattern = link.getLinkPattern?.(value, index)
          if (hasText(pattern)) return `url(#${id}-role-${occurrence}-${pattern})`
          if (hasText(link.stroke)) return link.stroke
          if (link.getLinkColor) return link.getLinkColor(value, index)
          return gradientId === null ? sourceColor : `url(#${id}-${gradientId})`
        },
        onLayout: (graph, links) => {
          if (child.role === 'link') {
            for (const [index, row] of links.entries())
              feed.linkKeys.set(
                `${occurrence}:${index}`,
                `${row.sourceKey}-${row.targetKey}-${row.width}`,
              )
          }

          if (
            child.role !== 'link' ||
            !(link.useGradient ?? true) ||
            hasText(link.stroke) ||
            link.getLinkColor !== undefined
          )
            return
          for (const [index, row] of links.entries()) {
            feed.gradients.push({
              tag: 'linearGradient',
              attributes: {
                id: `${id}-sankey-flow-${index}-role-${occurrence}`,
                gradientUnits: 'userSpaceOnUse',
                x1: row.x1,
                x2: row.x2,
                y1: 0,
                y2: 0,
              },
              children: [
                {
                  tag: 'stop',
                  attributes: {
                    offset: '0%',
                    'stop-color': nodeColor(row.sourceKey, graph.nodes.get(row.sourceKey)),
                  },
                },
                {
                  tag: 'stop',
                  attributes: {
                    offset: '100%',
                    'stop-color': nodeColor(row.targetKey, graph.nodes.get(row.targetKey)),
                  },
                },
              ],
            })
          }
        },
        nodeColor,
        nodePadding: props.nodePadding ?? 24,
        nodeWidth,
        sideMargin: { left: margin.left, right: margin.right },
        showLabels: node.showLabels ?? true,
        showValueLabels: node.showValueLabels ?? true,
        strokeOpacity: link.strokeOpacity ?? 0.5,
        useGradient: link.useGradient ?? true,
      },
    ]
  })

  return defineChart(
    ({ width }) => {
      feed.gradients = []
      feed.linkKeys.clear()
      const reversed = width - margin.left - margin.right < nodeWidth
      reverse(reversed)

      return {
        gradients: [],
        guides: false,
        margin: { top: margin.top, bottom: margin.bottom, left: 0, right: 0 },
        marks:
          roles.at(0) === undefined
            ? []
            : roles.slice(0, 1).map((first) =>
                createSankeyMark(
                  {
                    ...first,
                    roles,
                    beginLayout: () => {
                      feed.gradients = []
                    },
                  },
                  measureTextWidth,
                ),
              ),
        scales: { x: null, y: null },
      }
    },
    {
      focus: createSankeyFocus((markId, index, x, y) => feed.hit?.(markId, index, x, y) ?? null),
      focusRing: false,
      tooltip: {
        anchor: 'pointer',
        className: String.raw`bkm-sankey-tooltip ${tooltip?.className ?? ''}`,
        motion: {
          type: 'spring',
          stiffness: 100,
          damping: 20,
          mass: 1,
          restSpeed: 2,
          restDelta: 0.5,
        },
        offset: 16,
        sticky: false,
        use: tooltipExtension ?? nativeTooltip(`${id}-tooltip`, true, sankeyTooltipKey),
      },
    },
  )
}

export const formatSankeyInt = (value: number): string => intFmt.format(value)

export function sameSankeyDrawing(a: SankeyChartProps, b: SankeyChartProps): boolean {
  const values = (p: SankeyChartProps) => {
    const { node, link, tooltip, margin } = sankeyPlan(p)

    return [
      p.data,
      ...(p.children ?? []).flatMap((child) => [child.role, ...Object.values(child.props)]),
      p.animationDuration,
      p.enterTransition,
      p.revealSignature,
      p.aspectRatio,
      p.nodeWidth,
      p.nodePadding,
      p.ariaLabel,
      p.ariaDescription,
      margin.top,
      margin.right,
      margin.bottom,
      margin.left,
      node.fill,
      node.lineCap,
      node.fadedOpacity,
      node.showLabels,
      node.showValueLabels,
      node.formatValue,
      node.labelOrientation,
      node.getNodeColor,
      link.stroke,
      link.strokeOpacity,
      link.fadedOpacity,
      link.useGradient,
      link.getNodeColor,
      link.getLinkColor,
      link.patterns,
      link.getLinkPattern,
      tooltip?.nodeContent,
      tooltip?.linkContent,
      tooltip?.formatValue,
      tooltip?.className,
    ]
  }

  const left = values(a),
    right = values(b)

  return (
    left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  )
}
