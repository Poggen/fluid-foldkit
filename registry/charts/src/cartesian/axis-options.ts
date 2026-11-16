// Native typed options transposed from the pinned Bklit public contracts.
import type { PatternPresetId, PatternPresetOptions } from '../kit/pattern/pattern-preset-helpers'

export interface XAxisConfig {
  /**
   * Target number of tick labels along the x axis.
   * @default 5
   */
  readonly numTicks?: number
  /**
   * Half-width in px of the zone around the date pill inside which tick labels are hidden. Only `BarChart` reads it.
   * @default 50
   */
  readonly tickerHalfWidth?: number
  /**
   * Where ticks fall: `"data"` places them on evenly spaced data rows, `"domain"` places them at evenly spaced time values across the x domain.
   * @default "data"
   */
  readonly tickMode?: 'domain' | 'data'
  /** Formats a tick date into its label. Defaults to a short month and day such as "Jan 5". */
  readonly formatValue?: (value: Readonly<Date>) => string
}

export interface YAxisConfig {
  /**
   * Id of the y scale this axis labels. Must match the `yAxisId` of the series that use it.
   * @default "left"
   */
  yAxisId?: string | number
  /**
   * Side of the plot the axis sits on. The primary (`left`) scale defaults left; additional scale ids default right.
   * @default "left"
   */
  readonly orientation?: 'left' | 'right'
  /**
   * Target number of tick labels. The primary axis also sets the number of horizontal grid lines.
   * @default 5
   */
  readonly numTicks?: number
  /**
   * Abbreviate absolute values of 1000 and above as thousands, for example `-2k` or `2k`.
   * @default true
   */
  readonly formatLargeNumbers?: boolean
  /** Formats a tick value into its label. Overrides `formatLargeNumbers`. */
  readonly formatValue?: (value: number) => string
}

export interface GridProps {
  /**
   * Show horizontal grid lines.
   * @default true
   */
  horizontal?: boolean
  /**
   * Show vertical grid lines.
   * @default false
   */
  vertical?: boolean
  /**
   * Number of horizontal grid lines. Ignored when `rowTickValues` is set.
   * @default 5
   */
  numTicksRows?: number
  /**
   * Number of vertical grid lines.
   * @default 10
   */
  numTicksColumns?: number
  /** Explicit y values for the horizontal grid lines. Overrides `numTicksRows`. */
  rowTickValues?: Array<number>
  /**
   * Color of the grid lines.
   * @default "var(--chart-grid)"
   */
  stroke?: string
  /** Grid color while the chart is loading. Falls back to `stroke`. */
  loadingStroke?: string
  /**
   * Opacity of the grid lines.
   * @default 1
   */
  strokeOpacity?: number
  /**
   * Width of the grid lines in px.
   * @default 1
   */
  strokeWidth?: number
  /**
   * Dash pattern of the grid lines.
   * @default "4,4"
   */
  strokeDasharray?: string
  /** Y values of horizontal lines drawn with the highlight styling, for example a zero baseline. */
  highlightRowValues?: Array<number>
  /**
   * Color of the highlighted rows.
   * @default "var(--chart-foreground-muted)"
   */
  highlightRowStroke?: string
  /**
   * Opacity of the highlighted rows.
   * @default 1
   */
  highlightRowStrokeOpacity?: number
  /**
   * Width of the highlighted rows in px.
   * @default 1
   */
  highlightRowStrokeWidth?: number
  /**
   * Dash pattern of the highlighted rows.
   * @default "0"
   */
  highlightRowStrokeDasharray?: string
  /**
   * Fade the horizontal lines toward transparent at the left and right edges.
   * @default true
   */
  fadeHorizontal?: boolean
  /**
   * Fade the vertical lines toward transparent at the top and bottom edges.
   * @default false
   */
  fadeVertical?: boolean
  /**
   * Drop the first and last horizontal line (kept when two or fewer remain).
   * @default false
   */
  hideHorizontalEdgeLines?: boolean
  /**
   * Drop the first and last vertical line (kept when two or fewer remain).
   * @default false
   */
  hideVerticalEdgeLines?: boolean
  /**
   * Accepted for bklit-ui compatibility. It has no effect in bklit-tanstack-charts. The grid follows the primary (left) y scale.
   */
  yAxisId?: string | number
  /**
   * While the chart is loading, sweep a bright band across the grid.
   * @default false
   */
  shimmer?: boolean
  /**
   * Color of the shimmer band.
   * @default "color-mix(in oklch, var(--bkm-foreground) 68%, transparent)"
   */
  shimmerStroke?: string
  /** Accepted for bklit-ui compatibility. It has no effect in bklit-tanstack-charts. */
  shimmerLength?: number
  /**
   * Speed multiplier of the shimmer sweep. `2` is twice as fast.
   * @default 1
   */
  shimmerSpeed?: number
  /** Accepted for bklit-ui compatibility. It has no effect in bklit-tanstack-charts. */
  shimmerSync?: boolean
}

export interface BackgroundConfig extends PatternPresetOptions {
  /**
   * Pattern preset. `"none"` draws nothing.
   * @default "diagonal"
   */
  readonly pattern?: PatternPresetId
  /**
   * Color of the pattern strokes.
   * @default "var(--chart-grid)"
   */
  readonly color?: string
  /**
   * Draw the pattern over the plot area.
   * @default true
   */
  readonly showFill?: boolean
  /**
   * Opacity of the pattern.
   * @default 1
   */
  readonly opacity?: number
  /**
   * Fade the pattern out at the left and right edges.
   * @default true
   */
  readonly fadeHorizontal?: boolean
  /**
   * Fade the pattern out at the top and bottom edges.
   * @default true
   */
  readonly fadeVertical?: boolean
  /**
   * Width of the horizontal fade zone, as a percent of the plot width per edge (clamped to 0 to 45).
   * @default 10
   */
  readonly fadeHorizontalLength?: number
  /**
   * Height of the vertical fade zone, as a percent of the plot height per edge (clamped to 0 to 45).
   * @default 10
   */
  readonly fadeVerticalLength?: number
}
