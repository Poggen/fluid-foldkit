import type { ChartStyle as CSSProperties } from '../cartesian/content-types'
import type { ChartMargin } from './types'
import type { LiveSample } from './live-frame'

const medianInterval: (times: ReadonlyArray<number>) => number = function medianInterval(
  times: ReadonlyArray<number>,
) {
  const deltas: Array<number> = []

  for (let i = Math.max(1, times.length - 20); i < times.length; i += 1) {
    const d = (times[i] ?? 0) - (times[i - 1] ?? 0)

    if (d > 0) {
      deltas.push(d)
    }
  }

  if (deltas.length === 0) {
    return 1
  }

  deltas.sort((a, b) => a - b)

  return deltas[Math.floor(deltas.length / 2)] ?? 1
}

export const livePlot: (argument0: UseLivePlotArgs, lockedStep: number) => LivePlot =
  function livePlot(
    { width, data, windowSecs, numXTicks, nowOffsetUnits, margin, rightAxis }: UseLivePlotArgs,
    lockedStep: number,
  ) {
    const W = width || 800
    const bklitWidth = Math.max(1, W - margin.left - margin.right)
    const pxPerMs = bklitWidth / (windowSecs * 1000)
    const stepSecs = lockedStep || medianInterval(data.map((p) => p.time))
    const leadingMs = (nowOffsetUnits * windowSecs * 1000) / Math.max(1, numXTicks - 1)

    const plotRight = Math.max(
      margin.left + 1,
      margin.left + bklitWidth - leadingMs * pxPerMs - 2 * stepSecs * 1000 * pxPerMs,
    )

    const plotWidth = plotRight - margin.left

    const rollEdge = Math.max(
      margin.left + 1,
      plotRight - ROLL_SLACK_STEPS * stepSecs * 1000 * pxPerMs,
    )

    const plotMargin = { ...margin, right: W - rollEdge }

    const clipExt = Math.max(
      0,
      (rightAxis ? W + TIP_OVERHANG : W - margin.right + Math.min(margin.right, TIP_CLEARANCE)) -
        rollEdge,
    )

    const labelShift = rightAxis ? Math.max(0, W - margin.right - rollEdge) : 0

    return {
      bklitWidth,
      pxPerMs,
      stepSecs,
      plotRight,
      plotWidth,
      rollEdge,
      plotMargin,
      clipExt,
      labelShift,
    }
  }

export const parseHeight: (raw: CSSProperties['height']) => number = function parseHeight(
  raw: CSSProperties['height'],
) {
  if (typeof raw === 'number' && raw > 0) {
    return raw
  }

  if (typeof raw === 'string') {
    const n = Number.parseFloat(raw)

    if (Number.isFinite(n) && n > 0) {
      return n
    }
  }

  return DEFAULT_HEIGHT
}

const DEFAULT_HEIGHT = 300

const TIP_CLEARANCE = 16

const TIP_OVERHANG = 160

const ROLL_SLACK_STEPS = 2

interface UseLivePlotArgs {
  readonly width: number
  readonly data: ReadonlyArray<LiveSample>
  readonly windowSecs: number
  readonly numXTicks: number
  readonly nowOffsetUnits: number
  readonly margin: ChartMargin
  readonly rightAxis: boolean
}

export interface LivePlot {
  readonly bklitWidth: number
  readonly pxPerMs: number
  readonly stepSecs: number
  readonly plotRight: number
  readonly plotWidth: number
  readonly rollEdge: number
  readonly plotMargin: ChartMargin
  readonly clipExt: number
  readonly labelShift: number
}
