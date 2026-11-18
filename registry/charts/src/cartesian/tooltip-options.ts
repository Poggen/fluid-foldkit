import type { ChartContent, ChartStyle } from './content-types'
import type { SpringConfig } from './series-options'
import type { RegisteredLineConfig as ChartLineConfig } from './context-types'

/** Width of the tooltip crosshair: a pixel number, or `"line"` (1px), `"thin"` (2px), `"medium"` (4px) or `"thick"` (8px). */
export type IndicatorWidth = number | 'line' | 'thin' | 'medium' | 'thick'

/** Which ends of the tooltip crosshair fade out: `"both"`, `"top"`, `"bottom"` or `"none"`. */
export type IndicatorFadeEdges = 'both' | 'none' | 'top' | 'bottom'

export interface ChartTooltipProps<Row = unknown> {
  /**
   * Show the date pill that rides along the bottom of the plot.
   * @default true
   */
  readonly showDatePill?: boolean
  /**
   * Show the vertical crosshair line.
   * @default true
   */
  readonly showCrosshair?: boolean
  /**
   * Show a dot on every series at the hovered position.
   * @default true
   */
  readonly showDots?: boolean
  /**
   * Dot style: a filled `"dot"` or a transparent rounded `"ring"` square.
   * @default "dot"
   */
  readonly dotVariant?: 'dot' | 'ring'
  /**
   * Dot radius in px.
   * @default 5
   */
  readonly dotSize?: number
  /**
   * Corner radius of the `"ring"` variant as a fraction of its side (0 is square, 0.5 is a circle).
   * @default 0.25
   */
  readonly dotRadiusFraction?: number
  /**
   * Multiplier applied to the dot or ring size.
   * @default 1
   */
  readonly dotScale?: number
  /**
   * Ring stroke width in px. Filled Line/Area dots retain Original's 2px background stroke.
   * @default 2
   */
  readonly dotStrokeWidth?: number
  /**
   * Color of the crosshair. A function receives the focused caller row.
   * @default "var(--chart-crosshair)"
   */
  readonly indicatorColor?: string | ((point: Row) => string)
  /** Replaces the default tooltip panel body. Receives the hovered data row and its index. */
  readonly content?: (props: { point: Row; index: number }) => ChartContent
  /** Replaces the default rows (one per series) with your own list of `{ color, label, value }`. */
  readonly rows?: (
    point: Row,
  ) => Array<{ readonly color: string; readonly label: string; readonly value: string | number }>
  /**
   * Color of the tooltip dots. Custom rows' nonempty colors win; otherwise a function receives the hovered row and series config, or the series color is used.
   */
  readonly dotColor?: string | ((point: Row, line: ChartLineConfig) => string)
  /** Extra content rendered below the rows in the default panel, for example marker details. */
  readonly children?: ChartContent
  /** Extra class name for the tooltip panel. */
  readonly className?: string
  /** Spring for the floating panel when `matchCrosshair` is on. Defaults to the chart's tooltip spring. */
  readonly springConfig?: SpringConfig
  /**
   * Make the floating panel follow the pointer with the same spring as the crosshair instead of `damping`.
   * @default false
   */
  readonly matchCrosshair?: boolean
  /**
   * Spring damping for the floating panel when `matchCrosshair` is off. `0` moves the panel instantly.
   * @default 20
   */
  readonly damping?: number
  /** Dash pattern of the crosshair. Omit for a solid line. */
  readonly indicatorDasharray?: string
  /**
   * Ends of the crosshair that fade out. Defaults to both. Dashed indicators remain solid.
   */
  readonly indicatorFadeEdges?: IndicatorFadeEdges
  /** Fade zone as a percentage of crosshair height, clamped to 2 to 40. Defaults to 10. */
  readonly indicatorFadeLength?: number
  /** Spring for the floating panel. Takes priority over `matchCrosshair` and `damping`. */
  readonly boxSpringConfig?: SpringConfig
  /**
   * Inline presentation of the view-owned inner panel.
   */
  readonly panelStyle?: ChartStyle
  /**
   * Panel background; an explicit panelStyle.backgroundColor takes precedence.
   */
  readonly backgroundColor?: string
  /**
   * Thickness of the crosshair: a width in px, or `"line"` (1px), `"thin"` (2px), `"medium"` (4px) or `"thick"` (8px).
   * @default "line"
   */
  readonly indicatorWidth?: IndicatorWidth
  /** Accepted for bklit-ui compatibility. It has no effect in bklit-tanstack-charts. */
  readonly columnWidth?: number
}

/**
 * A drag selection over the chart, in x-axis data indices. `SegmentBackground` and the `SegmentLine*` children read it from `useChartHover()`.
 */
export interface ChartSelection {
  /** X position (px) where the drag started. */
  readonly startX: number
  /** X position (px) where the drag currently ends. */
  readonly endX: number
  /** Data index where the selection starts. */
  readonly startIndex: number
  /** Data index where the selection ends. */
  readonly endIndex: number
  /** Whether a drag is in progress. */
  readonly active: boolean
}
