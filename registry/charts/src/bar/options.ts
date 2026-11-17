import type { ChartEnvironment } from '../cartesian/chart-config'
import type { BarContextRenderer } from './depth-entries'
import type { CartesianLayer } from '../cartesian/layers'
import type { ChartStyle } from '../cartesian/content-types'
import type { Margin } from '../cartesian/context-types'
import type { ChartStatus, ChartPhase, Transition } from '../kit/motion/phase'
import type { PatternPresetId } from '../kit/pattern/pattern-preset-helpers'

export type BarLineCap = 'round' | 'butt' | number

/** Entrance style of the bars: grow from the baseline or fade in. */
export type BarAnimationType = 'grow' | 'fade'

export interface BarProps<Key extends string = string> {
  /** Key of the data field that holds this series' values. */
  readonly dataKey: Key
  /**
   * Value-scale group for vertical bars. Matches the corresponding YAxis yAxisId; omitted or empty selects left.
   */
  readonly yAxisId?: string | number
  /**
   * Fill color of the bars. Can be a color or a `url(#id)` reference to a gradient or pattern child.
   * @default "var(--chart-line-primary)"
   */
  readonly fill?: string
  /** Tooltip row and dot/ring color. Falls back to `fill`, then the primary chart color. Useful for gradient or pattern fills. */
  readonly stroke?: string
  /**
   * Source rectangle corner radius: round uses min(bar thickness / 2, 8), butt uses zero, a number is literal. Perspective forces zero.
   * @default "round"
   */
  readonly lineCap?: BarLineCap
  /**
   * Whether this series runs its entrance. Defaults to true.
   */
  readonly animate?: boolean
  /**
   * Entrance style: grow from the baseline, or fade with a 2px blur. Defaults to grow.
   */
  readonly animationType?: BarAnimationType
  /**
   * Opacity of the bars that are not hovered while another bar is hovered. Read from the first `Bar`.
   * @default 0.3
   */
  readonly fadedOpacity?: number
  /**
   * Delay in seconds between the entrances of consecutive bars of this series. Defaults to 40% of `animationDuration` spread across the categories.
   */
  readonly staggerDelay?: number
  /**
   * Per-series pixel gap for stacked front faces. Shifts this segment by its series index and trims non-last segments; Chart stackGap separately positions tooltip endpoints.
   */
  readonly stackGap?: number
  /**
   * Per-series gap in px between the bars of a group.
   * @default 4
   */
  readonly groupGap?: number
  /**
   * Trim a positive front face by the authored perspective rise. Applies to every grouped bar or the last stacked series; independent of depth-provider presence.
   */
  readonly perspective?: boolean
  /**
   * Minimum visible height for nonnegative, nonstacked vertical front faces. Floored bars skip perspective trim. Configure the provider separately when depth surfaces need the same minimum.
   */
  readonly minBarHeight?: number
}

interface GradientStop {
  readonly offset: number
  readonly color: string
}

export interface BarSquaresProps<Key extends string = string> {
  /** Key of the data field that holds this series' values. */
  readonly dataKey: Key
  /** Value-scale group for vertical squares. Omitted or empty selects left. */
  readonly yAxisId?: string | number
  /**
   * Fill color of the squares, or a `url(#id)` reference to a gradient or pattern child.
   * @default "var(--chart-line-primary)"
   */
  readonly fill?: string
  /** Tooltip row and dot/ring color. Falls back to `fill`, then the primary chart color. Useful for gradient or pattern fills. */
  readonly stroke?: string
  /**
   * Gap between stacked squares in px.
   * @default 3
   */
  readonly squareGap?: number
  /**
   * Corner radius of each square as a fraction of its size (0 is flat, 0.5 is a circle).
   * @default 0.25
   */
  readonly squareRadius?: number
  /**
   * Redistribute the gap so the squares fill the bar height exactly.
   * @default false
   */
  readonly squareFit?: boolean
  /**
   * Paint the column with a gradient. Fewer than two `gradientStops` produces two stops in the fill color.
   * @default false
   */
  readonly useGradient?: boolean
  /** Color stops of the column gradient used when `useGradient` is on. */
  readonly gradientStops?: ReadonlyArray<GradientStop>
  /** Preset to tint with the column gradient when `fill` is a paint URL and `useGradient` is on. */
  readonly patternPreset?: PatternPresetId
  /** Whether the squares play their grow entrance. Defaults to true. */
  readonly animate?: boolean
  /**
   * Opacity of the squares that are not hovered while another bar is hovered.
   * @default 0.3
   */
  readonly fadedOpacity?: number
  /** Delay in seconds between consecutive column entrances. Defaults to 40% of `animationDuration` spread across the categories. */
  readonly staggerDelay?: number
  /**
   * Gap in px between the columns of a group.
   * @default 4
   */
  readonly groupGap?: number
}

export interface BarColumnTrackProps {
  /**
   * Fill color of the track squares behind the bars.
   * @default "var(--chart-grid)"
   */
  readonly fill?: string
  /**
   * Opacity of the track.
   * @default 0.3
   */
  readonly opacity?: number
  /**
   * Gap between track squares in px. Match the `BarSquares` value.
   * @default 3
   */
  readonly squareGap?: number
  /**
   * Corner radius of each track square as a fraction of its size. Match the `BarSquares` value.
   * @default 0.25
   */
  readonly squareRadius?: number
  /**
   * Gap in px between the track columns of a group.
   * @default 4
   */
  readonly groupGap?: number
  /**
   * Redistribute the gap so the squares fill the column height exactly.
   * @default false
   */
  readonly squareFit?: boolean
  /** Delay in seconds between consecutive column entrances. Defaults to 40% of `animationDuration` spread across the categories. */
  readonly staggerDelay?: number
}

