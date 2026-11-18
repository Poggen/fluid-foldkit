import type { Html } from 'foldkit/html'
import { sankey, sankeyCenter } from 'd3-sankey'
import type { SankeyGraph, SankeyLink, SankeyNode } from 'd3-sankey'
import type { Transition } from '../kit/motion/phase'
import type { Margin, SankeyNodeDatum } from './types'
import type { SankeyChartProps } from './props'
import type { State } from './block'
import { bumpPath } from './bump'
import { sankeyPlan } from './build'

export const sankeyContext: <Action>(
  props: SankeyChartProps,
  state: State,
  actions: SankeyActions<Action>,
  container: HTMLDivElement | null,
) => SankeyContextValue<Action> = function sankeyContext<Action>(
  props: SankeyChartProps,
  state: State,
  actions: SankeyActions<Action>,
  container: HTMLDivElement | null,
) {
  const { data, margin } = sankeyPlan(props),
    innerWidth = state.width - margin.left - margin.right,
    innerHeight = state.height - margin.top - margin.bottom

  const graph =
    data.links.length === 0
      ? { nodes: [], links: [] }
      : sankey<SankeyNodeDatum, SankeyLayoutLinkDatum>()
          .nodeWidth(props.nodeWidth ?? 16)
          .nodePadding(props.nodePadding ?? 24)
          .nodeAlign(sankeyCenter)
          .extent([
            [0, 0],
            [innerWidth, innerHeight],
          ])({
          nodes: data.nodes.map((node) => ({ ...node })),
          links: data.links.map((link) => ({ ...link })),
        })

  let tooltipData: SankeyTooltipData | null = null

  if (state.tooltipIndex !== null) {
    if (state.tooltipKind === 'node') {
      const node = graph.nodes.at(state.tooltipIndex)

      if (node !== undefined)
        tooltipData = {
          type: 'node',
          nodeIndex: state.tooltipIndex,
          x: state.tooltipAnchor?.x ?? 0,
          y: state.tooltipAnchor?.y ?? 0,
          data: node,
        }
    } else if (state.tooltipKind === 'link') {
      const link = graph.links.at(state.tooltipIndex)

      if (link !== undefined && typeof link.source === 'object' && typeof link.target === 'object')
        tooltipData = {
          type: 'link',
          linkIndex: state.tooltipIndex,
          x: state.tooltipAnchor?.x ?? 0,
          y: state.tooltipAnchor?.y ?? 0,
          data: link,
        }
    }
  }

  return {
    graph,
    nodes: graph.nodes,
    links: graph.links,
    width: state.width,
    height: state.height,
    innerWidth,
    innerHeight,
    margin,
    hoveredNodeIndex:
      props.hoveredNodeIndex === undefined ? state.hoveredNodeIndex : props.hoveredNodeIndex,
    hoveredLinkIndex: state.hoveredLinkIndex,
    setHoveredNodeIndex: actions.focusNode,
    setHoveredLinkIndex: actions.focusLink,
    tooltipData,
    requestTooltip: (request) => actions.tooltip?.(request),
    containerRef: { current: container },
    isLoaded: state.entered,
    animationDuration: props.animationDuration ?? 1100,
    ...(props.enterTransition === undefined ? {} : { enterTransition: props.enterTransition }),
    revealEpoch: state.epoch,
    mousePos: null,
    createPath: (link) => {
      const source = link.source,
        target = link.target

      return typeof source === 'object' && typeof target === 'object'
        ? bumpPath([
            [source.x1 ?? 0, link.y0 ?? 0],
            [target.x0 ?? 0, link.y1 ?? 0],
          ])
        : ''
    },
  } satisfies SankeyContextValue<Action>
}

interface SankeyLayoutLinkDatum {
  readonly value: number
  readonly [key: string]: unknown
}

