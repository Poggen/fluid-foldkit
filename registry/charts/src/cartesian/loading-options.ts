import type { Margin } from './context-types'
import type { LoadingStyle } from '../kit/motion/phase'

/** Props of `LineChartLoading` and `AreaChartLoading`. */
export interface CartesianLoadingProps {
  /**
   * Space around the plot area in pixels. Missing sides use the default.
   * @default { top: 40, right: 40, bottom: 40, left: 40 }
   */
  readonly margin?: Partial<Margin>
  /**
   * Color of the traveling loading segment.
   * @default "var(--bkm-foreground)"
   */
  readonly stroke?: string
  /**
   * Opacity of the traveling loading segment.
   * @default 0.5
   */
  readonly strokeOpacity?: number
  /**
   * Color of the grid lines while loading. Use `color-mix` or an oklch alpha to set the opacity.
   * @default "color-mix(in oklch, var(--chart-grid) 50%, transparent)"
   */
  readonly gridStroke?: string
  /**
   * Color of the shimmer band that travels across the grid. Use `color-mix` or an oklch alpha to set the opacity.
   * @default "color-mix(in oklch, var(--bkm-foreground) 68%, transparent)"
   */
  readonly gridShimmerStroke?: string
  /**
   * Animate a shimmer band across the grid lines. Always off when `loadingStyle` is `"sweep"`.
   * @default true
   */
  readonly gridShimmer?: boolean
  /** Accepted for bklit-ui compatibility. It has no effect: the shimmer band has a fixed width. */
  readonly gridShimmerLength?: number
  /**
   * Shimmer speed multiplier; higher is faster.
   * @default 1
   */
  readonly gridShimmerSpeed?: number
  /** Accepted for bklit-ui compatibility. It has no effect: the shimmer always loops on the same period as the line pulse. */
  readonly gridShimmerSync?: boolean
  /**
   * Loading animation: `"pulse"` sends a bright segment along the line, `"sweep"` sweeps a soft diagonal shimmer across it.
   * @default "pulse"
   */
  readonly loadingStyle?: LoadingStyle
  /**
   * Text shown centered over the placeholder, with a shimmer. An empty string hides it.
   * @default "Loading"
   */
  readonly label?: string
  /**
   * CSS aspect ratio of the placeholder, as `"width / height"`.
   * @default "2 / 1"
   */
  readonly aspectRatio?: string
  /**
   * Extra CSS class name for the placeholder container.
   * @default ""
   */
  readonly className?: string
}

export type LineChartLoadingProps = CartesianLoadingProps

export type AreaChartLoadingProps = CartesianLoadingProps
