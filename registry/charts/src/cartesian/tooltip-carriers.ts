import type { CartesianLayer } from './layers'
import type { ChartTooltipProps } from './tooltip-options'

export function mergeTooltipCarriers<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
): ChartTooltipProps<Row> | undefined {
  const tooltip = children.find((child) => child.kind === 'tooltip')?.props

  if (tooltip === undefined) {
    return undefined
  }

  const dot = children.find((child) => child.kind === 'tooltipDot')?.props
  const indicator = children.find((child) => child.kind === 'tooltipIndicator')?.props

  return {
    ...(dot === undefined
      ? {}
      : {
          showDots: dot.visible !== false,
          ...(dot.size === undefined ? {} : { dotSize: dot.size }),
          ...(dot.strokeWidth === undefined ? {} : { dotStrokeWidth: dot.strokeWidth }),
          ...(dot.color === undefined ? {} : { dotColor: dot.color }),
          ...(dot.variant === undefined ? {} : { dotVariant: dot.variant }),
        }),
    ...(indicator === undefined
      ? {}
      : {
          showCrosshair: indicator.visible !== false,
          ...(indicator.colorEdge === undefined ? {} : { indicatorColor: indicator.colorEdge }),
          ...(indicator.strokeDasharray === undefined
            ? {}
            : { indicatorDasharray: indicator.strokeDasharray }),
          ...(indicator.width === undefined ? {} : { indicatorWidth: indicator.width }),
          ...(typeof indicator.fadeEdges === 'string'
            ? { indicatorFadeEdges: indicator.fadeEdges }
            : indicator.fadeEdges === false
              ? { indicatorFadeEdges: 'none' }
              : {}),
          ...(indicator.fadeLength === undefined
            ? {}
            : { indicatorFadeLength: indicator.fadeLength }),
        }),
    ...tooltip,
  }
}
