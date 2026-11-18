import { scaleLinear } from 'd3-scale'
import { flow, Option, Schema } from 'effect'
import { axisId, DEFAULT_Y_AXIS_ID } from './series'
import type { ResolvedSeries } from './series'
import type { YAxisConfig } from './axis-options'
import type { Domains } from './state'

/** Source interaction, markers and Y domains use only rows inside the window. */
export const visibleRows: <Row>(
  data: ReadonlyArray<Row>,
  x: (row: Row) => Date,
  domain: readonly [Date, Date] | undefined,
) => ReadonlyArray<Row> = function visibleRows<Row>(
  data: ReadonlyArray<Row>,
  x: (row: Row) => Date,
  domain: readonly [Date, Date] | undefined,
) {
  if (domain === undefined) {
    return data satisfies ReadonlyArray<Row>
  }

  const lo = Math.min(domain[0].getTime(), domain[1].getTime())
  const hi = Math.max(domain[0].getTime(), domain[1].getTime())

  return data.filter(
    (row) => x(row).getTime() >= lo && x(row).getTime() <= hi,
  ) satisfies ReadonlyArray<Row>
}

export const bklitYDomain: (values: ReadonlyArray<number>) => [number, number] =
  function bklitYDomain(values: ReadonlyArray<number>) {
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

export const niced: (domain: readonly [number, number]) => [number, number] = function niced(
  domain: readonly [number, number],
) {
  const nice = scaleLinear().domain(domain).nice().domain()

  return [nice[0] ?? 0, nice[1] ?? 100]
}

/** Explicit scales stay exact through inference, presentation frames and public context. */
export const fixedYDomains: (
  axes: ReadonlyArray<YAxisConfig>,
  primary?: readonly [number, number],
) => Domains = function fixedYDomains(
  axes: ReadonlyArray<YAxisConfig>,
  primary?: readonly [number, number],
) {
  const fixed = new Map<string, readonly [number, number]>()
  const requireBounds = (domain: readonly [number, number]) => {
    if (!Number.isFinite(domain[0]) || !Number.isFinite(domain[1]) || domain[0] >= domain[1]) {
      throw new RangeError('yDomain requires two finite, strictly increasing bounds')
    }
    return domain
  }
  if (primary !== undefined) fixed.set(DEFAULT_Y_AXIS_ID, requireBounds(primary))
  const seen = new Set<string>()
  for (const axis of axes) {
    if (axis.domain !== undefined) requireBounds(axis.domain)
    const id = axisId(axis.yAxisId)
    if (axis.domain === undefined || seen.has(id)) continue
    seen.add(id)
    fixed.set(id, axis.domain)
  }
  return Object.fromEntries(fixed)
}

const finiteNumber = flow(
  Schema.decodeUnknownOption(Schema.Finite),
  Option.getOrElse(() => Number.NaN),
)

export const toNumber = flow(Number, finiteNumber)

/** Missing Area observations break the path; other series retain Source coercion. */
export const seriesValueOf = (kind: ResolvedSeries['kind']) =>
  kind === 'line' ? toNumber : finiteNumber
