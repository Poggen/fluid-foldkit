import { DateTime, Option, Schema } from 'effect'
import { isFiniteNumber, isString } from './guards'
import { buildAutoFutureValues, slopeFromLastSegment, projectionDate } from './projection-forecast'
import type { HistoryPoint } from './projection-forecast'
import type { ProjectionPoint } from '../cartesian/overlay-options'

type ChartDatum = object

const ProjectionDateCell = Schema.Union([Schema.Date, Schema.String, Schema.Finite])

const ProjectionValueCell = Schema.Finite

const FALLBACK_INTERVAL_MS_PER_DAY = 86_400_000

const DEGENERATE_DX_THRESHOLD = 1e-6

const MAX_BEZIER_TENSION = 0.5

const MIN_BEZIER_TENSION = 0.05

type ProjectionMode = 'auto' | 'target' | 'manual'

type ProjectionAutoMethod = 'linearRegression' | 'lastSegment'

type ProjectionCurveKind = 'linear' | 'bezier'

type ProjectionPathDensity = 'stepped' | 'endpoints'

interface BuildProjectionPathOptions {
  readonly sourceData: Array<ChartDatum>
  readonly seriesKey: string
  readonly xDataKey?: string
  readonly mode: ProjectionMode
  readonly autoMethod?: ProjectionAutoMethod
  readonly pathDensity?: ProjectionPathDensity
  readonly startIndex?: number
  readonly horizonPoints?: number
  readonly endValue?: number
  readonly points?: Array<ProjectionPoint>
}

const readDate: (row: Readonly<ChartDatum>, xDataKey: string) => Date | undefined = (
  row: Readonly<ChartDatum>,
  xDataKey: string,
) => {
  const raw = Option.getOrUndefined(
    Schema.decodeUnknownOption(ProjectionDateCell)(Reflect.get(row, xDataKey)),
  )

  if (raw instanceof Date) {
    return raw
  }

  if (isFiniteNumber(raw) || isString(raw)) {
    const epoch = isString(raw) ? Date.parse(raw) : raw

    return Option.getOrUndefined(Option.map(DateTime.make(epoch), DateTime.toDateUtc))
  }

  return undefined
}

const readValue: (row: Readonly<ChartDatum>, seriesKey: string) => number | undefined = (
  row: Readonly<ChartDatum>,
  seriesKey: string,
) => {
  const raw = Option.getOrUndefined(
    Schema.decodeUnknownOption(ProjectionValueCell)(Reflect.get(row, seriesKey)),
  )

  return isFiniteNumber(raw) ? raw : undefined
}

const resolveStartIndex: (
  sourceData: ReadonlyArray<Readonly<ChartDatum>>,
  startIndex: number | undefined,
) => number = (sourceData: ReadonlyArray<Readonly<ChartDatum>>, startIndex: number | undefined) => {
  if (!isFiniteNumber(startIndex)) {
    return Math.max(0, sourceData.length - 1)
  }

  return Math.min(Math.max(0, Math.floor(startIndex)), sourceData.length - 1)
}

const intervalFromAdjacentRows: (
  sourceData: ReadonlyArray<Readonly<ChartDatum>>,
  xDataKey: string,
  startIndex: number,
) => number | undefined = (
  sourceData: ReadonlyArray<Readonly<ChartDatum>>,
  xDataKey: string,
  startIndex: number,
) => {
  if (startIndex < 1) {
    return undefined
  }

  const prevRow = sourceData.at(startIndex - 1)
  const currentRow = sourceData.at(startIndex)
  const prev = prevRow === undefined ? undefined : readDate(prevRow, xDataKey)
  const current = currentRow === undefined ? undefined : readDate(currentRow, xDataKey)

  if (!(prev && current)) {
    return undefined
  }

  const delta = current.getTime() - prev.getTime()

  return delta > 0 ? delta : undefined
}

