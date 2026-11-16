import { DateTime } from 'effect'
import type { SeriesContext } from './series-marks'
import type { ResolvedSeries } from './series'

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const FLAT_LINE_RISE_PX = 0.002

export type Paint<Row> = (part: ReadonlyArray<Row>, id: string) => string

/** The 0/15/85/100% edge fade of a line. bklit pins it to the plot viewport (userSpaceOnUse); native gradients are bbox-relative, so the stops are re-expressed
 * in the x extent of the rows that mark draws (a projection widens the domain; a dashed line is two marks with their own bbox). */
interface FadePaint<Row> {
  readonly paintFor: Paint<Row>
  readonly lineValue: (d: Row) => number
}

export function fadePaint<Row extends Readonly<Record<string, unknown>>>(
  ctx: SeriesContext<Row>,
  s: ResolvedSeries,
  fade: true | 'left' | 'right',
  yValue: (d: Row) => number,
): FadePaint<Row> {
  const { input, rows } = ctx

  const [d0, d1] = ctx.fadeDomain ?? [
    DateTime.toDateUtc(DateTime.makeUnsafe(0)),
    DateTime.toDateUtc(DateTime.makeUnsafe(1)),
  ]

  let vLo = Number.POSITIVE_INFINITY
  let vHi = Number.NEGATIVE_INFINITY
  let lastRow: Row | undefined

  for (const row of rows) {
    const v = ctx.valueOf(row, s)

    if (Number.isFinite(v)) {
      vLo = Math.min(vLo, v)
      vHi = Math.max(vHi, v)
      lastRow = row
    }
  }

  let lineValue = yValue

  // A flat line has a zero-height bounding box, which an objectBoundingBox gradient cannot paint (bklit's userSpaceOnUse
  // fade draws it): give it a sub-pixel rise, as the sankey flat flows do.
  if (vLo === vHi && lastRow !== undefined) {
    const [yLo, yHi] = ctx.yDomains.get(s.yAxisId) ?? [0, 100]
    const rise = ((yHi - yLo) * FLAT_LINE_RISE_PX) / Math.max(1, input.plotHeight ?? 200)
    lineValue = (d: Row): number => yValue(d) + (d === lastRow ? rise : 0)
  }

  const spanD = d1.getTime() - d0.getTime()

  const view: Array<{
    p: number
    o: number
  }> = [
    { p: 0, o: fade === 'right' ? 1 : 0 },
    { p: 0.15, o: 1 },
    { p: 0.85, o: 1 },
    { p: 1, o: fade === 'left' ? 1 : 0 },
  ]

  const opacityAt = (p: number): number => {
    for (let i = 1; i < view.length; i += 1) {
      const a = view[i - 1]
      const b = view[i]

      if (a !== undefined && b !== undefined && p <= b.p) {
        return a.o + ((b.o - a.o) * (p - a.p)) / (b.p - a.p)
      }
    }

    return fade === 'left' ? 1 : 0
  }

  const paintFor: Paint<Row> = (part, id) => {
    let tLo = Number.POSITIVE_INFINITY
    let tHi = Number.NEGATIVE_INFINITY

    for (const row of part) {
      if (Number.isFinite(ctx.valueOf(row, s))) {
        const t = ctx.keyOf(row)
        tLo = Math.min(tLo, t)
        tHi = Math.max(tHi, t)
      }
    }

    const spanL = tHi - tLo

    const stops: Array<{
      offset: number
      color: string
      opacity: number
    }> = []

    if (spanD > 0 && spanL > 0 && Number.isFinite(spanL)) {
      const pAt = (o: number): number => (tLo + o * spanL - d0.getTime()) / spanD
      const oAt = (p: number): number => (d0.getTime() + p * spanD - tLo) / spanL
      const startOpacity = opacityAt(clamp01(pAt(0)))
      const endOpacity = opacityAt(clamp01(pAt(1)))
      stops.push({ offset: 0, color: s.stroke, opacity: startOpacity })

      for (const v of view) {
        const o = oAt(v.p)

        if (o > 1e-6 && o < 1 - 1e-6) {
          stops.push({ offset: o, color: s.stroke, opacity: v.o })
        }
      }

      stops.push({ offset: 1, color: s.stroke, opacity: endOpacity })
    } else {
      for (const v of view) {
        stops.push({ offset: v.p, color: s.stroke, opacity: v.o })
      }
    }

    ctx.state.gradients.push({ id, x1: 0, y1: 0, x2: 1, y2: 0, stops })

    return `url(#${id})`
  }

  return { paintFor, lineValue }
}
