/** Props of the highlight drawn behind the chart owner's current drag selection. */
export interface SegmentBackgroundProps {
  /** Defaults to var(--chart-segment-background). */
  readonly fill?: string
}

export type SegmentLineVariant = 'dashed' | 'solid' | 'gradient'

/** Props of the vertical line at either edge of the current drag selection. */
export interface SegmentLineProps {
  /** Defaults to var(--chart-segment-line). */
  stroke?: string
  /** Width in px. Defaults to 1. */
  strokeWidth?: number
  /** Defaults to dashed. Gradient fades over the top and bottom 10%. */
  readonly variant?: SegmentLineVariant
}
