import type { SpringConfig } from './series-options'

export interface TooltipBoxGeometry {
  readonly x: number
  readonly y: number
  readonly containerWidth: number
  readonly containerHeight: number
  readonly offset?: number
  readonly left?: number
  readonly top?: number
  readonly flipped?: boolean
  readonly animate?: boolean
  readonly entrance?: boolean
  readonly springConfig?: SpringConfig
}

export interface TooltipPanelSize {
  readonly width: number
  readonly height: number
}

/** Original TooltipBox: horizontal flip, centered y, then clamp inside the container. */
export function tooltipBoxTarget(props: TooltipBoxGeometry, size: TooltipPanelSize) {
  const offset = props.offset ?? 16
  const flipped = props.x + size.width + offset > props.containerWidth

  return {
    left: flipped ? props.x - offset - size.width : props.x + offset,
    top: Math.max(
      offset,
      Math.min(props.y - size.height / 2, props.containerHeight - size.height - offset),
    ),
    flipped,
  }
}
