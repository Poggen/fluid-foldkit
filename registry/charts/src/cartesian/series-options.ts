import type { CurveFactory } from 'd3-shape'
import type { PatternPresetId } from '../kit/pattern/pattern-preset-helpers'
import type { LineLoadingPulseMode, LoadingStyle } from '../kit/motion/phase'

type FadeEdges = boolean | 'left' | 'right'

/** Spring parameters (stiffness and damping) used by the tooltip and highlight springs in `ChartConfigValue`. */
export interface SpringConfig {
  /** Spring stiffness. Higher values snap faster. */
  readonly stiffness: number
  /** Spring damping. Higher values settle with less overshoot. */
  readonly damping: number
}

/**
 * Appearance of the point markers drawn on a series (`showMarkers` and `markers` on `Line` and `Area`, `SeriesMarkers`, `SeriesPointMarker`).
 */
export interface SeriesPointMarkerStyle {
  /** Fill color of the inner circle. Defaults to the series stroke color. */
  readonly fill?: string
  /** Color of the outer ring. Defaults to `fill`. */
  stroke?: string
  /**
   * Outer ring stroke width in px. Set to `0` to remove the ring.
   * @default 2
   */
  strokeWidth?: number
  /**
   * Gap between the inner circle and the outer ring, in px.
   * @default 2
   */
  readonly ringGap?: number
  /**
   * Width in px of an optional outline drawn outside the ring. `0` draws none.
   * @default 0
   */
  readonly outlineWidth?: number
  /** Color of the outer outline. Defaults to `stroke`. */
  readonly outlineColor?: string
  /**
   * Radius of the inner circle in px.
   * @default 5
   */
  readonly radius?: number
  /**
   * Dim the markers that are not hovered while the chart is hovered. The enlarged active marker (`showActiveHighlight`) is drawn only while this is on.
   * @default true
   */
  readonly fadeOnHover?: boolean
  /**
   * Opacity of the dimmed markers when `fadeOnHover` is on.
   * @default 0.5
   */
  readonly inactiveOpacity?: number
  /**
   * Blur in px of the dimmed markers when `fadeOnHover` is on.
   * @default 2
   */
  readonly inactiveBlur?: number
  /**
   * Blur in px the markers start from while they fade in on entrance.
   * @default 2
   */
  readonly enterBlur?: number
  /**
   * Draw the hovered marker 1.35 times larger.
   * @default true
   */
  readonly showActiveHighlight?: boolean
}

export interface LineConfig {
  /** Key of the data field that holds this line's y values. */
  readonly dataKey: string
  /**
   * Stroke color of the line.
   * @default "var(--chart-line-primary)"
   */
  stroke?: string
  /**
   * Stroke width of the line in px.
   * @default 2.5
   */
  strokeWidth?: number
  /**
   * d3-shape curve factory used to interpolate between points.
   * @default curveNatural
   */
  readonly curve?: CurveFactory
  /**
   * Id of the y scale this line is plotted against. Use it with a matching `YAxis` to give a series its own scale.
   * @default "left"
   */
  yAxisId?: string | number
  /**
   * Fade the line toward transparent at the chart edges. `true` fades both ends, `"left"` or `"right"` fades one side, `false` turns the fade off.
   * @default true
   */
  readonly fadeEdges?: FadeEdges
  /**
   * Draw a highlighted segment of the line around the hovered point.
   * @default true
   */
  showHighlight?: boolean
  /**
   * Draw a circle marker at every data point.
   * @default false
   */
  readonly showMarkers?: boolean
  /** Styling of the point markers drawn by `showMarkers`. See `SeriesPointMarkerStyle`. */
  readonly markers?: Readonly<SeriesPointMarkerStyle>
  /**
   * Data index from which the line is drawn dashed (inclusive). Useful for marking an incomplete or projected period.
   */
  readonly dashFromIndex?: number
  /**
   * Dash pattern of the dashed tail when `dashFromIndex` is set.
   * @default "6,4"
   */
  readonly dashArray?: string
  /**
   * Stroke color of the loading pulse overlay.
   * @default "var(--chart-foreground)"
   */
  readonly loadingStroke?: string
  /**
   * Stroke opacity of the loading pulse overlay.
   * @default 0.5
   */
  readonly loadingStrokeOpacity?: number
  /**
   * Whether the point markers animate in. The line itself always enters with the chart's `animationDuration`.
   * @default true
   */
  readonly animate?: boolean
  /**
   * Show the loading pulse overlay on this line. When unset, the pulse follows the chart's `status`. Set `false` to disable it even while the chart is loading.
   */
  readonly loading?: boolean
  /**
   * Phase of the loading pulse: `"loop"` repeats, `"exit"` plays the loading to ready transition, `"enter"` plays ready to loading.
   * @default "loop"
   */
  readonly loadingPulseMode?: LineLoadingPulseMode
  /**
   * Loading animation: a travelling `"pulse"` or a diagonal `"sweep"` shimmer across the skeleton line.
   * @default "pulse"
   */
  readonly loadingStyle?: LoadingStyle
  /** Called each time a `"loop"` pulse cycle completes. */
  readonly onLoadingPulseCycleComplete?: () => void
}

