import { Schema } from 'effect'
import type { Transition } from '../kit/motion/phase'
import type { FunnelStageInput, FunnelGradientStopInput } from './marks'

export type FunnelStage = FunnelStageInput

export type FunnelGradientStop = FunnelGradientStopInput

type FunnelLabelOrientation = 'vertical' | 'horizontal'

type FunnelLabelAlign = 'center' | 'start' | 'end'

export const FunnelDatumSchema = Schema.Struct({
  label: Schema.String,
  value: Schema.Number,
  displayValue: Schema.optionalKey(Schema.String),
  color: Schema.optionalKey(Schema.String),
  gradient: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({ offset: Schema.Union([Schema.String, Schema.Number]), color: Schema.String }),
    ),
  ),
})

export interface FunnelChartProps {
  /** The stages, in order from widest to narrowest. The chart renders nothing when this is empty. */
  readonly data: ReadonlyArray<FunnelStage>
  /**
   * `"horizontal"` lays the stages out left to right; `"vertical"` top to bottom.
   * @default "horizontal"
   */
  readonly orientation?: 'horizontal' | 'vertical'
  /**
   * Default colour of the stages. A stage's own `color` or `gradient` overrides it.
   * @default "var(--chart-1)"
   */
  readonly color?: string
  /**
   * Number of concentric halo rings drawn for each stage.
   * @default 3
   */
  readonly layers?: number
  /** Extra class name for the chart container. */
  readonly className?: string
  /** Inline styles for the chart container. */
  readonly style?: Readonly<Record<string, string | number | undefined>>
  /**
   * Show each stage's share of the first stage as a badge.
   * @default true
   */
  readonly showPercentage?: boolean
  /**
   * Show each stage's value.
   * @default true
   */
  readonly showValues?: boolean
  /**
   * Show each stage's name.
   * @default true
   */
  readonly showLabels?: boolean
  /**
   * Index of the hovered stage, for controlled hover. Pass `null` for no hover; leave it `undefined` to let the chart manage hover itself.
   */
  readonly hoveredIndex?: number | null
  /** Called with the index of the hovered or keyboard-focused stage, or `null` when hover ends. */
  readonly onHoverChange?: (index: number | null) => void
  /** Formats a percentage (0 to 100) for the badge. Defaults to a rounded whole number with a `%` sign. */
  readonly formatPercentage?: (pct: number) => string
  /** Formats a stage value for display. Defaults to a whole number with locale grouping. */
  readonly formatValue?: (value: number) => string
  /**
   * Delay between one stage's entrance and the next, in seconds.
   * @default 0.12
   */
  readonly staggerDelay?: number
  /**
   * Motion transition for stage mount progress. Supports tween, spring and checked easing options; duration is in seconds.
   */
  readonly enterTransition?: Transition
  /**
   * Gap between stages in pixels.
   * @default 4
   */
  readonly gap?: number
  /**
   * Returns a pattern definition (for example an SVG `<pattern>`) for each stage, called with a unique `id` and the stage colour. The pattern paints the innermost ring; the outer halo rings stay solid.
   */
  readonly renderPattern?: (id: string, color: string) => SVGElement
  /**
   * `"curved"` joins stages with smooth curves; `"straight"` uses straight edges.
   * @default "curved"
   */
  readonly edges?: 'curved' | 'straight'
  /**
   * `"spread"` places the value, percentage and name apart within the segment; `"grouped"` stacks them together.
   * @default "spread"
   */
  readonly labelLayout?: 'spread' | 'grouped'
  /**
   * Stack direction of grouped labels. Only used with `labelLayout="grouped"`. Defaults to `"vertical"` for horizontal funnels and `"horizontal"` for vertical ones.
   */
  readonly labelOrientation?: FunnelLabelOrientation
  /**
   * Where grouped labels sit in their segment: `"center"`, `"start"` (top or left) or `"end"` (bottom or right). Only used with `labelLayout="grouped"`.
   * @default "center"
   */
  readonly labelAlign?: FunnelLabelAlign
  /**
   * Background bands and grid lines. `true` enables both with default styling; an object adjusts them. Off by default.
   * @default false
   */
  readonly grid?:
    | boolean
    | {
        /**
         * Show alternating background bands behind the stages.
         * @default true
         */
        readonly bands?: boolean
        /**
         * Colour of the background bands.
         * @default "var(--bkm-muted)"
         */
        readonly bandColor?: string
        /**
         * Show grid lines at each gap between stages.
         * @default true
         */
        readonly lines?: boolean
        /**
         * Colour of the grid lines.
         * @default "var(--chart-grid)"
         */
        readonly lineColor?: string
        /**
         * Opacity of the grid lines, from 0 to 1.
         * @default 1
         */
        readonly lineOpacity?: number
        /**
         * Width of the grid lines in pixels.
         * @default 1
         */
        readonly lineWidth?: number
      }
  /**
   * Accessible name of the chart.
   * @default "Funnel chart"
   */
  readonly ariaLabel?: string
  /** Longer accessible description of the chart. */
  readonly ariaDescription?: string
}
