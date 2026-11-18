import type { DomChartDefinition } from '@tanstack/charts'
import type { ChartMargin } from './types'
import type { ChartTooltipProps } from '../cartesian/tooltip-options'
import type { LiveLineConfig, LiveXAxisConfig, LiveYAxisConfig } from './carriers'
import { buildLiveDefinition } from './definition'
import type { LiveRow } from './definition'
import { commitSteps, headLabels, introEasing, sampledEasing } from './head-ease'
import type { Frame } from './live-frame'
import { liveCss } from './live-css'

export const liveBuilt: (argument0: UseLiveBuiltArgs) => LiveBuilt = function liveBuilt({
  frame,
  width,
  margin,
  plotMargin,
  innerHeight,
  windowSecs,
  numXTicks,
  lerpSpeed,
  pxPerMs,
  uid,
  dataKey: key,
  momentumStroke,
  dotColor,
  line,
  xAxis,
  yAxis,
  tooltipCfg,
  tooltipEnabled,
  formatValue,
  formatTime,
}: UseLiveBuiltArgs) {
  const xTickTimes = (() => {
    const n = Math.max(2, xAxis?.numTicks ?? numXTicks)
    const start = frame?.xDomain[0] ?? 0

    return Array.from(
      { length: n },
      (_, i) => start + (i * windowSecs * 1000) / (n - 1) - (frame?.rollMs ?? 0),
    )
  })()

  const hoverBounds = (() => ({
    left: margin.left,
    right: (width || 800) - margin.right,
    top: margin.top,
    bottom: margin.top + innerHeight,
  }))()

  const pad = (() => {
    const rows = frame?.rows ?? []
    const first = rows.findIndex((r) => !r.pad)
    const start = rows.at(1)
    const firstReal = rows.at(first)

    return first > 1 && firstReal !== undefined && start !== undefined
      ? Math.round((firstReal.t - start.t) * pxPerMs * 10) / 10
      : 0
  })()

  const labels = (() =>
    frame ? headLabels(frame.disp0, frame.tip?.v ?? 0, lerpSpeed, formatValue) : [])()

  const headCss = (() => liveCss(lerpSpeed))()
  const introEase = (() => introEasing(lerpSpeed, frame?.rollMs ?? 600))()

  const introEaseCss = (() => sampledEasing(introEase))()

  const built = (() =>
    frame
      ? buildLiveDefinition({
          rows: frame.rows,
          xDomain: frame.xDomain,
          yDomain: frame.yDomain,
          areaFloor: frame.areaFloor,
          margin: plotMargin,
          uid,
          dataKey: key,
          stroke: momentumStroke,
          strokeWidth: line?.strokeWidth ?? 2,
          dotColor,
          dotSize: line?.dotSize ?? 4,
          fill: line?.fill !== false,
          badge: line?.badge !== false,
          badgeLabels: labels,
          badgeParity: frame.parity,
          dispV: frame.disp0,
          pxPerMs,
          still: frame.seed,
          tipEase: !frame.intro && !frame.seed,
          yJump: frame.jump,
          tip: frame.tip,
          rollMs: frame.rollMs,
          easing: frame.intro
            ? introEase
            : (p: number) => Math.floor(p * commitSteps(frame.rollMs)) / commitSteps(frame.rollMs),
          xTickTimes,
          hoverBounds,
          formatTime,
          formatValue: yAxis?.formatValue ?? formatValue,
          yPosition: yAxis?.position ?? 'left',
          plotHeight: innerHeight,
          showCrosshair: tooltipCfg?.showCrosshair !== false,
          showDots: tooltipCfg?.showDots !== false,
          hoverDotSize: (tooltipCfg?.dotSize ?? 5) * (tooltipCfg?.dotScale ?? 1),
          showPill: xAxis !== undefined,
          tooltipEnabled,
          ...(tooltipCfg === undefined ? {} : { tooltipBox: tooltipCfg }),
        })
      : null)()

  return { built, hoverBounds, pad, headCss, introEaseCss }
}

interface UseLiveBuiltArgs {
  readonly frame: Frame | null
  readonly width: number
  readonly margin: ChartMargin
  readonly plotMargin: ChartMargin
  readonly innerHeight: number
  readonly windowSecs: number
  readonly numXTicks: number
  readonly lerpSpeed: number
  readonly pxPerMs: number
  readonly uid: string
  readonly dataKey: string
  readonly momentumStroke: string
  readonly dotColor: string
  readonly line: LiveLineConfig | undefined
  readonly xAxis: LiveXAxisConfig | undefined
  readonly yAxis: LiveYAxisConfig | undefined
  readonly tooltipCfg:
    | Pick<
        ChartTooltipProps,
        | 'showCrosshair'
        | 'showDots'
        | 'dotSize'
        | 'dotScale'
        | 'boxSpringConfig'
        | 'matchCrosshair'
        | 'springConfig'
        | 'damping'
      >
    | undefined
  readonly tooltipEnabled: boolean
  readonly formatValue: (value: number) => string
  readonly formatTime: (time: number) => string
}

interface LiveBuilt {
  readonly built: {
    readonly definition: DomChartDefinition<LiveRow, Date, number>
    readonly fillRamp: {
      readonly top: number
      readonly bottom: number
    }
  } | null
  readonly hoverBounds: {
    left: number
    right: number
    top: number
    bottom: number
  }
  readonly pad: number
  readonly headCss: string
  readonly introEaseCss: string
}
