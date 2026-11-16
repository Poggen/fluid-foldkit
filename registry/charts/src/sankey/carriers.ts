import type { NativeContent } from './content'
import type { SvgResource } from './resources'
import type { SankeyPropNode, SankeyPropLink } from './types'

export type SankeyLabelOrientation = 'horizontal' | 'vertical'

export interface SankeyNodeProps {
  /**
   * Fill color of the nodes.
   * @default the theme chart colors, by node
   */
  readonly fill?: string
  /**
   * Corner radius of the nodes in pixels.
   * @default 4
   */
  readonly lineCap?: number
  /**
   * Opacity of nodes not connected to the hovered node or link.
   * @default 0.4
   */
  readonly fadedOpacity?: number
  /**
   * Show node names.
   * @default true
   */
  readonly showLabels?: boolean
  /**
   * Show node values under the names.
   * @default true
   */
  readonly showValueLabels?: boolean
  /**
   * Reading direction of the labels outside the nodes.
   * @default "horizontal"
   */
  readonly labelOrientation?: SankeyLabelOrientation
  /** Returns the color of a node. Overrides `fill`. */
  readonly getNodeColor?: (node: SankeyPropNode, index: number) => string
}

export interface SankeyLinkProps {
  /** Solid color for all links. Overrides the gradient. */
  stroke?: string
  /**
   * Opacity of the links.
   * @default 0.5
   */
  readonly strokeOpacity?: number
  /**
   * Opacity of links not connected to the hovered node or link.
   * @default 0.1
   */
  readonly fadedOpacity?: number
  /**
   * Paint each link with a gradient from its source color to its target color.
   * @default true
   */
  readonly useGradient?: boolean
  /** Returns the color of a node, used for the gradient ends. */
  readonly getNodeColor?: (node: SankeyPropNode, index: number) => string
  /** Returns a solid color per link. Overrides the gradient. */
  readonly getLinkColor?: (link: SankeyPropLink, index: number) => string
  /** Pattern definitions (SVG `<pattern>` elements) that links can reference by id through `getLinkPattern`. */
  readonly patterns?: ReadonlyArray<SvgResource>
  /** Returns the id of a pattern to fill a link with, or `null`/`undefined` to use the gradient or solid color. A pattern wins over `stroke` and `getLinkColor`. */
  readonly getLinkPattern?: (link: SankeyPropLink, index: number) => string | null | undefined
}

export interface SankeyTooltipProps {
  /** Custom tooltip content for a node. Receives the node and its index. */
  readonly nodeContent?: (props: { node: SankeyPropNode; index: number }) => NativeContent
  /** Custom tooltip content for a link. Receives the link and its index. */
  readonly linkContent?: (props: { link: SankeyPropLink; index: number }) => NativeContent
  /**
   * Formats the values in the default tooltip.
   * @default integer formatting
   */
  readonly formatValue?: (value: number) => string
  /** Additional class name for the tooltip. */
  readonly className?: string
}

export type SankeyCarrier =
  | { readonly role: 'node'; readonly props: SankeyNodeProps }
  | { readonly role: 'link'; readonly props: SankeyLinkProps }
  | { readonly role: 'tooltip'; readonly props: SankeyTooltipProps }

export const SankeyNode = (props: SankeyNodeProps = {}): SankeyCarrier => ({ role: 'node', props })

export const SankeyLink = (props: SankeyLinkProps = {}): SankeyCarrier => ({ role: 'link', props })

export const SankeyTooltip = (props: SankeyTooltipProps = {}): SankeyCarrier => ({
  role: 'tooltip',
  props,
})
