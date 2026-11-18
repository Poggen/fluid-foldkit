import { DateTime } from 'effect'

interface HeatmapLinearScale {
  (value: number): number
  readonly domain: () => [number, number]
  readonly range: () => [number, number]
  readonly invert: (pixel: number) => number
}

interface HeatmapTimeScale {
  (value: Date | number): number
  readonly domain: () => [Date, Date]
  readonly range: () => [number, number]
  readonly invert: (pixel: number) => Date
}

const linearScale: (
  domain: readonly [number, number],
  range: readonly [number, number],
) => HeatmapLinearScale = (domain: readonly [number, number], range: readonly [number, number]) => {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0
  const map: (value: number) => number = (value: number) =>
    span === 0 ? r0 : r0 + ((value - d0) / span) * (r1 - r0)

  const invert: (pixel: number) => number = (pixel: number) =>
    r1 === r0 ? d0 : d0 + ((pixel - r0) / (r1 - r0)) * span

  return Object.assign(map, {
    domain: () => [d0, d1] satisfies [number, number],
    invert,
    range: () => [r0, r1] satisfies [number, number],
  })
}

const timeScale: (
  domain: readonly [Date, Date],
  range: readonly [number, number],
) => HeatmapTimeScale = (domain: readonly [Date, Date], range: readonly [number, number]) => {
  const linear = linearScale([domain[0].getTime(), domain[1].getTime()], range)
  const map: (value: Date | number) => number = (value: Date | number) => linear(Number(value))

  return Object.assign(map, {
    domain: () => [domain[0], domain[1]] satisfies [Date, Date],
    invert: (pixel: number) =>
      DateTime.toDateUtc(DateTime.makeUnsafe(linear.invert(pixel))) satisfies Date,
    range: linear.range,
  })
}

export { linearScale, timeScale }

export type { HeatmapLinearScale, HeatmapTimeScale }
