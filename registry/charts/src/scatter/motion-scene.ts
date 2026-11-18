import { Predicate } from 'effect'
import { createMark } from '@tanstack/charts'
import type {
  ChartLayerRenderer,
  ChartPoint,
  SceneDot,
  SceneGroup,
  SceneNode,
} from '@tanstack/charts'
import type { SeriesMark } from '../cartesian/build-state'
import type { Margin } from '../cartesian/context-types'
import type { ScatterSeries } from './series'
import { scatterPointClass, scatterSeriesClass } from './paint'

/** Ordinary dot projections retain their original interaction records under Source's paint groups. */
export const scatterSeriesScene: <Row>(
  marks: ReadonlyArray<SeriesMark<Row>>,
  rows: ReadonlyArray<Row>,
  series: ScatterSeries,
  scope: string,
  seriesIndex: number,
  margin: Margin,
  entering: boolean,
  generation: number,
  renderer: ChartLayerRenderer<Row, Date, number>,
  occurrences: WeakMap<ChartPoint, number>,
) => SeriesMark<Row> = function scatterSeriesScene<Row>(
  marks: ReadonlyArray<SeriesMark<Row>>,
  rows: ReadonlyArray<Row>,
  series: ScatterSeries,
  scope: string,
  seriesIndex: number,
  margin: Margin,
  entering: boolean,
  generation: number,
  renderer: ChartLayerRenderer<Row, Date, number>,
  occurrences: WeakMap<ChartPoint, number>,
) {
  return createMark(
    (context) => {
      const children = marks.map((mark) => mark.initialize(context))
      const primary = children[0]

      if (primary === undefined) {
        throw new Error('A scatter series requires its ordinary disc projection')
      }

      const id = `scatter-series:${series.dataKey}`
      const channels = Object.fromEntries(
        children.flatMap((child, index) =>
          Object.entries(child.channels).map(([key, channel]) => [
            `${index}:${key}`,
            { ...channel, scale: channel.scale ?? key },
          ]),
        ),
      )

      return {
        ...primary,
        id,
        channels,
        motion: false,
        render: (renderContext) => {
          const scenes = children.map((child) => child.render(renderContext))
          const points = scenes.flatMap(
            (scene) =>
              scene.points ??
              scene.nodes.flatMap(leaves).map((node) => {
                const point = node.interaction?.point

                if (point === undefined || !originalPoint(point, rows)) {
                  throw new Error('Scatter requires its original typed leaf point')
                }

                return point
              }),
          )
          const groups = new Map<number, { point: ChartPoint; dots: Array<SceneDot> }>()

          for (const node of scenes.flatMap((scene) => scene.nodes).flatMap(leaves)) {
            const point = node.interaction?.point

            if (point === undefined) {
              throw new Error('Scatter paint requires its original public point')
            }

            const index = occurrences.get(point)

            if (index === undefined) {
              throw new Error('Scatter requires its original point occurrence')
            }
            const current = groups.get(index)

            if (current === undefined) {
              groups.set(index, { point, dots: [node] })
            } else {
              current.dots.push(node)
            }
          }

          const markers: Array<SceneGroup> = [...groups].map(([index, { point, dots }]) => {
            const className = scatterPointClass(scope, seriesIndex, index)
            const phase = entering ? `enter:${generation}` : 'static'

            return {
              kind: 'group',
              key: `${id}:${index}:${phase}`,
              className,
              translateX: point.x - margin.left,
              translateY: point.y - margin.top,
              children: [
                {
                  kind: 'group',
                  key: `${id}:${index}:paint`,
                  className: entering ? 'bkm-scatter-enter' : 'bkm-scatter-static',
                  ...(entering ? { style: { opacity: 0 } } : {}),
                  children: dots,
                },
              ],
            }
          })

          const base: SceneGroup = {
            kind: 'group',
            key: `${id}:base`,
            className: `bkm-scatter-base${series.dim ? ' bkm-scatter-dim' : ''}`,
            children: markers,
          }

          return {
            nodes: [
              {
                kind: 'group',
                key: id,
                className: `bkm-scatter-series ${scatterSeriesClass(scope, seriesIndex)}`,
                translateX: margin.left,
                translateY: margin.top,
                children: [base],
              },
            ],
            ...(points.length === 0 ? {} : { points }),
            focusAnchors: scenes.flatMap((scene) => scene.focusAnchors ?? []),
            focusGuides: scenes.flatMap((scene) => scene.focusGuides ?? []),
          }
        },
      }
    },
    false,
    renderer,
  ) satisfies SeriesMark<Row>
}

const leaves: (node: SceneNode) => ReadonlyArray<SceneDot> = (node: SceneNode) => {
  if (node.kind === 'group') {
    return node.children.flatMap(leaves)
  }

  return node.kind === 'dot' ? [node] : []
}

const originalPoint = <Row>(
  point: ChartPoint,
  rows: ReadonlyArray<Row>,
): point is ChartPoint<Row, Date, number> =>
  rows.some((row) => row === point.datum) &&
  point.xValue instanceof Date &&
  Predicate.isNumber(point.yValue)
