/* @license Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT. */
import { DEFAULT_Y_DOMAIN_TWEEN_MS } from './motion/phase'
import type { ChartPhase, LineLoadingPulseMode } from './motion/phase'
import { TOOLTIP_BOX_SPRING } from './motion/springs'
import type { SeriesPointMarkerStyle, SpringConfig } from '../cartesian/series-options'
import type { IndicatorFadeEdges } from '../cartesian/tooltip-options'

export const indicatorFadeGradientStops: (
  sides: VerticalFadeSides,
  fadeLengthPercent?: number,
) => Array<IndicatorFadeGradientStop> = function (
  sides: VerticalFadeSides,
  fadeLengthPercent = 10,
) {
  const fade = Math.min(40, Math.max(2, fadeLengthPercent))
  const innerEnd = 100 - fade

  if (!sides.any) {
    return [{ offset: '0%', opacity: 1 }] satisfies Array<IndicatorFadeGradientStop>
  }

  if (sides.top && sides.bottom) {
    return [
      { offset: '0%', opacity: 0 },
      { offset: `${fade}%`, opacity: 1 },
      { offset: '50%', opacity: 1 },
      { offset: `${innerEnd}%`, opacity: 1 },
      { offset: '100%', opacity: 0 },
    ] satisfies Array<IndicatorFadeGradientStop>
  }

  if (sides.top) {
    return [
      { offset: '0%', opacity: 0 },
      { offset: `${fade}%`, opacity: 1 },
      { offset: '100%', opacity: 1 },
    ] satisfies Array<IndicatorFadeGradientStop>
  }

  return [
    { offset: '0%', opacity: 1 },
    { offset: `${innerEnd}%`, opacity: 1 },
    { offset: '100%', opacity: 0 },
  ] satisfies Array<IndicatorFadeGradientStop>
}

export const resolveTooltipBoxMotion: (damping?: number) => TooltipBoxMotion =
  function resolveTooltipBoxMotion(damping?: number) {
    if (damping === 0) {
      return { animate: false, springConfig: TOOLTIP_BOX_SPRING }
    }

    const effectiveDamping = damping ?? DEFAULT_TOOLTIP_BOX_DAMPING
    let { stiffness } = TOOLTIP_BOX_SPRING

    if (effectiveDamping < DEFAULT_TOOLTIP_BOX_DAMPING) {
      stiffness +=
        ((DEFAULT_TOOLTIP_BOX_DAMPING - effectiveDamping) / DEFAULT_TOOLTIP_BOX_DAMPING) * 400
    } else if (effectiveDamping > DEFAULT_TOOLTIP_BOX_DAMPING) {
      stiffness -=
        ((effectiveDamping - DEFAULT_TOOLTIP_BOX_DAMPING) / (100 - DEFAULT_TOOLTIP_BOX_DAMPING)) *
        85
    }

    return {
      animate: true,
      springConfig: { stiffness: Math.max(12, Math.round(stiffness)), damping: effectiveDamping },
    }
  }

export const resolveVerticalFadeSides: (fade: IndicatorFadeEdges | boolean) => VerticalFadeSides =
  function resolveVerticalFadeSides(fade: IndicatorFadeEdges | boolean) {
    if (fade === false || fade === 'none') {
      return { top: false, bottom: false, any: false }
    }

    if (fade === true || fade === 'both') {
      return { top: true, bottom: true, any: true }
    }

    if (fade === 'top') {
      return { top: true, bottom: false, any: true }
    }

    return { top: false, bottom: true, any: true }
  }

export const resolveLineLoadingPulseMode: (phase: ChartPhase) => LineLoadingPulseMode | null =
  function resolveLineLoadingPulseMode(phase: ChartPhase) {
    if (phase === 'loading') {
      return 'loop'
    }

    if (phase === 'exiting') {
      return 'exit'
    }

    if (phase === 'revealingLoading') {
      return 'enter'
    }

    return null
  }

export const getSeriesMarkerVisualExtent: (
  style: Pick<
    SeriesPointMarkerStyle,
    'radius' | 'strokeWidth' | 'ringGap' | 'outlineWidth' | 'showActiveHighlight'
  >,
) => number = function getSeriesMarkerVisualExtent(
  style: Pick<
    SeriesPointMarkerStyle,
    'radius' | 'strokeWidth' | 'ringGap' | 'outlineWidth' | 'showActiveHighlight'
  >,
) {
  const radius = style.radius ?? 5
  const strokeWidth = style.strokeWidth ?? 2
  const ringGap = style.ringGap ?? 2
  const outlineWidth = style.outlineWidth ?? 0
  const showActiveHighlight = style.showActiveHighlight ?? true
  const ring = strokeWidth > 0 ? ringGap + strokeWidth : 0
  let outline = 0

  if (outlineWidth > 0) {
    outline = outlineWidth
  }

  const highlightPad = showActiveHighlight ? radius * 0.35 : 0

  return radius + ring + outline + highlightPad + 2
}

/** Source default lifecycle singleton; nested domain tuples remain mutable. */
interface DefaultChartLifecycle {
  readonly chartPhase: 'ready'
  readonly chartStatus: 'ready'
  readonly loadingLabel: undefined
  readonly yDomainTweenDuration: typeof DEFAULT_Y_DOMAIN_TWEEN_MS
  readonly yDomainSkeletonByAxis: { readonly left: [number, number] }
  readonly yDomainTargetByAxis: { readonly left: [number, number] }
}

export const DEFAULT_CHART_LIFECYCLE: DefaultChartLifecycle = {
  chartPhase: 'ready',
  chartStatus: 'ready',
  loadingLabel: undefined,
  yDomainTweenDuration: DEFAULT_Y_DOMAIN_TWEEN_MS,
  yDomainSkeletonByAxis: { left: [0, 100] },
  yDomainTargetByAxis: { left: [0, 100] },
}

const DEFAULT_TOOLTIP_BOX_DAMPING = TOOLTIP_BOX_SPRING.damping

interface TooltipBoxMotion {
  animate: boolean
  springConfig: SpringConfig
}

export interface VerticalFadeSides {
  top: boolean
  bottom: boolean
  any: boolean
}

export interface IndicatorFadeGradientStop {
  /** Position along the indicator as a percentage string, for example `"10%"`. */
  offset: string
  /** Opacity at that position, from 0 to 1. */
  opacity: number
}
