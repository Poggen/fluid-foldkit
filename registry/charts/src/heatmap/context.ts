import type { HeatmapLinearScale, HeatmapTimeScale } from './scales'
import type { ChartStyle as CSSProperties } from '../cartesian/content-types'

type RefObject<T> = { readonly current: T }

import type { ChartPhase } from '../kit/motion/phase'
import type { HeatmapEnterTransition, HeatmapRevealMode } from './motion'
import type { HeatmapLevelStyles } from './colors'
import type { HeatmapColumn } from './columns'
import type {
  HeatmapWeekStartDay,
  HeatmapYAxisLabelFormat,
  HeatmapYAxisTickFilter,
} from './day-labels'
import type {
  HeatmapSeparatorLayout,
  HeatmapSeparatorGradient,
  HeatmapSeparatorStrokeStyle,
} from './separators'

type ChartStatus = 'loading' | 'ready' | 'error'

interface HeatmapMargin {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/** Cell layout of the chart: `"fluid"` sizes square cells to the width, `"fill"` expands cells to the parent. */
type HeatmapLayout = 'fluid' | 'fill'

const DEFAULT_MARGIN: HeatmapMargin = { bottom: 0, left: 40, right: 16, top: 28 }

/** Config published by a `<HeatmapTooltip>` child (read by scanning the chart's children). */
interface HeatmapTooltipConfig {
  readonly formatLabel: (count: number, date: Readonly<Date>) => string
  readonly className: string
  readonly panelStyle?: Readonly<CSSProperties>
  readonly backgroundColor?: string
  /** Maps to native `tooltip.motion: false` (no entry/move/exit motion). */
  readonly instant: boolean
  /** bklit useDelayedTooltipData showDelay (ms, default 0): first-hover delay, applied by fixed CSS off a host var. */
  readonly showDelay: number
  /** bklit hideDelay (ms, default 120): hold after leaving a cell. */
  readonly hideDelay: number
}

/** Config published by a `<HeatmapSeparator>` child. */
interface HeatmapSeparatorStyle {
  readonly strokeStyle?: HeatmapSeparatorStrokeStyle
  readonly strokeDasharray?: string
  readonly stroke?: string
  readonly strokeWidth?: number
  readonly strokeOpacity?: number
  readonly gradient?: Readonly<HeatmapSeparatorGradient>
  readonly paddingY?: number
  readonly startOffset?: number
  readonly showLabels?: boolean
  readonly labelOffset?: number
  readonly labelFormat?: (quarter: number, startDate: Readonly<Date>) => string
  readonly labelClassName?: string
}

interface HeatmapYAxisConfig {
  readonly tickFilter: HeatmapYAxisTickFilter
  readonly labelFormat: HeatmapYAxisLabelFormat
  readonly rowOpacity: number | ReadonlyArray<number> | undefined
}

/** Values the chart shares with its sub-components, as returned by `useHeatmap`. */
interface HeatmapContextValue {
  /** The week columns being drawn, after `xDomain` filtering and `weekStartDay` rotation. */
  readonly data: Array<HeatmapColumn>
  /** Cell width in pixels. */
  readonly binWidth: number
  /** Cell height in pixels (cells are square, so equal to `binWidth`). */
  readonly binHeight: number
  /** Gap between cells in pixels. */
  readonly gap: number
  /** Resolved chart margins in pixels. */
  readonly margin: HeatmapMargin
  /** Total chart width in pixels. */
  readonly width: number
  /** Total chart height in pixels. */
  readonly height: number
  /** Always `undefined`; kept for bklit compatibility. */
  readonly fixedWidth?: number | undefined
  /** Plot width in pixels (the grid, separator gutters included). */
  readonly innerWidth: number
  /** Plot height in pixels. */
  readonly innerHeight: number
  /** Number of week columns drawn. */
  readonly columnCount?: number
  /** Number of rows per column (7 for a week). */
  readonly rowCount?: number
  /** Where column separators sit, or `null` when none are configured. */
  readonly separatorLayout: HeatmapSeparatorLayout | null
  /** Left edge of a column in plot pixels, separator gutters included. */
  readonly xScale: (columnIndex: number) => number
  /** Top edge of a row in plot pixels. */
  readonly yScale: (rowIndex: number) => number
  /** Data extent (first column start to last column end) mapped onto the plot width. */
  readonly timeXScale: HeatmapTimeScale
  /** Unit domain mapped onto the plot height, for overlays that need a vertical scale. */
  readonly brushYScale: HeatmapLinearScale
  /** Ref to the chart container element. */
  readonly containerRef: RefObject<HTMLDivElement | null>
  /** Whether the chart is large enough to draw. */
  readonly isReady: boolean
  /** The resolved five level styles. */
  readonly levelStyles: HeatmapLevelStyles
  /** Maps a count to the cell color for its level. */
  readonly colorScale: (count: number | null | undefined) => string
  /** Maps a count to the cell fill, which is a `url(#...)` pattern reference for pattern levels and the color otherwise. */
  readonly fillScale: (count: number | null | undefined) => string
  /** Whether a custom `colorScale` was passed to the chart. */
  readonly hasCustomColorScale?: boolean
  /** Resolved first row of the grid (`0` Sunday to `6` Saturday). */
  readonly weekStartDay: HeatmapWeekStartDay
  /** Current data status (`"loading"`, `"ready"` or `"error"`). */
  readonly chartStatus: ChartStatus
  /** Coarse phase of the chart: `"loading"` while loading, `"ready"` otherwise. */
  readonly chartPhase: ChartPhase
  /** `true` once the status is no longer `"loading"`. */
  readonly isLoaded: boolean
  /** Number derived from `revealSignature`; changes when the entrance is replayed. */
  readonly revealEpoch: number
  /** Enter animation duration in milliseconds. */
  readonly animationDuration: number
  /** Enter transition in use. */
  readonly enterTransition?: HeatmapEnterTransition
  /** Scale applied to the wave stagger between cells. */
  readonly enterStaggerScale: number
  /** Whether cells animate in (`animate` is on and `animationDuration` is above `0`). */
  readonly animateCells: boolean
  /** Chart opacity while loading. */
  readonly loadingOpacity: number
  /** Whether skeleton cells show while loading. */
  readonly showLoadingCells: boolean
  /** Highest opacity of the loading cells. */
  readonly loadingCellMaxOpacity: number
  /** Share of cells that take part in the loading shimmer. */
  readonly loadingCellRandomness: number
  /** Always `null`; kept for bklit compatibility. */
  readonly revealMode: HeatmapRevealMode
  /** Centered label shown while loading. */
  readonly loadingLabel?: string
  /** Whether the loading label is visible. */
  readonly showLoadingLabel: boolean
  /** Accessible description of the chart. */
  readonly ariaDescription?: string | undefined
  /** Accessible name of the chart. */
  readonly ariaLabel?: string | undefined
  /** Which rows get a weekday label (from `HeatmapYAxis`). */
  readonly yTickFilter?: HeatmapYAxisTickFilter
  /** Weekday label format (from `HeatmapYAxis`). */
  readonly yLabelFormat?: HeatmapYAxisLabelFormat
  /** Per-row label opacity (from `HeatmapYAxis`). */
  readonly yRowOpacity?: number | ReadonlyArray<number> | undefined
  /** Resolved `HeatmapTooltip` settings, or `null` when no tooltip child is present. */
  readonly tooltip?: HeatmapTooltipConfig | null
  /** Resolved `HeatmapSeparator` style, or `null` when no separator child is present. */
  readonly separator?: HeatmapSeparatorStyle | null
}

export { DEFAULT_MARGIN }

export type {
  ChartStatus,
  HeatmapMargin,
  HeatmapLayout,
  HeatmapTooltipConfig,
  HeatmapSeparatorStyle,
  HeatmapYAxisConfig,
  HeatmapContextValue,
}

/** Native contexts are explicit values, so callers cannot read an unrelated ambient chart. */
export function useHeatmap(value: HeatmapContextValue | undefined): HeatmapContextValue {
  if (value === undefined) throw new Error('Heatmap components require a native Heatmap context.')

  return value
}

export function HeatmapProvider({
  value,
  children,
}: {
  readonly value: HeatmapContextValue
  readonly children: (value: HeatmapContextValue) => import('foldkit/html').Html
}) {
  return children(value)
}
