import { Schema } from 'effect'
import type { RadarData, RadarMetric } from './rows'
import type { RadarEnterTransition } from './transition'
import type { RadarAreaProps } from './area'
import type { RadarAxisProps } from './axis'
import type { RadarGridProps } from './grid'
import type { RadarLabelsProps } from './labels'

export const RadarDatum = Schema.Struct({
  label: Schema.String,
  color: Schema.optionalKey(Schema.String),
  values: Schema.Record(Schema.String, Schema.Number),
})

export type RadarChild =
  | { readonly kind: 'area'; readonly props: RadarAreaProps }
  | { readonly kind: 'grid'; readonly props: RadarGridProps }
  | { readonly kind: 'axis'; readonly props: RadarAxisProps }
  | { readonly kind: 'labels'; readonly props: RadarLabelsProps }

export interface RadarChartProps {
  /**
   * The series to draw, one polygon each. Every item holds a `values` record keyed by metric `key`; the series index is what `RadarArea` refers to with `index`.
   */
  readonly data: ReadonlyArray<RadarData>
  /**
   * The metrics, one spoke each, in clockwise order from 12 o'clock. A metric's `key` selects its value in every series' `values`, and its `label` is what `RadarLabels` prints.
   */
  readonly metrics: ReadonlyArray<RadarMetric>
  /** Chart width and height in pixels. Omit to fill the width of the parent element; the chart stays square. */
  readonly size?: number
  /**
   * Number of concentric grid rings drawn by `RadarGrid`. Ring `n` marks `n / levels` of the 0 to 100 value scale.
   * @default 5
   */
  readonly levels?: number
  /**
   * Space in pixels kept free around the chart for the metric labels.
   * @default 60
   */
  readonly margin?: number
  /**
   * Play the entrance animation. Set `false` to draw the chart immediately.
   * @default true
   */
  readonly animate?: boolean
  /**
   * Total time budget of the entrance animation in milliseconds. Grid, labels and series timings scale with it.
   * @default 1100
   */
  readonly enterDurationMs?: number
  /**
   * Multiplier for the delays between grid rings, labels and series during the entrance. `0` starts everything together.
   * @default 1
   */
  readonly staggerScale?: number
  /**
   * Transition for the series entrance, in the shape used by the `motion` library (`type: "spring"` with spring values, or a tween with `duration` in seconds and `ease`). Defaults to a 1.1 second tween on the shared reveal curve.
   */
  readonly enterTransition?: RadarEnterTransition
  /**
   * Changing this string replays the entrance animation.
   * @default ""
   */
  readonly motionReplayKey?: string
  /**
   * Index of the hovered series, for controlled hover. Pass `null` for no hover; leave it `undefined` to let the chart manage hover itself.
   */
  readonly hoveredIndex?: number | null
  /** Called with the index of the hovered or keyboard-focused series, or `null` when hover ends. */
  readonly onHoverChange?: (index: number | null) => void
  /** Extra class name for the chart container. */
  readonly className?: string
  /** Inline styles for the chart container, merged over the default sizing. */
  readonly style?: Readonly<Record<string, string | number | undefined>>
  /**
   * The parts to draw: `RadarGrid`, `RadarAxis`, `RadarLabels` and one `RadarArea` per series. Only the parts you include are drawn.
   */
  readonly children: ReadonlyArray<RadarChild>
  /**
   * Accessible name of the chart.
   * @default "Radar chart"
   */
  readonly ariaLabel?: string
  /** Longer accessible description of the chart. */
  readonly ariaDescription?: string
}
