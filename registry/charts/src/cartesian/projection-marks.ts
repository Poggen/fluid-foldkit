import { constVoid } from 'effect/Function'
import { lineY, dot } from '@tanstack/charts'
import type { ChartGradient } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { d3Curve } from '@tanstack/charts/d3/shape'
import { curveLinear } from 'd3-shape'
import type { CurveFactory } from 'd3-shape'
import { axisId, toDate } from './series'
import { yScaleForAxis } from './build-state'
import type { SeriesMark } from './build-state'
import type { CartesianLayer } from './layers'
import type {
  ProjectionLineProps,
  ProjectionPoint,
  LineSeriesTerminalMarkerProps,
} from './overlay-options'

const curveProjectionBezier: CurveFactory = (context) => {
  let first = true
  let previousX = 0
  let previousY = 0

  return {
    areaStart: constVoid,
    areaEnd: constVoid,
    lineStart() {
      first = true
    },
    lineEnd: constVoid,
    point(x: number, y: number) {
      if (first) {
        context.moveTo(x, y)
      } else {
        const dx = (x - previousX) * 0.45

        context.bezierCurveTo(previousX + dx, previousY, x - dx, y, x, y)
      }

      first = false
      previousX = x
      previousY = y
    },
  }
}

function hidesLegacyEndpoint(props: { readonly showEndpoints?: boolean }): boolean {
  return props.showEndpoints === false
}

function visibleTail(
  props: ProjectionLineProps,
  xDomain: readonly [Date, Date],
  innerWidth: number,
): ReadonlyArray<ProjectionPoint> {
  const last = props.data.at(-1)
  const span = xDomain[1].getTime() - xDomain[0].getTime()

  if (last === undefined || innerWidth <= 0 || span <= 0) {
    return props.data
  }

  const radius =
    hidesLegacyEndpoint(props) || props.showEndMarker === false ? 0 : (props.endpointRadius ?? 5)

  const endX = ((last.date.getTime() - xDomain[0].getTime()) / span) * innerWidth

  const visibleEndX = Math.min(
    endX,
    Math.max(0, innerWidth - (radius + (props.strokeWidth ?? 2) / 2 + 1)),
  )

  if (visibleEndX >= endX) {
    return props.data
  }

  return [
    ...props.data.slice(0, -1),
    {
      ...last,
      date: toDate(xDomain[0].getTime() + (visibleEndX / innerWidth) * span),
    },
  ]
}

export function projectionExtents<Row>(children: ReadonlyArray<CartesianLayer<Row>>) {
  const xValues: Array<Date> = []
  const yValues = new Map<string, Array<number>>()

  for (const child of children) {
    if (child.kind !== 'projection') {
      continue
    }

    const axis = axisId(child.props.yAxisId)
    const bucket = yValues.get(axis) ?? []

    for (const point of child.props.data) {
      xValues.push(toDate(point.date))
      bucket.push(point.value)
    }

    yValues.set(axis, bucket)
  }

  return { xValues, yValues }
}

export function mergeProjectionDomains(
  dataDomains: Readonly<Record<string, readonly [number, number]>>,
  values: ReadonlyMap<string, ReadonlyArray<number>>,
) {
  const domains = { ...dataDomains }

  for (const [axis, projected] of values) {
    const [min, max] = domains[axis] ?? [0, 100]
    const nextMin = Math.min(min, ...projected)
    const nextMax = Math.max(max, ...projected)
    const pad = (nextMax - nextMin) * 0.05 || 1

    domains[axis] =
      nextMin >= 0 && min >= 0
        ? [0, nextMax <= 0 ? 100 : nextMax * 1.1]
        : [nextMin - pad, nextMax + pad]
  }

  return domains
}

interface ProjectionContext {
  readonly uid: string
  readonly xDomain: readonly [Date, Date]
  readonly innerWidth: number
  readonly gradients: Array<ChartGradient>
  readonly wrap: <Datum>(mark: SeriesMark<Datum>, prefix: string) => SeriesMark<Datum>
}

export function projectionMarks<Row>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  context: ProjectionContext,
) {
  let index = 0

  return children.flatMap((child) => {
    if (child.kind !== 'projection') {
      return []
    }

    const { props } = child
    const projectionIndex = index

    index += 1
    const stroke = props.stroke ?? 'var(--chart-3)'
    let paint = stroke

    if (props.strokeStyle === 'gradient') {
      const id = `${context.uid}-proj-${projectionIndex}`

      context.gradients.push({
        id,
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 0,
        stops: [
          { offset: 0, color: props.gradientStart ?? stroke },
          { offset: 1, color: props.gradientEnd ?? 'var(--chart-5)' },
        ],
      })
      paint = `url(#${id})`
    }

    const mark = lineY(visibleTail(props, context.xDomain, context.innerWidth), {
      id: `projection:${projectionIndex}`,
      ...yScaleForAxis(props.yAxisId),
      x: (point: ProjectionPoint) => toDate(point.date),
      y: (point: ProjectionPoint) => point.value,
      curve: d3Curve(props.curveKind === 'bezier' ? curveProjectionBezier : curveLinear),
      stroke: paint,
      strokeWidth: props.strokeWidth ?? 2,
      strokeOpacity: props.strokeOpacity ?? 1,
      strokeDasharray: (props.strokeDasharray ?? '6,4').replaceAll(',', ' '),
      lineCap: 'round',
    })

    return [decorative(context.wrap(mark, `p${projectionIndex}`))]
  })
}

function terminalMarker<Row extends Readonly<Record<string, unknown>>>(
  props: LineSeriesTerminalMarkerProps,
  index: number,
  last: Row,
  x: (row: Row) => Date,
) {
  const radius = props.radius ?? 5
  const strokeWidth = props.strokeWidth ?? 1.5

  const xy = {
    ...yScaleForAxis(props.yAxisId),
    x,
    y: (row: Row) => Number(row[props.dataKey]),
  }

  const ring = decorative(
    dot([last], {
      id: `terminal:${index}:ring`,
      ...xy,
      r: radius + (props.ringGap ?? 0) + strokeWidth / 2,
      fill: 'none',
      stroke: props.stroke ?? 'var(--chart-1)',
      strokeWidth,
    }),
  )

  if (props.fill === undefined || props.fill === '' || props.fill === 'transparent') {
    return [ring]
  }

  return [
    ring,
    decorative(
      dot([last], {
        id: `terminal:${index}:core`,
        ...xy,
        r: radius,
        fill: props.fill,
      }),
    ),
  ]
}

export function terminalMarks<Row extends Readonly<Record<string, unknown>>>(
  children: ReadonlyArray<CartesianLayer<Row>>,
  rows: ReadonlyArray<Row>,
  x: (row: Row) => Date,
) {
  const last = rows.at(-1)

  if (last === undefined) {
    return []
  }

  return children
    .filter((child) => child.kind === 'terminalMarker')
    .flatMap(({ props }, index) => terminalMarker(props, index, last, x))
}
