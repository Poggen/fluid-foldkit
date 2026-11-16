import { scaleBand } from 'd3-scale'
import type { BarDatum, BarSeries } from './model'
import type { OverlayDot } from '../cartesian/hover-overlay'
import { yScaleForAxis } from '../cartesian/build-state'
import { topSquareCenterY } from './geometry'

/** Where bklit's horizontal-bar crosshair sits for a category: the end of the longest bar (cumulative end when stacked), as a value on the value scale. */
export function barEndValues<Row>(
  datums: ReadonlyArray<BarDatum<Row>>,
  stacked: boolean,
): ReadonlyMap<string, number> {
  const byCategory = new Map<string, Array<number>>()

  for (const d of datums) {
    if (Number.isFinite(d.value)) {
      const list = byCategory.get(d.category)

      if (list) {
        list.push(d.value)
      } else {
        byCategory.set(d.category, [d.value])
      }
    }
  }

  return new Map(
    [...byCategory].map(([category, values]): readonly [string, number] => [
      category,
      stacked ? values.reduce((a, b) => a + b, 0) : Math.max(...values),
    ]),
  )
}

interface DotCross<Row> {
  readonly d: BarDatum<Row>
  readonly i: number
  readonly bandwidth: number
  readonly slot: number
  readonly gapPx: number
  readonly seriesCount: number
  readonly stacked: boolean
  readonly square: { readonly groupGap: number } | undefined
}

/** Offset of a bar's dot from the band centre: stacked bars sit on it, square columns use their own slot width. */
function dotCross<Row>({
  d,
  i,
  bandwidth,
  slot,
  gapPx,
  seriesCount,
  stacked,
  square,
}: DotCross<Row>): number {
  if (square && d.value > 0) {
    const sqGap = seriesCount > 1 ? square.groupGap : 0
    const size = Math.max(0, (bandwidth - sqGap * (seriesCount - 1)) / seriesCount)

    return -bandwidth / 2 + i * (size + sqGap) + size / 2
  }

  return stacked ? 0 : -bandwidth / 2 + i * (slot + gapPx) + slot / 2
}

/** bklit TooltipDot variant "ring": a transparent rounded square around the bar end (tooltip-dot.tsx:30-35, 132-148; chart-tooltip.tsx:145-160). */
export interface RingDots {
  readonly fraction: number
  readonly scale: number
  readonly size: number
  /** Gap between square slots: the squareSnap group gap, else 4 for several series. */
  readonly slotGap: number
  readonly strokeWidth: number
  readonly color?: string
}

function ringHalfExtent(ring: RingDots, bandwidth: number, count: number): number {
  if (bandwidth <= 0) {
    return ring.size * ring.scale
  }

  return (Math.max(0, (bandwidth - ring.slotGap * (count - 1)) / count) / 2) * ring.scale
}

export interface HoverDotsOptions<Row> {
  readonly datums: ReadonlyArray<BarDatum<Row>>
  readonly series: ReadonlyArray<BarSeries>
  readonly categories: ReadonlyArray<string>
  readonly barGap: number
  readonly barWidth?: number
  readonly groupGap: number
  readonly ring?: RingDots
  readonly radius?: number
  readonly stacked?: boolean
  readonly stackGap?: number
  /** Series drawn as stacked squares: dots sit on the column top, not the raw value. */
  readonly squares?: ReadonlyMap<
    string,
    { readonly gap: number; readonly fit: boolean; readonly groupGap: number }
  >
  /** BarChart `squareSnap`: grouped vertical dots sit on the centre of the column's top square (bklit bar-chart.tsx:486-494). */
  readonly squareSnap?: { readonly squareGap: number; readonly fit?: boolean }
}

/** The band geometry of a plot: bandwidth and the centre of each category from the left of the plot (the chart's `scaleBand` with the same padding). */
export function bandOf(
  categories: ReadonlyArray<string>,
  barGap: number,
  innerWidth: number,
  barWidth?: number,
): { readonly bandwidth: number; readonly centre: (category: string) => number } {
  const band = scaleBand().domain(categories).range([0, innerWidth]).padding(barGap)
  const bandwidth = barWidth ?? band.bandwidth()

  return { bandwidth, centre: (category) => (band(category) ?? Number.NaN) + bandwidth / 2 }
}