const intervalFromSeriesSpan: (
  sourceData: ReadonlyArray<Readonly<ChartDatum>>,
  xDataKey: string,
) => number | undefined = (sourceData: ReadonlyArray<Readonly<ChartDatum>>, xDataKey: string) => {
  if (sourceData.length < 2) {
    return undefined
  }

  const firstRow = sourceData.at(0)
  const lastRow = sourceData.at(-1)
  const first = firstRow === undefined ? undefined : readDate(firstRow, xDataKey)
  const last = lastRow === undefined ? undefined : readDate(lastRow, xDataKey)

  if (!(first && last)) {
    return undefined
  }

  const span = last.getTime() - first.getTime()

  return span > 0 ? span / (sourceData.length - 1) : undefined
}

const resolveIntervalMs: (
  sourceData: ReadonlyArray<Readonly<ChartDatum>>,
  xDataKey: string,
  startIndex: number,
) => number = (
  sourceData: ReadonlyArray<Readonly<ChartDatum>>,
  xDataKey: string,
  startIndex: number,
) =>
  intervalFromAdjacentRows(sourceData, xDataKey, startIndex) ??
  intervalFromSeriesSpan(sourceData, xDataKey) ??
  FALLBACK_INTERVAL_MS_PER_DAY

const readHistoryPoint: (
  row: Readonly<ChartDatum> | undefined,
  seriesKey: string,
  xDataKey: string,
) => HistoryPoint | undefined = (
  row: Readonly<ChartDatum> | undefined,
  seriesKey: string,
  xDataKey: string,
) => {
  if (row === undefined) {
    return undefined
  }

  const date = readDate(row, xDataKey)
  const value = readValue(row, seriesKey)

  if (date === undefined || value === undefined) {
    return undefined
  }

  return { timeMs: date.getTime(), value }
}

interface CollectHistoryPointsOptions {
  readonly sourceData: ReadonlyArray<Readonly<ChartDatum>>
  readonly seriesKey: string
  readonly xDataKey: string
  readonly startIndex: number
}

const collectHistoryPoints: (
  options: Readonly<CollectHistoryPointsOptions>,
) => Array<HistoryPoint> = (options: Readonly<CollectHistoryPointsOptions>) => {
  const { sourceData, seriesKey, xDataKey, startIndex } = options
  const historyPoints: Array<HistoryPoint> = []

  for (let rowIndex = 0; rowIndex <= startIndex; rowIndex += 1) {
    const point = readHistoryPoint(sourceData.at(rowIndex), seriesKey, xDataKey)

    if (point !== undefined) {
      historyPoints.push(point)
    }
  }

  return historyPoints
}

const computeProjectionAnchorTangentSlope: (
  sourceData: Array<ChartDatum>,
  seriesKey: string,
  xDataKey?: string,
  startIndexProp?: number,
) => number = (
  sourceData: Array<ChartDatum>,
  seriesKey: string,
  xDataKey = 'date',
  startIndexProp?: number,
) => {
  if (sourceData.length < 2) {
    return 0 satisfies number
  }

  const startIndex = resolveStartIndex(sourceData, startIndexProp)

  return slopeFromLastSegment(
    collectHistoryPoints({ seriesKey, sourceData, startIndex, xDataKey }),
  ) satisfies number
}

const buildHorizontalTangentBezierPath: (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tension?: number,
) => string = (x0: number, y0: number, x1: number, y1: number, tension = 0.45) => {
  const dx = x1 - x0

  if (Math.abs(dx) < DEGENERATE_DX_THRESHOLD) {
    return `M ${x0},${y0} L ${x1},${y1}` satisfies string
  }

  const clampedTension = Math.min(MAX_BEZIER_TENSION, Math.max(MIN_BEZIER_TENSION, tension))
  const c1x = x0 + dx * clampedTension
  const c2x = x1 - dx * clampedTension

  return `M ${x0},${y0} C ${c1x},${y0} ${c2x},${y1} ${x1},${y1}` satisfies string
}