export interface BarXAxisProps {
  /** Horizontal charts: opt in to the numeric value axis. Omitted preserves category labels. */
  readonly type?: 'category' | 'number'
  /** Formats numeric ticks when type is number. */
  readonly formatValue?: (value: number) => string
  /**
   * Half-width in px of the zone around the date pill inside which tick labels are hidden.
   * @default 50
   */
  readonly tickerHalfWidth?: number
  /**
   * Show every category label instead of thinning to `maxLabels`.
   * @default false
   */
  readonly showAllLabels?: boolean
  /**
   * Maximum number of category labels when `showAllLabels` is off.
   * @default 12
   */
  readonly maxLabels?: number
}

export interface BarYAxisProps {
  /**
   * Horizontal charts: show every category label instead of thinning to `maxLabels`.
   * @default true
   */
  readonly showAllLabels?: boolean
  /**
   * Horizontal charts: maximum number of category labels when `showAllLabels` is off.
   * @default 20
   */
  readonly maxLabels?: number
}

export interface BarDepthSegment {
  /** Size of this segment. The values of all segments should add up to the bar's value. */
  readonly value: number
  /** Color of this segment's side face. */
  readonly color?: string
}

export interface BarDepthProviderProps<Row = unknown> {
  /** The chart children that use the shared depth settings. */
  readonly children?: ReadonlyArray<BarLayer<Row>>
  /**
   * Splits a stacked bar into segments, bottom to top, so each gets its own side face. Return `null` or `undefined` for a single color.
   */
  readonly segmentsAccessor?: (datum: Row) => ReadonlyArray<BarDepthSegment> | null | undefined
  /**
   * Opacity of the contact shadow under the bars. `0` turns it off.
   * @default 0.26
   */
  readonly groundShadow?: number
  /**
   * Minimum rendered bar height in px, so short or zero-value bars stay visible.
   * @default 0
   */
  readonly minBarHeight?: number
}

export interface BarDepthBackProps<Key extends string = string, Row = unknown> {
  /** Key of the data field that holds the values drawn as the 3D side and top faces. */
  readonly dataKey: Key
  /** Color of the faces. Defaults to the series fill. */
  readonly color?: string
  /** Picks a color per row (with its index). Return `undefined` to use `color`. */
  readonly colorAccessor?: (datum: Row, index: number) => string | undefined
}

export interface BarDepthFrontProps<Key extends string = string> {
  /** Key of the data field that holds the values drawn as the glass front face. */
  readonly dataKey: Key
}

export interface BarPulseProps<Key extends string = string> {
  /** Key of the data field of the bar that pulses. */
  readonly dataKey: Key
  /**
   * Index of the category whose bar pulses. Omitted paints no pulse, matching Source.
   */
  readonly activeIndex?: number
  /**
   * Pause the pulse animation.
   * @default false
   */
  readonly pulsePaused?: boolean
}

export type BarOrientation = 'vertical' | 'horizontal'

export interface BarChartProps<Row> {
  /** Fixed primary value bounds; finite and strictly increasing. YAxis.domain takes precedence. */
  readonly yDomain?: readonly [number, number]
  readonly environment?: ChartEnvironment
  /** Opt in to omitting null/absent observations. Omitted keeps upstream zero coercion. */
  readonly missingValues?: 'gap'

  readonly renderContext?: BarContextRenderer<Row>
  readonly xDataKey?: keyof Row & string
  readonly children: ReadonlyArray<BarLayer<Row>>
  readonly orientation?: BarOrientation
  readonly stacked?: boolean
  readonly barGap?: number
  /** Authored category band width; keeps the original category starts and step. Omitted uses the scale bandwidth. */
  readonly barWidth?: number
  readonly stackGap?: number
  readonly squareSnap?: {
    readonly squareGap: number
    readonly groupGap?: number
    readonly fit?: boolean
  }
  readonly status?: ChartStatus
  readonly animationDuration?: number
  readonly animationEasing?: string
  readonly enterTransition?: Transition
  readonly revealSignature?: string
  readonly onPhaseChange?: (phase: ChartPhase) => void
  readonly margin?: Partial<Margin>
  readonly aspectRatio?: string
  readonly style?: ChartStyle
  readonly className?: string
  readonly ariaLabel?: string
  readonly ariaDescription?: string
  readonly width?: number
  readonly height?: number
}

export type BarLayer<Row> =
  | CartesianLayer<Row>
  | { readonly kind: 'bar'; readonly props: BarProps<keyof Row & string> }
  | { readonly kind: 'barSquares'; readonly props: BarSquaresProps<keyof Row & string> }
  | { readonly kind: 'barColumnTrack'; readonly props: BarColumnTrackProps }
  | { readonly kind: 'barXAxis'; readonly props: BarXAxisProps }
  | { readonly kind: 'barYAxis'; readonly props: BarYAxisProps }
  | { readonly kind: 'barDepthProvider'; readonly props: BarDepthProviderProps<Row> }
  | { readonly kind: 'barDepthBack'; readonly props: BarDepthBackProps<keyof Row & string, Row> }
  | { readonly kind: 'barDepthFront'; readonly props: BarDepthFrontProps<keyof Row & string> }
  | { readonly kind: 'barPulse'; readonly props: BarPulseProps<keyof Row & string> }
