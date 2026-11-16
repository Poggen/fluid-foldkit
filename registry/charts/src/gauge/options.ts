import type { ChartRendererHostOptions } from '@tanstack/charts'
import { ARC_ASPECT, buildGaugeDefinition, gaugeMotion } from './definition'
import type { GaugeDefinitionInput } from './definition'
import type { GaugeNotchRow } from './notches'
import type { GaugeProps } from './props'

const gaugeFill = (props: GaugeProps, uid: string): GaugeDefinitionInput['fill'] => {
  let fill: GaugeDefinitionInput['fill'] = {
    total: props.totalNotches ?? 40,
    useGradient: props.useGradient ?? false,
    themeGradientPaint: `url(#${uid}-gauge-theme-active)`,
  }

  if (props.activeFill !== undefined) {
    fill = { ...fill, activeFill: props.activeFill }
  }

  if (props.inactiveFill !== undefined) {
    fill = { ...fill, inactiveFill: props.inactiveFill }
  }

  if (props.activeGradient !== undefined) {
    fill = { ...fill, activeGradient: props.activeGradient }
  }

  if (props.inactiveGradient !== undefined) {
    fill = { ...fill, inactiveGradient: props.inactiveGradient }
  }

  return fill
}

const gaugeDimensions = (
  props: GaugeProps,
  linear: boolean,
  fixed: boolean,
  trackHeight: number,
) => {
  const arcDimensions =
    fixed && props.height !== undefined ? { height: props.height } : { aspectRatio: ARC_ASPECT }

  const dimensions = linear ? { height: trackHeight } : arcDimensions

  return props.width !== undefined && (linear || fixed)
    ? { ...dimensions, width: props.width }
    : dimensions
}

/** Shared with the server reserve so responsive dimensions and drawing inputs cannot diverge. */
export function gaugeOptions(
  props: GaugeProps,
  uid: string,
  animate: boolean,
): ChartRendererHostOptions<GaugeNotchRow, number, number> {
  const linear = props.orientation === 'linear'
  const fixed = props.width !== undefined && props.height !== undefined

  const trackHeight =
    linear && props.width === undefined
      ? (props.linearHeight ?? 24)
      : (props.height ?? props.linearHeight ?? 24)

  return {
    definition: buildGaugeDefinition({
      linear,
      fixedArc:
        fixed && props.width !== undefined && props.height !== undefined
          ? { width: props.width, height: props.height }
          : undefined,
      uniformWidth: props.uniformWidth,
      trackHeight,
      value: props.value,
      spacing: props.spacing ?? 25,
      startAngle: props.startAngle ?? 135,
      endAngle: props.endAngle ?? 405,
      notchCornerRadius: props.notchCornerRadius ?? 0,
      notchLengthPercent: props.notchLengthPercent ?? 100,
      notchWidthPercent: props.notchWidthPercent ?? 80,
      inactiveFillOpacity: props.inactiveFillOpacity ?? 0.8,
      activeFillOpacity: props.activeFillOpacity ?? 1,
      animate,
      fill: gaugeFill(props, uid),
    }),
    renderer: gaugeMotion,
    ariaLabel: `Gauge: ${Math.round(props.value)}%`,
    idPrefix: uid,
    ...gaugeDimensions(props, linear, fixed, trackHeight),
  }
}
