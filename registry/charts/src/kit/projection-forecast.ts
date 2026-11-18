import { DateTime, Option } from 'effect'
import type { ProjectionAutoMethod, ProjectionPathDensity } from './projection-utils'
import type { ProjectionPoint } from '../cartesian/overlay-options'

/** DateTime owns valid instants; the public Source API also returns invalid Date sentinels. */
export const projectionDate: (time: number) => Date = function projectionDate(time: number) {
  return Option.match(DateTime.make(time), {
    onSome: DateTime.toDateUtc,
    onNone: () => {
      const invalid = DateTime.toDateUtc(DateTime.makeUnsafe(0))

      invalid.setTime(Number.NaN)

      return invalid
    },
  })
}

interface HistoryPoint {
  readonly timeMs: number
  readonly value: number
}

const PENULTIMATE_OFFSET = -2

const linearRegressionSlope: (points: ReadonlyArray<HistoryPoint>) => number = (
  points: ReadonlyArray<HistoryPoint>,
) => {
  const n = points.length

  if (n < 2) {
    return 0
  }

  let sumT = 0
  let sumV = 0

  for (const { timeMs, value } of points) {
    sumT += timeMs
    sumV += value
  }

  const meanT = sumT / n
  const meanV = sumV / n
  let cov = 0
  let variance = 0

  for (const { timeMs, value } of points) {
    cov += (timeMs - meanT) * (value - meanV)
    variance += (timeMs - meanT) ** 2
  }

  return variance === 0 ? 0 : cov / variance
}

const slopeFromLastSegment: (historyPoints: ReadonlyArray<HistoryPoint>) => number = (
  historyPoints: ReadonlyArray<HistoryPoint>,
) => {
  if (historyPoints.length < 2) {
    return 0
  }

  const prev = historyPoints.at(PENULTIMATE_OFFSET)
  const last = historyPoints.at(-1)

  if (!(prev && last)) {
    return 0
  }

  const deltaMs = last.timeMs - prev.timeMs

  return deltaMs === 0 ? 0 : (last.value - prev.value) / deltaMs
}

const resolveAutoSlope: (
  autoMethod: ProjectionAutoMethod,
  historyPoints: ReadonlyArray<HistoryPoint>,
) => number = (autoMethod: ProjectionAutoMethod, historyPoints: ReadonlyArray<HistoryPoint>) => {
  if (autoMethod === 'lastSegment' && historyPoints.length >= 2) {
    return slopeFromLastSegment(historyPoints)
  }

  return linearRegressionSlope(historyPoints)
}

interface SteppedProjectionOptions {
  readonly anchorTime: number
  readonly anchorValue: number
  readonly slope: number
  readonly horizonPoints: number
  readonly intervalMs: number
}

const buildEndpointProjectionValues: (
  options: Readonly<SteppedProjectionOptions>,
) => Array<ProjectionPoint> = (options: Readonly<SteppedProjectionOptions>) => {
  const { anchorTime, anchorValue, slope, horizonPoints, intervalMs } = options
  const endTime = anchorTime + intervalMs * horizonPoints
  const endValue = anchorValue + slope * intervalMs * horizonPoints

  return [
    { date: projectionDate(anchorTime), value: anchorValue },
    { date: projectionDate(endTime), value: endValue },
  ]
}

const buildSteppedProjectionValues: (
  options: Readonly<SteppedProjectionOptions>,
) => Array<ProjectionPoint> = (options: Readonly<SteppedProjectionOptions>) => {
  const { anchorTime, anchorValue, slope, horizonPoints, intervalMs } = options
  const result: Array<ProjectionPoint> = [{ date: projectionDate(anchorTime), value: anchorValue }]

  for (let horizonStep = 1; horizonStep <= horizonPoints; horizonStep += 1) {
    result.push({
      date: projectionDate(anchorTime + intervalMs * horizonStep),
      value: anchorValue + slope * intervalMs * horizonStep,
    })
  }

  return result
}

interface BuildAutoFutureValuesOptions {
  readonly anchorTime: number
  readonly anchorValue: number
  readonly autoMethod: ProjectionAutoMethod
  readonly historyPoints: ReadonlyArray<HistoryPoint>
  readonly horizonPoints: number
  readonly intervalMs: number
  readonly pathDensity?: ProjectionPathDensity
}

const buildAutoFutureValues: (
  options: Readonly<BuildAutoFutureValuesOptions>,
) => Array<ProjectionPoint> = (options: Readonly<BuildAutoFutureValuesOptions>) => {
  const {
    anchorTime,
    anchorValue,
    autoMethod,
    historyPoints,
    horizonPoints,
    intervalMs,
    pathDensity = 'endpoints',
  } = options

  const slope = resolveAutoSlope(autoMethod, historyPoints)

  if (pathDensity === 'endpoints') {
    return buildEndpointProjectionValues({
      anchorTime,
      anchorValue,
      horizonPoints,
      intervalMs,
      slope,
    })
  }

  return buildSteppedProjectionValues({ anchorTime, anchorValue, horizonPoints, intervalMs, slope })
}

export type { HistoryPoint }

export { buildAutoFutureValues, slopeFromLastSegment }
