import type { SankeyData, Margin } from './types'
import type { SankeyCarrier } from './carriers'
import type { Transition } from '../kit/motion/phase'

export interface SankeyChartProps {
  /** Nodes and links to draw. Links reference nodes by index; links with a non-positive or non-finite value are ignored, and the chart is empty when no positive link remains. */
  readonly data: SankeyData
  /**
   * Chart margins in pixels. Any side you omit keeps its default; the wide left and right defaults leave room for node labels.
   * @default { top: 40, right: 180, bottom: 40, left: 180 }
   */
  readonly margin?: Partial<Margin>
  /**
   * Duration of the enter animation in milliseconds.
   * @default 1100
   */
  readonly animationDuration?: number
  /**
   * Enter transition (a spring or a cubic-bezier tween), in seconds. Overrides `animationDuration` when it sets a `duration`.
   * @default a 1.1s tween on the reveal curve
   */
  readonly enterTransition?: Transition
  /**
   * Changing this value replays the enter animation.
   * @default ""
   */
  readonly revealSignature?: string
  /**
   * Aspect ratio of the chart as "width / height".
   * @default "2 / 1"
   */
  readonly aspectRatio?: string
  /**
   * Width of the node bars in pixels.
   * @default 16
   */
  readonly nodeWidth?: number
  /**
   * Vertical gap between nodes of the same column in pixels.
   * @default 24
   */
  readonly nodePadding?: number
  /** Additional class name for the chart container. */
  readonly className?: string
  /** `SankeyNode`, `SankeyLink` and `SankeyTooltip` to configure the chart, plus any elements that call `useSankey()`. */
  readonly children?: ReadonlyArray<SankeyCarrier>
  /** Controlled hovered node index, for example from a legend. Overrides hover from the chart surface; `null` clears it. */
  readonly hoveredNodeIndex?: number | null
  /**
   * Accessible label of the chart.
   * @default "Sankey chart"
   */
  readonly ariaLabel?: string
  /** Longer accessible description of the chart. */
  readonly ariaDescription?: string
}
