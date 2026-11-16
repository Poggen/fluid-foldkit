import { DateTime } from 'effect'
import { niced } from '../cartesian/domains'
import { toDate } from '../cartesian/series'
import type { OHLCValues } from './marks'

const num = (v: unknown): number => (v === null || v === undefined ? Number.NaN : Number(v))

const date = (value: number) => DateTime.toDateUtc(DateTime.makeUnsafe(value))

/** y domain: low/high padded 5%, niced (bklit). */
export function yExtent<Row extends OHLCValues>(rows: ReadonlyArray<Row>): [number, number] {
  let lo = Number.POSITIVE_INFINITY
  let hi = Number.NEGATIVE_INFINITY

  for (const r of rows) {
    const low = num(r.low)
    const high = num(r.high)

    if (Number.isFinite(low)) {
      lo = Math.min(lo, low)
    }

    if (Number.isFinite(high)) {
      hi = Math.max(hi, high)
    }
  }

  if (lo === Number.POSITIVE_INFINITY) {
    lo = 0
  }

  if (hi === Number.NEGATIVE_INFINITY) {
    hi = 100
  }

  const pad = (hi - lo) * 0.05 || 1

  return [lo - pad, hi + pad]
}

/** x domain padded by half a slot each side, so edge candles sit inside the plot like bklit's range inset. */
export function xExtent<Row extends OHLCValues>(
  rows: ReadonlyArray<Row>,
  xKey: string,
  xDomain?: readonly [Date, Date],
  slots?: number,
): [Date, Date] {
  let lo = Number.POSITIVE_INFINITY
  let hi = Number.NEGATIVE_INFINITY

  if (xDomain) {
    lo = xDomain[0].getTime()
    hi = xDomain[1].getTime()
  } else {
    for (const r of rows) {
      const t = toDate(r[xKey]).getTime()
      lo = Math.min(lo, t)
      hi = Math.max(hi, t)
    }
  }

  if (!Number.isFinite(lo)) {
    return [date(0), date(1)]
  }

  const count = slots ?? rows.length
  const pad = count > 1 && hi > lo ? (hi - lo) / (count - 1) / 2 : 43_200_000

  return [date(lo - pad), date(hi + pad)]
}

export interface CandlestickDomains {
  x: [Date, Date]
  y: [number, number]
}

/** Resolved plot domains (x padded by half a slot, y padded and niced), for the public chart context. */
export function candlestickDomains<Row extends OHLCValues>(
  rows: ReadonlyArray<Row>,
  xKey: string,
  xDomain?: readonly [Date, Date],
  slots?: number,
): CandlestickDomains {
  return { x: xExtent(rows, xKey, xDomain, slots), y: niced(yExtent(rows)) }
}
