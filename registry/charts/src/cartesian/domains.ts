import { scaleLinear } from 'd3-scale'
import { flow, Option, Schema } from 'effect'
import type { ResolvedSeries } from './series'

const finiteNumber = flow(
  Schema.decodeUnknownOption(Schema.Finite),
  Option.getOrElse(() => Number.NaN),
)

export const toNumber = flow(Number, finiteNumber)

/** Missing Area observations break the path; other series retain Source coercion. */
export const seriesValueOf = (kind: ResolvedSeries['kind']) =>
  kind === 'line' ? toNumber : finiteNumber

export function bklitYDomain(values: ReadonlyArray<number>): [number, number] {
  let low = Infinity
  let high = -Infinity

  for (const value of values) {
    if (Number.isFinite(value)) {
      low = Math.min(low, value)
      high = Math.max(high, value)
    }
  }

  if (!Number.isFinite(low)) {
    return [0, 100]
  }

  const padding = (high - low) * 0.05 || 1
  const domain = low >= 0 ? [0, high <= 0 ? 100 : high * 1.1] : [low - padding, high + padding]
  const bounds = scaleLinear().domain(domain).nice().domain()

  return [bounds[0] ?? 0, bounds[1] ?? 100]
}

/** Source interaction, markers and Y domains use only rows inside the window. */
export function visibleRows<Row>(
  data: ReadonlyArray<Row>,
  x: (row: Row) => Date,
  domain: readonly [Date, Date] | undefined,
): ReadonlyArray<Row> {
  if (domain === undefined) {
    return data
  }

  const lo = Math.min(domain[0].getTime(), domain[1].getTime())
  const hi = Math.max(domain[0].getTime(), domain[1].getTime())

  return data.filter((row) => x(row).getTime() >= lo && x(row).getTime() <= hi)
}

export function niced(domain: readonly [number, number]): [number, number] {
  const nice = scaleLinear().domain(domain).nice().domain()

  return [nice[0] ?? 0, nice[1] ?? 100]
}