export interface AreaConfig {
  /** Key of the data field that holds this area's y values. */
  readonly dataKey: string
  /**
   * Color of the area's top line. Falls back to `fill`, then to the default line color.
   * @default "var(--chart-line-primary)"
   */
  stroke?: string
  /**
   * Stroke width of the top line in px.
   * @default 2
   */
  strokeWidth?: number
  /** Fill color of the area. Defaults to the resolved `stroke`. */
  readonly fill?: string
  /**
   * Opacity of the fill at the top of the area, before the gradient fades it toward `gradientToOpacity`.
   * @default 0.4
   */
  readonly fillOpacity?: number
  /**
   * d3-shape curve factory used to interpolate between points.
   * @default curveMonotoneX
   */
  readonly curve?: CurveFactory
  /**
   * Id of the y scale this area is plotted against.
   * @default "left"
   */
  yAxisId?: string | number
  /**
   * Draw the stroke line along the top of the area.
   * @default true
   */
  readonly showLine?: boolean
  /**
   * Fill opacity at the bottom of the vertical gradient.
   * @default 0
   */
  readonly gradientToOpacity?: number
  /** Vertical fill-gradient extent. Values clamp from 0.01 to 1, matching Original Bklit. Defaults to 1. */
  readonly gradientSpan?: number
  /**
   * Fade the area toward transparent at the chart edges. `true` fades both ends, `"left"` or `"right"` fades one side.
   * @default false
   */
  readonly fadeEdges?: FadeEdges
  /**
   * Draw a circle marker at every data point.
   * @default false
   */
  readonly showMarkers?: boolean
  /** Styling of the point markers drawn by `showMarkers`. See `SeriesPointMarkerStyle`. */
  readonly markers?: Readonly<SeriesPointMarkerStyle>
  /**
   * Draw a highlighted segment of the top line around the hovered point.
   * @default true
   */
  showHighlight?: boolean
  /** Data index from which the top line is drawn dashed (inclusive). */
  readonly dashFromIndex?: number
  /**
   * Dash pattern of the dashed tail when `dashFromIndex` is set.
   * @default "6,4"
   */
  readonly dashArray?: string
  /**
   * Whether the point markers animate in. The area itself always enters with the chart's `animationDuration`.
   * @default true
   */
  readonly animate?: boolean
  /**
   * Show the loading pulse overlay on this area. When unset, the pulse follows the chart's `status`. Set `false` to disable it.
   */
  readonly loading?: boolean
  /**
   * Stroke color of the loading pulse overlay.
   * @default "var(--chart-foreground)"
   */
  readonly loadingStroke?: string
  /**
   * Stroke opacity of the loading pulse overlay.
   * @default 0.5
   */
  readonly loadingStrokeOpacity?: number
  /**
   * Phase of the loading pulse: `"loop"` repeats, `"exit"` plays the loading to ready transition, `"enter"` plays ready to loading.
   * @default "loop"
   */
  readonly loadingPulseMode?: LineLoadingPulseMode
  /**
   * Loading animation: a travelling `"pulse"` or a diagonal `"sweep"` shimmer.
   * @default "pulse"
   */
  readonly loadingStyle?: LoadingStyle
}

export interface PatternAreaConfig {
  /** Key of the data field that holds the y values filled with the pattern. */
  readonly dataKey: string
  /**
   * Pattern drawn inside the area (a `PatternPresetId`, for example `"diagonal"`, `"dots"` or `"cross"`).
   * @default "diagonal"
   */
  readonly patternPreset?: PatternPresetId
  /** Color of the pattern strokes. Defaults to `fill`, then to the default line color. */
  readonly patternColor?: string
  /** Fallback color for the pattern when `patternColor` is not set. */
  readonly fill?: string
  /**
   * d3-shape curve factory used to interpolate between points.
   * @default curveMonotoneX
   */
  readonly curve?: CurveFactory
  /** Deprecated. The pattern fill does not animate, so this has no effect. */
  readonly animate?: boolean
}

export interface ScatterConfig {
  /** Key of the data field that holds this series' y values. */
  readonly dataKey: string
  /**
   * Id of the y scale this series is plotted against.
   * @default "left"
   */
  yAxisId?: string | number
  /**
   * Whether the dots animate in on entrance.
   * @default true
   */
  readonly animate?: boolean
  /** Fill color of the dots. Defaults to `stroke`, then to a color from the chart palette. */
  readonly fill?: string
  /** Color of the ring around each dot. Defaults to the resolved fill. */
  stroke?: string
  /**
   * Width of the ring around each dot in px.
   * @default 2
   */
  strokeWidth?: number
  /**
   * Gap between the dot and its ring in px.
   * @default 2
   */
  readonly ringGap?: number
  /**
   * Radius of the dot in px.
   * @default 5
   */
  readonly radius?: number
  /**
   * Fills the dots with a color that ends at `to` (or a default accent color when `true`). Overrides `fill`; the ring follows unless `stroke` is set.
   */
  readonly yGradient?: boolean | Readonly<{ from?: string; to?: string }>
  /**
   * Dim the dots that are not hovered while the chart is hovered.
   * @default true
   */
  readonly fadeOnHover?: boolean
  /**
   * Opacity of the dimmed dots when `fadeOnHover` is on.
   * @default 0.5
   */
  readonly inactiveOpacity?: number
  /**
   * Blur in px of the dimmed dots when `fadeOnHover` is on.
   * @default 2
   */
  readonly inactiveBlur?: number
  /**
   * Blur in px the dots start from while they fade in on entrance.
   * @default 2
   */
  readonly enterBlur?: number
  /**
   * Draw the hovered dot 1.35 times larger.
   * @default true
   */
  readonly showActiveHighlight?: boolean
  /**
   * Width in px of an optional outline drawn outside the ring. `0` draws none.
   * @default 0
   */
  readonly outlineWidth?: number
  /** Color of the outline. Defaults to the ring color. */
  readonly outlineColor?: string
}
