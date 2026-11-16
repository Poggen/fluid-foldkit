import type { SunburstNode } from './arcs'
import type { SunburstCarrier } from './carriers'
import type { EnterTransition } from '../kit/motion/phase'

export type SunburstEnterTransition = EnterTransition

/** Props of `SunburstChart`. */
export interface SunburstChartProps {
  /** Hierarchical data tree. Parent values are summed from their children. */
  data: SunburstNode
  /**
   * Chart diameter in pixels. The chart shrinks to fit narrower containers.
   * @default 520
   */
  size?: number
  /**
   * Change this number to replay the enter animation.
   * @default 0
   */
  playKey?: number
  /** Additional class name for the chart wrapper. */
  className?: string
  /** Controlled drill-down focus: the id of the focused node (names from the root joined with `" / "`). Omit for uncontrolled drill-down. */
  focusId?: string
  /** Called with the new node id when the focus changes through a segment click, the center hub, a keyboard zoom or a breadcrumb. */
  onFocusChange?: (focusId: string) => void
  /** Controlled hover: the index of the hovered arc in the `arcs` array returned by `buildArcs`, or `null` for none. */
  hoveredIndex?: number | null
  /** Called with the arc index (or `null`) when the hovered arc changes. */
  onHoverChange?: (index: number | null) => void
  /**
   * How far in pixels the hovered segment grows outward.
   * @default 8
   */
  hoverPop?: number
  /**
   * Inset in pixels reserved inside the chart for hover growth, relative to `size`.
   * @default derived from the tree depth, `size` and `hoverPop`
   */
  padding?: number
  /**
   * Overrides the source Motion enter animation, including tween easing and spring physics. Durations are seconds.
   * @default { type: "tween", duration: 1.1, ease: [0.85, 0, 0.15, 1] }
   */
  enterTransition?: SunburstEnterTransition
  /**
   * Scales the stagger between rings and segments during the enter animation.
   * @default 1
   */
  enterStaggerScale?: number
  /** `SunburstSegment`, `SunburstCenter`, `SunburstLabels`, `SunburstBreadcrumb` and `SunburstHint` children. Render one `SunburstSegment` per arc index to customize individual segments. */
  children: ReadonlyArray<SunburstCarrier>
}
