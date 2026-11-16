import type { IndicatorFadeEdges, IndicatorWidth } from './tooltip-options'

/**
 * Props of `TooltipDot`. They are merged into the chart's `ChartTooltip` dot options; an explicit `ChartTooltip` prop wins.
 */
export interface TooltipDotProps {
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly x?: number
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly y?: number
  /**
   * Show the dots. Same as `showDots` on `ChartTooltip`.
   * @default true
   */
  readonly visible?: boolean
  /** Fill color of the dots. Defaults to each series' color. */
  readonly color?: string
  /**
   * Dot radius in px. Same as `dotSize`.
   * @default 5
   */
  readonly size?: number
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly strokeColor?: string
  /**
   * Stroke width of the dots in px. Same as `dotStrokeWidth`.
   * @default 2
   */
  readonly strokeWidth?: number
  /**
   * `"dot"` or `"ring"`. Same as `dotVariant`; read by `BarChart` only.
   * @default "dot"
   */
  readonly variant?: 'dot' | 'ring'
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly cornerRadiusFraction?: number
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly springConfig?: { readonly stiffness: number; readonly damping: number }
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly animate?: boolean
}

/**
 * Props of `TooltipIndicator`. They are merged into the chart's `ChartTooltip` crosshair options; an explicit `ChartTooltip` prop wins.
 */
export interface TooltipIndicatorProps {
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly x?: number
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly height?: number
  /**
   * Show the crosshair. Same as `showCrosshair` on `ChartTooltip`.
   * @default true
   */
  readonly visible?: boolean
  /**
   * Thickness of the crosshair: a width in px, or `"line"` (1px), `"thin"` (2px), `"medium"` (4px) or `"thick"` (8px).
   * @default "line"
   */
  readonly width?: IndicatorWidth
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly span?: number
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly columnWidth?: number
  /**
   * Color of the crosshair. Same as `indicatorColor`.
   * @default "var(--chart-crosshair)"
   */
  readonly colorEdge?: string
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly colorMid?: string
  /** Ends that fade out. Boolean true means both; false means none. */
  readonly fadeEdges?: IndicatorFadeEdges | boolean
  /** Fade zone as a percentage of crosshair height, clamped to 2 to 40. Defaults to 10. */
  readonly fadeLength?: number
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly animate?: boolean
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly gradientId?: string
  /** Accepted so bklit-ui code compiles. Has no effect. */
  readonly springConfig?: { readonly stiffness: number; readonly damping: number }
  /** Dash pattern of the crosshair. Omit for a solid line. Same as `indicatorDasharray`. */
  readonly strokeDasharray?: string
}