/** Vertical-bar dots for the host's HoverOverlay (bklit's per-bar TooltipDot): one per series, placed on the focused category's bar end. */
export function barOverlayDots<Row>(options: HoverDotsOptions<Row>): Array<OverlayDot<Row>> {
  const {
    datums,
    series,
    categories,
    barGap,
    barWidth,
    groupGap,
    radius = 5,
    squares,
    squareSnap,
    stacked = false,
    stackGap = 0,
    ring,
  } = options

  const slots = new Map(series.map((s, i): readonly [string, number] => [s.key, i]))
  const byCategory = new Map<string, Array<BarDatum<Row>>>()

  for (const d of datums) {
    const list = byCategory.get(d.category)

    if (list) {
      list.push(d)
    } else {
      byCategory.set(d.category, [d])
    }
  }

  const count = Math.max(1, series.length)
  const gapPx = count > 1 ? groupGap : 0
  const bandFor = memoBand(categories, barGap, barWidth)
  const seriesKeys = [...new Set(datums.map((d) => d.series))]

  return seriesKeys.map((key): OverlayDot<Row> => {
    const i = slots.get(key) ?? 0
    const item = series[i]
    const fill = (item?.bar ?? item?.squares)?.stroke || item?.fill || 'var(--chart-line-primary)'

    return {
      yAxis: yScaleForAxis(item?.yAxisId).yScale,
      valueOf: () => undefined,
      glide: true,
      shapes: ring
        ? (plot) => {
            const half = ringHalfExtent(ring, bandFor(plot.innerWidth).bandwidth, count)

            return [
              {
                r: half,
                corner: half * 2 * Math.max(0, Math.min(0.5, ring.fraction)),
                fill: 'transparent',
                stroke: ring.color ?? fill,
                strokeWidth: ring.strokeWidth,
              },
            ]
          }
        : [{ r: radius, fill, stroke: 'var(--chart-background)', strokeWidth: 2 }],
      at: (_row, plot, index) => {
        const list = byCategory.get(categories[index] ?? '')
        const sy = plot.yDomains[yScaleForAxis(item?.yAxisId).yScale]

        if (!list || !sy) {
          return undefined
        }

        const { bandwidth } = bandFor(plot.innerWidth)
        const slot = Math.max(0, (bandwidth - gapPx * (count - 1)) / count)
        let cumulative = 0
        let seen = 0

        for (const d of list) {
          let { value } = d
          let along = 0

          if (stacked) {
            cumulative += Number.isFinite(d.value) ? d.value : 0
            value = cumulative
            along = seen * stackGap * -1
            seen += 1
          }

          if (d.series === key) {
            const toY = (v: number): number =>
              plot.innerHeight - ((v - sy[0]) / (sy[1] - sy[0] || 1)) * plot.innerHeight

            const raw = toY(value) + along

            const y =
              squareSnap && !stacked && value > 0
                ? topSquareCenterY({
                    baselineY: toY(0),
                    barLengthPx: toY(0) - raw,
                    squareSize: slot,
                    gap: squareSnap.squareGap,
                    ...(squareSnap.fit === undefined ? {} : { fit: squareSnap.fit }),
                  })
                : raw

            return Number.isFinite(y)
              ? {
                  dx: dotCross({
                    d,
                    i,
                    bandwidth,
                    slot,
                    gapPx,
                    seriesCount: series.length,
                    stacked,
                    square: squares?.get(d.series),
                  }),
                  y,
                }
              : undefined
          }
        }

        return undefined
      },
    }
  })
}

/** `bandOf` for the latest plot width only: a focus move reads it for every dot, the width changes on resize. */
export function memoBand(
  categories: ReadonlyArray<string>,
  barGap: number,
  barWidth?: number,
): (innerWidth: number) => ReturnType<typeof bandOf> {
  let width = Number.NaN
  let band: ReturnType<typeof bandOf> | null = null

  return (innerWidth) => {
    if (band === null || width !== innerWidth) {
      width = innerWidth
      band = bandOf(categories, barGap, innerWidth, barWidth)
    }

    return band
  }
}
