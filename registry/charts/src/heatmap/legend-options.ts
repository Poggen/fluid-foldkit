import type { HeatmapLevelStyles } from './colors'

export type HeatmapLegendVariant = 'swatches' | 'gradient'

export interface HeatmapLegendProps {
  /**
   * Label before the swatches.
   * @default "Less"
   */
  readonly lessLabel?: string
  /**
   * Label after the swatches.
   * @default "More"
   */
  readonly moreLabel?: string
  /**
   * Swatch size in pixels.
   * @default 11
   */
  readonly cellSize?: number
  /**
   * Gap between swatches in pixels.
   * @default 2
   */
  readonly gap?: number
  /**
   * Corner radius of the swatches in pixels.
   * @default 2
   */
  readonly cornerRadius?: number
  /**
   * Horizontal alignment of the legend.
   * @default "end"
   */
  readonly align?: 'start' | 'center' | 'end'
  /**
   * Discrete swatches or a continuous gradient bar. The gradient uses solid colors only; patterns are ignored.
   * @default "swatches"
   */
  readonly variant?: HeatmapLegendVariant
  /**
   * Width of the gradient bar in swatch units when `variant` is `"gradient"`.
   * @default 5
   */
  readonly gradientSpan?: number
  /**
   * Font size in pixels of the Less and More labels.
   * @default 12
   */
  readonly fontSize?: number
  /** Additional class name for the Less and More labels. */
  readonly labelClassName?: string
  /** Level colors and patterns. Pass the same value as the chart so swatches match the cells. */
  readonly levelStyles?: HeatmapLevelStyles
  /**
   * Color scale used when `levelStyles` is omitted.
   * @default the default level colors
   */
  readonly colorScale?: (count: number | null | undefined) => string
  /**
   * Opacity of the swatches that are not highlighted while hovering.
   * @default 0.3
   */
  readonly inactiveOpacity?: number
  /**
   * Scale of the swatches that are not highlighted while hovering.
   * @default 1
   */
  readonly inactiveScale?: number
  /**
   * Scale of the highlighted swatch while hovering.
   * @default 1
   */
  readonly activeScale?: number
  /**
   * Syncs the swatch dimming with the chart hover.
   * @default true inside a HeatmapInteractionProvider, false otherwise
   */
  readonly interactive?: boolean
  /** Additional class name for the legend container. */
  readonly className?: string
}
