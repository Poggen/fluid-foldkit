import type { ChartPoint, MarkRenderContext, SceneNode } from '@tanstack/charts'
import { inertHtml as h } from 'foldkit/html'
import { Match, Struct } from 'effect'
import type { SeriesMark } from '../cartesian/build-state'
import type { ScatterSeries } from './series'
import type { Margin } from '../cartesian/context-types'

export const scatterPaintMark: <Row>(
  mark: SeriesMark<Row>,
  series: ScatterSeries,
  id: string,
  index: number,
  role: ScatterMarkRole,
  projected: (projection: ScatterPaintProjection) => void,
  indices: ReadonlyArray<number>,
  margin: Margin,
  revealDuration: number,
  occurrences: WeakMap<ChartPoint, number>,
  project: (context: MarkRenderContext) => void,
) => SeriesMark<Row> = function scatterPaintMark<Row>(
  mark: SeriesMark<Row>,
  series: ScatterSeries,
  id: string,
  index: number,
  role: ScatterMarkRole,
  projected: (projection: ScatterPaintProjection) => void,
  indices: ReadonlyArray<number>,
  margin: Margin,
  revealDuration: number,
  occurrences: WeakMap<ChartPoint, number>,
  project: (context: MarkRenderContext) => void,
) {
  return {
    ...mark,
    initialize: (context) => {
      const initialized = mark.initialize(context)

      return {
        ...initialized,
        render: (renderContext) => {
          project(renderContext)
          const scene = initialized.render(renderContext)
          const rowIndices = new Set<number>()
          const css: Array<string> = []
          const entrance: Array<ScatterPointEntrance> = []
          const seriesClass = scatterSeriesClass(id, index)
          css.push(
            `.${seriesClass}{--bkm-scatter-inactive:${series.inactiveOpacity};--bkm-scatter-blur:${series.inactiveBlur}px}`,
          )

          const visit: (node: SceneNode) => SceneNode = (node: SceneNode) => {
            if (node.kind === 'group') {
              return { ...node, children: node.children.map(visit) }
            }

            if (node.kind !== 'dot') {
              return node
            }

            const pointIndex = node.interaction?.point?.datumIndex

            if (role === 'paired' && pointIndex === undefined) {
              throw new TypeError('A paired scatter dot requires its public point slot')
            }

            let shapeRole: ScatterRole

            if (role === 'paired') {
              shapeRole = pointIndex !== undefined && pointIndex % 2 === 0 ? 'disc' : 'ring'
            } else {
              shapeRole = role
            }

            const className = `bkm-scatter-point-${safe(id)}-${index}-${safe(node.key)}`

            const point = node.interaction?.point

            if (point === undefined) {
              throw new Error('Scatter paint requires its actual public point')
            }

            const slot = role === 'paired' ? Math.floor(point.datumIndex / 2) : point.datumIndex
            const occurrence = indices[slot]

            if (occurrence === undefined) {
              throw new Error('Scatter requires its resolved row occurrence')
            }

            occurrences.set(point, occurrence)
            rowIndices.add(occurrence)
            const frame = scatterPointClass(id, index, occurrence)
            const localX = node.x - margin.left
            const localY = node.y - margin.top

            const extent =
              series.radius +
              (series.ringWidth > 0 ? series.ringGap + series.ringWidth : 0) +
              Math.max(0, series.outlineWidth) +
              (series.activeScale > 1 ? series.radius * 0.35 : 0) +
              2

            const delay =
              renderContext.chart.width > 0
                ? ((Math.max(0, localX - extent) / renderContext.chart.width) * revealDuration) /
                  1000
                : 0

            entrance.push({ className: frame, delay, blur: series.enterBlur })
            css.push(
              `.${frame}{--bkm-scatter-transform:translate(${localX}px,${localY}px);--bkm-scatter-enter-blur:${series.enterBlur}px}`,
              `.${className}{--bkm-scatter-radius:${node.radius}px}`,
            )

            const paint = scatterRolePaint(series, id, index, shapeRole)

            return {
              ...node,
              key: JSON.stringify([node.key, point.datumIndex]),
              x: 0,
              y: 0,
              className: `${node.className ?? ''} ${className}`,
              style:
                shapeRole === 'disc'
                  ? { ...Struct.omit(node.style ?? {}, ['stroke', 'strokeWidth']), fill: paint }
                  : { ...node.style, stroke: paint },
            }
          }

          const nodes = scene.nodes.map(visit)
          projected({
            rowIndices: [...rowIndices],
            css: css.join(''),
            entrance,
            gradients: roleGradients(series, id, index, renderContext.chart.height, role),
          })

          return { ...scene, nodes }
        },
      }
    },
  } satisfies SeriesMark<Row>
}

export const scatterRolePaint: (
  series: ScatterSeries,
  id: string,
  index: number,
  role: ScatterRole,
) => string = function scatterRolePaint(
  series: ScatterSeries,
  id: string,
  index: number,
  role: ScatterRole,
) {
  const fallback = Match.value(role).pipe(
    Match.when('disc', () => series.fill),
    Match.when('ring', () => series.stroke),
    Match.when('outline', () => series.outlineColor),
    Match.exhaustive,
  )

  const gradient =
    series.yPaint.kind === 'gradient' &&
    (role === 'disc' || (role === 'ring' ? series.yPaint.stroke : series.yPaint.outline))

  return gradient && roleRadius(series, role) > 0 && Number.isFinite(roleRadius(series, role))
    ? `url(#${gradientId(id, index, role)})`
    : fallback
}

