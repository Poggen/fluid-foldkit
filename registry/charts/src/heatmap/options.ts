import { Schema } from 'effect'
import type { HeatmapBin } from './columns'
import type { HeatmapMargin, ChartStatus } from './context'
import type { HeatmapLevelColors, HeatmapLevelStyles } from './colors'
import type { HeatmapEnterTransition } from './motion'
import type { HeatmapSeparatorParsedConfig } from './separators'
import type { HeatmapWeekStartDay } from './day-labels'
import type {
  HeatmapCells,
  HeatmapXAxis,
  HeatmapYAxis,
  HeatmapTooltip,
  HeatmapSeparator,
} from './carriers'

export type HeatmapChild = ReturnType<
  | typeof HeatmapCells
  | typeof HeatmapXAxis
  | typeof HeatmapYAxis
  | typeof HeatmapTooltip
  | typeof HeatmapSeparator
>

export const HeatmapColumnSchema = Schema.Struct({
  bin: Schema.Number,
  bins: Schema.Array(
    Schema.Struct({
      bin: Schema.Number,
      date: Schema.Date,
      count: Schema.Number,
      observed: Schema.optionalKey(Schema.Boolean),
    }),
  ),
})

export interface HeatmapChartProps {
  /** Column data: one entry per week (or category) with the row bins inside. */
  readonly data: ReadonlyArray<{ readonly bin: number; readonly bins: ReadonlyArray<HeatmapBin> }>
  /** Visible time range. Only week columns that overlap the domain are drawn. */
  readonly xDomain?: [Date, Date]
  /** Accepted for bklit compatibility; it has no effect. */
  readonly sizingColumnCount?: number
  /**
   * `"fluid"`: the width drives square cells and the chart height hugs the grid (GitHub style). `"fill"`: cells expand to fill the parent.
   * @default "fluid"
   */
  readonly layout?: 'fluid' | 'fill'
  /**
   * Chart margins in pixels. Omitted sides keep their default.
   * @default { top: 28, right: 16, bottom: 0, left: 40 }
   */
  readonly margin?: Readonly<Partial<HeatmapMargin>>
  /**
   * Fixed cell size in pixels. When `0`, cells are square and sized to fit the available width.
   * @default 0
   */
  readonly binSize?: number
  /**
   * Gap between cells in pixels.
   * @default 2
   */
  readonly gap?: number
  /** Replaces the default level color scale. Receives a count and returns a CSS color. */
  readonly colorScale?: (count: number | null | undefined) => string
  /**
   * Colors for the five levels of the Less to More scale (empty plus four activity levels).
   * @default the `--chart-scale-01` to `--chart-scale-05` CSS variables
   */
  readonly levelColors?: HeatmapLevelColors
  /** Per-level fill styles (color and optional pattern). Takes precedence over `levelColors`. */
  readonly levelStyles?: HeatmapLevelStyles
  /** CSS aspect ratio of the outer container, for example `"2 / 1"`. Omit to fill the parent. */
  readonly aspectRatio?: string
  /** Additional class name for the chart container. */
  readonly className?: string
  /**
   * Data status. `"loading"` draws the shimmering skeleton cells.
   * @default "ready"
   */
  readonly status?: ChartStatus
  /** Centered label shown while `status` is `"loading"`. */
  readonly loadingLabel?: string
  /**
   * Enter animation duration in milliseconds. `0` disables the cell entrance.
   * @default 1600
   */
  readonly animationDuration?: number
  /**
   * Enter transition. `duration` is in seconds and `ease` a cubic-bezier tuple.
   * @default { type: "tween", duration: 1.6, ease: [0.85, 0, 0.916, 0.282] }
   */
  readonly enterTransition?: HeatmapEnterTransition
  /**
   * Changing this string replays the enter animation.
   * @default ""
   */
  readonly revealSignature?: string
  /**
   * Scales the wave stagger between cells (`1` is the default pacing).
   * @default 1
   */
  readonly enterStaggerScale?: number
  /**
   * Plays the enter fade-in and the loading shimmer. Set to `false` for no motion.
   * @default true
   */
  readonly animate?: boolean
  /**
   * Chart opacity while loading. Ours is `1`; bklit-ui uses `0.5`.
   * @default 1
   */
  readonly loadingOpacity?: number
  /**
   * Shows the shimmering skeleton cells while loading.
   * @default true
   */
  readonly showLoadingCells?: boolean
  /**
   * Highest opacity (0 to 1) the loading cells animate toward. Ours is `0.85`; bklit-ui uses `0.5`.
   * @default 0.85
   */
  readonly loadingCellMaxOpacity?: number
  /**
   * Share of cells (0 to 1) that take part in the loading shimmer. Ours is `1`; bklit-ui uses `0.65`.
   * @default 1
   */
  readonly loadingCellRandomness?: number
  /** Inserts horizontal gaps between groups of columns. A `HeatmapSeparator` child overrides it. */
  readonly columnSeparators?: HeatmapSeparatorParsedConfig
  /**
   * First row of the grid: `0` is Sunday (GitHub default), `1` Monday, and so on. Rotates the rows for display without reshaping your data.
   * @default 0
   */
  readonly weekStartDay?: HeatmapWeekStartDay
  /** `HeatmapCells`, `HeatmapXAxis`, `HeatmapYAxis`, `HeatmapTooltip` and `HeatmapSeparator` configuration children. `HeatmapCells` is required for the grid to draw. */
  readonly children?: ReadonlyArray<HeatmapChild>
  /**
   * Accessible name of the chart.
   * @default "Heatmap chart"
   */
  readonly ariaLabel?: string
  /** Accessible description of the chart. Falls back to the `ariaDescription` of `HeatmapCells`. */
  readonly ariaDescription?: string
}