const buildTargetPath: (options: {
  readonly anchorTime: number
  readonly anchorValue: number
  readonly endValue: number
  readonly horizonPoints: number
  readonly intervalMs: number
}) => Array<ProjectionPoint> = (options: {
  readonly anchorTime: number
  readonly anchorValue: number
  readonly endValue: number
  readonly horizonPoints: number
  readonly intervalMs: number
}) => {
  const { anchorTime, anchorValue, endValue, horizonPoints, intervalMs } = options
  const endTime = anchorTime + intervalMs * horizonPoints

  return [
    { date: projectionDate(anchorTime), value: anchorValue },
    { date: projectionDate(endTime), value: endValue },
  ]
}

interface ProjectionAnchor {
  readonly anchorTime: number
  readonly anchorValue: number
  readonly intervalMs: number
  readonly startIndex: number
}

interface ResolveProjectionAnchorOptions {
  readonly sourceData: ReadonlyArray<Readonly<ChartDatum>>
  readonly seriesKey: string
  readonly xDataKey: string
  readonly startIndexProp: number | undefined
}

const readAnchorPoint: (
  anchorRow: Readonly<ChartDatum>,
  seriesKey: string,
  xDataKey: string,
) => { readonly anchorTime: number; readonly anchorValue: number } | undefined = (
  anchorRow: Readonly<ChartDatum>,
  seriesKey: string,
  xDataKey: string,
) => {
  const anchorDate = readDate(anchorRow, xDataKey)
  const anchorValue = readValue(anchorRow, seriesKey)

  if (anchorDate === undefined || anchorValue === undefined) {
    return undefined
  }

  return { anchorTime: anchorDate.getTime(), anchorValue }
}

const resolveProjectionAnchor: (
  options: Readonly<ResolveProjectionAnchorOptions>,
) => ProjectionAnchor | undefined = (options: Readonly<ResolveProjectionAnchorOptions>) => {
  const { sourceData, seriesKey, xDataKey, startIndexProp } = options
  const startIndex = resolveStartIndex(sourceData, startIndexProp)
  const anchorRow = sourceData.at(startIndex)

  const anchor =
    anchorRow === undefined ? undefined : readAnchorPoint(anchorRow, seriesKey, xDataKey)

  if (sourceData.length === 0 || anchor === undefined) {
    return undefined
  }

  const intervalMs = resolveIntervalMs(sourceData, xDataKey, startIndex)

  return { anchorTime: anchor.anchorTime, anchorValue: anchor.anchorValue, intervalMs, startIndex }
}

const buildProjectionPath: (
  options: Readonly<BuildProjectionPathOptions>,
) => Array<ProjectionPoint> = (options: Readonly<BuildProjectionPathOptions>) => {
  const {
    sourceData,
    seriesKey,
    xDataKey = 'date',
    mode,
    autoMethod = 'linearRegression',
    pathDensity = 'endpoints',
    startIndex: startIndexProp,
    horizonPoints = 6,
    endValue,
    points,
  } = options

  if (mode === 'manual' && points && points.length >= 2) {
    return points.map((point) => ({
      date: projectionDate(point.date.getTime()),
      value: point.value,
    }))
  }

  const anchor = resolveProjectionAnchor({ seriesKey, sourceData, startIndexProp, xDataKey })

  if (anchor === undefined) {
    return []
  }

  if (mode === 'target' && isFiniteNumber(endValue)) {
    return buildTargetPath({
      anchorTime: anchor.anchorTime,
      anchorValue: anchor.anchorValue,
      endValue,
      horizonPoints,
      intervalMs: anchor.intervalMs,
    })
  }

  return buildAutoFutureValues({
    anchorTime: anchor.anchorTime,
    anchorValue: anchor.anchorValue,
    autoMethod,
    historyPoints: collectHistoryPoints({
      seriesKey,
      sourceData,
      startIndex: anchor.startIndex,
      xDataKey,
    }),
    horizonPoints,
    intervalMs: anchor.intervalMs,
    pathDensity,
  })
}

export { projectionDateExtents, projectionValueExtents } from './projection-extents'

export {
  buildHorizontalTangentBezierPath,
  buildProjectionPath,
  computeProjectionAnchorTangentSlope,
}

export type {
  BuildProjectionPathOptions,
  ProjectionAutoMethod,
  ProjectionCurveKind,
  ProjectionMode,
  ProjectionPathDensity,
}
