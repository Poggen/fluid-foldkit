import { REST_GRANULAR } from '../kit/motion/spring-curve'
import { LIVE_Y_TICK_SPRING } from '../kit/motion/springs'

/** bklit's pickNiceInterval (live-y-axis.tsx:15-55): a 1/2/2.5-ladder step keeping labels ~minGap px apart, with hysteresis. */
export const pickNiceInterval: (
  valRange: number,
  chartHeight: number,
  minGap: number,
  prev: number,
) => number = function pickNiceInterval(
  valRange: number,
  chartHeight: number,
  minGap: number,
  prev: number,
) {
  if (valRange <= 0 || chartHeight <= 0) {
    return 1
  }

  const pxPerUnit = chartHeight / valRange

  if (prev > 0) {
    const px = prev * pxPerUnit

    if (px >= minGap * 0.5 && px <= minGap * 3) {
      return prev
    }
  }

  const divisorSets = [
    [2, 2.5, 2],
    [2, 2, 2.5],
    [2.5, 2, 2],
  ]

  let best = Number.POSITIVE_INFINITY

  for (const divs of divisorSets) {
    let span = 10 ** Math.ceil(Math.log10(valRange))
    let i = 0
    let d = divs[i % 3] ?? 2

    while ((span / d) * pxPerUnit >= minGap) {
      span /= d
      i += 1
      d = divs[i % 3] ?? 2
    }

    best = Math.min(best, span)
  }

  return best === Number.POSITIVE_INFINITY ? valRange / 5 : best
}

export const edgeOpacity: (y: number, height: number) => number = function edgeOpacity(
  y: number,
  height: number,
) {
  const fromEdge = Math.min(y, height - y)

  if (fromEdge >= EDGE_FADE_PX) {
    return 1
  }

  return fromEdge <= 0 ? 0 : fromEdge / EDGE_FADE_PX
}

/** bklit's tick values for a domain and step (live-y-axis.tsx:141-157, 182): candidates over the domain padded by half a step, kept while within Y_KEEP_PX of the plot. */
export const yTickValues: (
  domain: readonly [number, number],
  interval: number,
  height: number,
  allowDecimals: boolean,
) => Array<number> = function yTickValues(
  domain: readonly [number, number],
  interval: number,
  height: number,
  allowDecimals: boolean,
) {
  const [lo, hi] = domain
  const values: Array<number> = []

  if (!(interval > 0 && hi > lo)) {
    return values
  }

  const pxPer = height / (hi - lo)

  for (
    let v = Math.ceil((lo - interval * 0.5) / interval) * interval;
    v <= hi + interval * 0.5;
    v += interval
  ) {
    const rounded = Math.round(v * 1e10) / 1e10
    const y = (hi - rounded) * pxPer

    if (
      y >= -Y_KEEP_PX &&
      y <= height + Y_KEEP_PX &&
      (allowDecimals || Number.isInteger(rounded))
    ) {
      values.push(rounded)
    }
  }

  return values
}

/** Where a label may sit, as an offset from its tick (px): bklit drops a tick once its y leaves [-10, h+10] (live-y-axis.tsx:182) and its exit animates opacity only (:205), so a label never travels past there;
 * the native axis places a seed label at its final slot, this pulls it back to that bound. */
export const clampedOffset: (plotY: number, height: number) => number = function clampedOffset(
  plotY: number,
  height: number,
) {
  return Math.min(height + Y_KEEP_PX, Math.max(-Y_KEEP_PX, plotY)) - plotY
}

const EDGE_FADE_PX = 28

const Y_KEEP_PX = 10

/** bklit's tick spring (live-y-axis.tsx:89): label glide and enter/exit fade, no rest thresholds, so motion picks them per value from the starting delta (motion-dom 12.27.0 spring/index.mjs:83-88, defaults.mjs):
 * under 5 units "granular" (0.01 / 0.005), else 2 / 0.5; opacity is always granular. One transition drives both channels, and px thresholds made a fade stop within 0.5 and snap, so granular ones are used (y rests at 0.005px). */
export const Y_TICK_SPRING = {
  type: 'spring',
  ...LIVE_Y_TICK_SPRING,
  restSpeed: REST_GRANULAR.speed,
  restDelta: REST_GRANULAR.delta,
} satisfies import('@tanstack/charts').ChartMotionTransition
