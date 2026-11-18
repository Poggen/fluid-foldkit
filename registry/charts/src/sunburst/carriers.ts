/** Props of `SunburstSegment`. */
export interface SunburstSegmentProps {
  /** Arc index to customize, from the `arcs` array returned by `buildArcs`. */
  index: number
  /** Color override for this segment. */
  color?: string
  /** Plain fill color override. Patterns and gradients are not supported. */
  fill?: string
  /** Fill opacity override (0 to 1).
   * @default 1 for the innermost visible ring, then fading with depth down to 0.45 */
  fillOpacity?: number
}

/** Props of `SunburstCenter`. */
export interface SunburstCenterProps {
  /** Accepted for bklit compatibility; it has no effect. */
  className?: string
}

/** Props of `SunburstLabels`. */
export interface SunburstLabelsProps {
  /**
   * Label font size in pixels.
   * @default 11
   */
  fontSize?: number
  /**
   * Label text color.
   * @default "var(--chart-label)"
   */
  fill?: string
  /**
   * Color of the halo behind the label text.
   * @default "var(--chart-background)"
   */
  stroke?: string
  /**
   * Width in pixels of the halo behind the label text. Use `0` to disable it.
   * @default 2.5
   */
  strokeWidth?: number
  /** Accepted for bklit compatibility; it has no effect. */
  className?: string
}

import type { SunburstBreadcrumbProps } from './breadcrumb'
import type { SunburstHintProps } from './hint'

export type SunburstCarrier =
  | { readonly role: 'breadcrumb'; readonly props: SunburstBreadcrumbProps }
  | { readonly role: 'hint'; readonly props: SunburstHintProps }
  | { readonly role: 'segment'; readonly props: SunburstSegmentProps }
  | { readonly role: 'center'; readonly props: SunburstCenterProps }
  | { readonly role: 'labels'; readonly props: SunburstLabelsProps }

export const SunburstSegment: (props: SunburstSegmentProps) => SunburstCarrier = (
  props: SunburstSegmentProps,
) => ({
  role: 'segment',
  props,
})

export const SunburstCenter: (props?: SunburstCenterProps) => SunburstCarrier = (
  props: SunburstCenterProps = {},
) =>
  ({
    role: 'center',
    props,
  }) satisfies SunburstCarrier

export const SunburstLabels: (props?: SunburstLabelsProps) => SunburstCarrier = (
  props: SunburstLabelsProps = {},
) =>
  ({
    role: 'labels',
    props,
  }) satisfies SunburstCarrier