/** Focused node or link, as exposed by `useSankey()`. */
export interface SankeyTooltipData {
  /** Whether a node or a link is focused. */
  type: 'node' | 'link'
  /** Index of the focused node (when `type` is "node"). */
  nodeIndex?: number
  /** Index of the focused link (when `type` is "link"). */
  linkIndex?: number
  /** Horizontal position of the focused item, relative to the chart. */
  x: number
  /** Vertical position of the focused item, relative to the chart. */
  y: number
  /** The focused node or link, as laid out by d3-sankey. */
  data: SankeyNodeDatum | SankeyLink<SankeyNodeDatum, SankeyLayoutLinkDatum>
}

/** Serializable tooltip selection; custom content and graph metadata stay in chart inputs. */
export interface SankeyTooltipRequest {
  readonly kind: 'node' | 'link' | 'none'
  readonly index: number | null
  /** Position in the inner chart, before margins. Omit to use the native focus anchor. */
  readonly anchor?: { readonly x: number; readonly y: number } | null
}

/** Value returned by `useSankey()`. */
export interface SankeyContextValue<Action = void> {
  /** The d3-sankey graph for the current size. */
  graph: SankeyGraph<SankeyNodeDatum, SankeyLayoutLinkDatum>
  /** Laid-out nodes. */
  nodes: Array<SankeyNode<SankeyNodeDatum, SankeyLayoutLinkDatum>>
  /** Laid-out links. */
  links: Array<SankeyLink<SankeyNodeDatum, SankeyLayoutLinkDatum>>
  /** Chart width in pixels. */
  width: number
  /** Chart height in pixels. */
  height: number
  /** Width inside the margins. */
  innerWidth: number
  /** Height inside the margins. */
  innerHeight: number
  /** Resolved chart margins. */
  margin: Margin
  /** Hovered node index, or `null`. */
  hoveredNodeIndex: number | null
  /** Hovered link index, or `null`. */
  hoveredLinkIndex: number | null
  /** Changes graph node highlighting; `null` clears it without changing tooltip data. */
  setHoveredNodeIndex: (index: number | null) => Action
  /** Changes graph flow highlighting; `null` clears it without changing tooltip data. */
  setHoveredLinkIndex: (index: number | null) => Action
  /** The focused node or link with its anchor position, or `null`. */
  tooltipData: SankeyTooltipData | null
  /** Selects a tooltip and optional inner-chart anchor through a checked native operation. */
  requestTooltip: (request: SankeyTooltipRequest) => Action | undefined
  /** Ref to the chart container element. */
  containerRef: { readonly current: HTMLDivElement | null }
  /** `true` once the enter animation has finished. */
  isLoaded: boolean
  /** Enter animation duration in milliseconds. */
  animationDuration: number
  /** The `enterTransition` prop of the chart, if set. */
  enterTransition?: Transition
  /** Increments when the entrance replays (a new `revealSignature`). */
  revealEpoch: number
  /** Not tracked: the native tooltip follows the pointer itself, so this is always null. */
  mousePos: { x: number; y: number } | null
  /** Returns the SVG path of a link, for custom link rendering. */
  createPath: (link: SankeyLink<SankeyNodeDatum, SankeyLayoutLinkDatum>) => string
}

export interface SankeyActions<Action = void> {
  readonly focusNode: (index: number | null) => Action
  readonly focusLink: (index: number | null) => Action
  readonly tooltip?: (request: SankeyTooltipRequest) => Action
}

export const useSankey: <Action>(
  value: SankeyContextValue<Action>,
) => SankeyContextValue<Action> = <Action>(value: SankeyContextValue<Action>) =>
  value satisfies SankeyContextValue<Action>

export const SankeyProvider: <Action>(argument0: {
  readonly value: SankeyContextValue<Action>
  readonly children: (value: SankeyContextValue<Action>) => Html
}) => Html = <Action>({
  value,
  children,
}: {
  readonly value: SankeyContextValue<Action>
  readonly children: (value: SankeyContextValue<Action>) => Html
}) => children(value) satisfies Html
