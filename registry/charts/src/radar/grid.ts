import type { RadarChild } from './options'

/** Props for `RadarGrid`. */
export interface RadarGridProps {
  /**
   * Print the value of each grid ring along the first spoke.
   * @default true
   */
  readonly showLabels?: boolean
  /**
   * Colour of the grid lines.
   * @default "var(--bkm-border)"
   */
  readonly stroke?: string
  /**
   * Opacity of the grid lines, from 0 to 1.
   * @default 0.6
   */
  readonly strokeOpacity?: number
  /** Extra class name for the grid lines. */
  readonly className?: string
}

/**
 * Draws the concentric grid rings (the spider web) and, by default, their value labels. Include it as a child of `RadarChart`; it renders nothing by itself. Leave it out for a chart without a grid.
 */
export const RadarGrid: (props?: RadarGridProps) => RadarChild = (props: RadarGridProps = {}) =>
  ({ kind: 'grid', props }) satisfies RadarChild