const roleGradients: (
  series: ScatterSeries,
  id: string,
  index: number,
  height: number,
  role: ScatterMarkRole,
) => ReadonlyArray<ScatterGradient> = function roleGradients(
  series: ScatterSeries,
  id: string,
  index: number,
  height: number,
  role: ScatterMarkRole,
) {
  const paint = series.yPaint

  if (paint.kind === 'solid') {
    return []
  }

  const roles: ReadonlyArray<ScatterRole> = role === 'paired' ? ['disc', 'ring'] : [role]

  return roles.flatMap((value) => {
    const radius = roleRadius(series, value)

    if (
      !(radius > 0) ||
      !Number.isFinite(radius) ||
      (value === 'ring' && !paint.stroke) ||
      (value === 'outline' && !paint.outline)
    ) {
      return []
    }

    return [
      {
        id: gradientId(id, index, value),
        from: paint.from,
        to: paint.to,
        y1: 0.5 + height / (2 * radius),
      },
    ]
  })
}

export type ScatterRole = 'disc' | 'ring' | 'outline'

export type ScatterMarkRole = ScatterRole | 'paired'

export interface ScatterGradient {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly y1: number
}

export interface ScatterPaintProjection {
  readonly rowIndices: ReadonlyArray<number>
  readonly css: string
  readonly entrance: ReadonlyArray<ScatterPointEntrance>
  readonly gradients: ReadonlyArray<ScatterGradient>
}

const safe: (value: string) => string = (value: string) =>
  Array.from(value, (unit) => unit.codePointAt(0)?.toString(16)).join('-')

export interface ScatterPointEntrance {
  readonly className: string
  readonly delay: number
  readonly blur: number
}

export const scatterSeriesClass: (scope: string, index: number) => string = (
  scope: string,
  index: number,
) => `bkm-scatter-series-${safe(scope)}-${index}`

export const scatterPointClass: (scope: string, series: number, row: number) => string = (
  scope: string,
  series: number,
  row: number,
) => `bkm-scatter-frame-${safe(scope)}-${series}-${row}`

const gradientId: (id: string, series: number, role: ScatterRole) => string = (
  id: string,
  series: number,
  role: ScatterRole,
) => `bkm-scatter-${safe(id)}-${series}-${role}-gradient`

const roleRadius: (series: ScatterSeries, role: ScatterRole) => number = (
  series: ScatterSeries,
  role: ScatterRole,
) =>
  Match.value(role).pipe(
    Match.when('disc', () => series.radius),
    Match.when('ring', () => series.radius + series.ringGap + series.ringWidth / 2),
    Match.when(
      'outline',
      () =>
        (series.ringWidth > 0 ? series.radius + series.ringGap + series.ringWidth : series.radius) +
        series.outlineWidth / 2,
    ),
    Match.exhaustive,
  )

const attributes = (gradient: ScatterGradient) => ({
  id: gradient.id,
  gradientUnits: 'objectBoundingBox',
  x1: '0',
  x2: '0',
  y1: String(gradient.y1),
  y2: '0.5',
})

export function scatterPaintView(projection: ScatterPaintProjection | undefined) {
  if (projection === undefined) {
    return h.empty
  }

  return h.div(
    [h.Class('contents')],
    [
      h.style([], [projection.css]),
      h.svg(
        [h.Class('absolute'), h.Width('0'), h.Height('0'), h.AriaHidden(true)],
        [
          h.defs(
            [],
            projection.gradients.map((gradient) =>
              h.linearGradient(
                Object.entries(attributes(gradient)).map(([name, value]) =>
                  h.Attribute(name, value),
                ),
                [
                  h.stop([h.Offset('0%'), h.StopColor(gradient.from)]),
                  h.stop([h.Offset('100%'), h.StopColor(gradient.to)]),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )
}

export function scatterPaintResource(svg: SVGSVGElement) {
  const namespace = 'http://www.w3.org/2000/svg'
  const document = svg.ownerDocument
  const nodes = new Map<string, SVGLinearGradientElement>()

  return (projection?: ScatterPaintProjection) => {
    const active = new Set(projection?.gradients.map((gradient) => gradient.id))

    for (const [id, node] of nodes) {
      if (!active.has(id)) {
        node.remove()
        nodes.delete(id)
      }
    }

    for (const gradient of projection?.gradients ?? []) {
      let node = nodes.get(gradient.id)

      if (node === undefined) {
        node = document.createElementNS(namespace, 'linearGradient')
        node.append(
          document.createElementNS(namespace, 'stop'),
          document.createElementNS(namespace, 'stop'),
        )
        svg.append(node)
        nodes.set(gradient.id, node)
      }

      for (const [name, value] of Object.entries(attributes(gradient))) {
        node.setAttribute(name, value)
      }

      const [from, to] = [...node.children]
      from?.setAttribute('offset', '0%')
      from?.setAttribute('stop-color', gradient.from)
      to?.setAttribute('offset', '100%')
      to?.setAttribute('stop-color', gradient.to)
    }
  }
}
