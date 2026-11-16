import type { LiveRow } from './definition'

const rowAt = <T>(list: ReadonlyArray<T>, i: number): T | undefined => list[i]

export const SMOOTH_STEPS = 4

const sign = (n: number): number => (n < 0 ? -1 : 1)

/** d3's curveMonotoneX slope3 tangent at an interior row i, in value per ms (0 at the ends, which are never read). */
export function monotoneTangent(rows: ReadonlyArray<LiveRow>, i: number): number {
  const at = rowAt(rows, i)
  const prev = rowAt(rows, i - 1)
  const next = rowAt(rows, i + 1)

  if (at === undefined) {
    return 0
  }

  const slope = (a: LiveRow, b: LiveRow): number => (b.v - a.v) / (b.t - a.t || 1)

  if (prev !== undefined && next !== undefined) {
    const h0 = at.t - prev.t
    const h1 = next.t - at.t
    const s0 = slope(prev, at)
    const s1 = slope(at, next)
    const p = (s0 * h1 + s1 * h0) / (h0 + h1)

    return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0
  }

  // The end rows only seed their neighbour (see smoothRows), so their own tangent is never read.
  return 0
}

/** The curve as plain rows: native rolling refuses a custom curve path (`custom-path`), so bklit's curveMonotoneX is sampled into SMOOTH_STEPS - 1 interior rows per interval on the exact cubic.
 * The end rows only supply tangents, so every emitted value is final the tick it appears (the rolling contract compares retained rows by value); one row interval past the tip is cut anyway. */
export function smoothRows(rows: ReadonlyArray<LiveRow>): ReadonlyArray<LiveRow> {
  if (rows.length < 4) {
    return rows
  }

  const tangents = rows.map((_, i) => monotoneTangent(rows, i))
  const out: Array<LiveRow> = []

  for (let i = 1; i < rows.length - 2; i += 1) {
    const a = rows[i]
    const b = rows[i + 1]

    if (a === undefined || b === undefined) continue
    const h = b.t - a.t
    out.push(a)

    for (let j = 1; j < SMOOTH_STEPS; j += 1) {
      const u = j / SMOOTH_STEPS
      const u2 = u * u
      const u3 = u2 * u

      const v =
        (2 * u3 - 3 * u2 + 1) * a.v +
        (u3 - 2 * u2 + u) * h * (tangents[i] ?? 0) +
        (-2 * u3 + 3 * u2) * b.v +
        (u3 - u2) * h * (tangents[i + 1] ?? 0)

      // The interval out of the last pad row is cut with the pads (liveline.css starts the path at the first real sample).
      out.push({ key: `${a.key}~${j}`, t: a.t + h * u, v, pad: a.pad })
    }
  }

  const penultimate = rows.at(-2)

  if (penultimate) {
    out.push(penultimate)
  }

  return out
}

/** The drawn line's value at plot-clock time `t`: the same smoothed rows the rolling path is drawn through (smoothRows), so a point placed with it sits on the stroke
 * (the keyboard guide at the plot's left edge on a jump tick, live-line-chart.tsx). Before the first emitted row it holds that row's value. */
export function drawnValueAt(rows: ReadonlyArray<LiveRow>, t: number): number {
  const pts = smoothRows(rows)
  const first = pts.at(0)

  if (first === undefined) {
    return 0
  }

  if (t <= first.t) {
    return first.v
  }

  let lo = 0
  let hi = pts.length - 1

  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)

    if ((pts[mid] ?? first).t <= t) {
      lo = mid
    } else {
      hi = mid
    }
  }

  const a = pts[lo] ?? first
  const b = pts[hi] ?? first

  return t >= b.t ? b.v : a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t || 1)
}
