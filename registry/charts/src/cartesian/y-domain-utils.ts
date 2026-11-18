import type { ScaleLinear } from 'd3-scale'
import type { ChartPhase } from '../kit/motion/phase'
import type { RegisteredLineConfig } from './context-types'
import { niced } from './domains'
import { axisId } from './series'

export const getPrimaryYScale: <Scale extends ScaleLinear<number, number>>(
  yScales: Readonly<Record<string, Scale>>,
  fallback: Scale,
) => Scale = function getPrimaryYScale<Scale extends ScaleLinear<number, number>>(
  yScales: Readonly<Record<string, Scale>>,
  fallback: Scale,
) {
  return (yScales.left ?? Object.values(yScales)[0] ?? fallback) satisfies Scale
}

export const shouldTweenYDomain: (
  from: readonly [number, number],
  to: readonly [number, number],
) => boolean = function shouldTweenYDomain(
  from: readonly [number, number],
  to: readonly [number, number],
) {
  const span = Math.max(Math.abs(to[1] - to[0]), Math.abs(from[1] - from[0]), 1)

  return Math.abs(to[0] - from[0]) / span >= 0.02 || Math.abs(to[1] - from[1]) / span >= 0.02
}

export const mergeYDomainRecords: (
  ...records: ReadonlyArray<Readonly<Record<string, YDomain>>>
) => Record<string, YDomain> = function mergeYDomainRecords(
  ...records: ReadonlyArray<Readonly<Record<string, YDomain>>>
) {
  const merged: Record<string, YDomain> = {}

  for (const record of records)
    for (const [id, domain] of Object.entries(record)) merged[axisId(id)] = domain

  return merged
}

export const computeYDomainsByAxis: (options: {
  readonly lines: ReadonlyArray<RegisteredLineConfig>
  readonly resolveDomain: (dataKeys: Array<string>) => YDomain
}) => Record<string, YDomain> = function computeYDomainsByAxis(options: {
  readonly lines: ReadonlyArray<RegisteredLineConfig>
  readonly resolveDomain: (dataKeys: Array<string>) => YDomain
}) {
  const keysByAxis = new Map<string, Array<string>>()

  for (const line of options.lines) {
    const id = axisId(line.yAxisId)
    keysByAxis.set(id, [...(keysByAxis.get(id) ?? []), line.dataKey])
  }

  const domains: Record<string, YDomain> = {}

  for (const [id, keys] of keysByAxis) domains[id] = niceYDomain(options.resolveDomain(keys))
  domains.left ??= niceYDomain([0, 100])

  return domains
}

export type YDomain = [number, number]

export const niceYDomain: (domain: YDomain) => YDomain = (domain: YDomain) => niced(domain)

export const isLoadingChromePhase: (phase: ChartPhase) => boolean = (phase: ChartPhase) =>
  phase === 'loading' || phase === 'revealingLoading'

export const isYDomainTweenPhase: (phase: ChartPhase) => boolean = (phase: ChartPhase) =>
  phase === 'gridTweenLoading' || phase === 'gridTweenReady'
