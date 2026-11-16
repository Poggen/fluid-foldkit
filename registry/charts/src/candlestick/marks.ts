import { createMark } from '@tanstack/charts'
import type { ChartMark, ChartPoint, SceneGroup, MarkFocusGuide } from '@tanstack/charts'
import { toDate } from '../cartesian/series'
import { candleBody, candleGeometryClass, candleGeometryCss } from './body'
import type { CandleGeometry, CandleProjection } from './body'

const CANDLE_MARK_ID = 'candles'

export interface OHLCValues extends Readonly<Record<string, unknown>> {
  readonly open: number
  readonly high: number
  readonly low: number
  readonly close: number
}

interface CandleMarkInput<Row extends OHLCValues> {
  readonly id: string
  readonly onProjected: (projection: CandleProjection) => void
  readonly rows: ReadonlyArray<Row>
  readonly xKey: string
  readonly positiveFill: string
  readonly negativeFill: string
  readonly candleWidth: number
  readonly entrance: boolean
  readonly generation: number
  readonly bodyPatternPositive: string | undefined
  readonly bodyPatternNegative: string | undefined
  readonly insideStrokeWidth: number
  readonly solidPositiveFill: string
  readonly solidNegativeFill: string
}

export function candleMarks<Row extends OHLCValues>({
  id,
  onProjected,
  rows,
  xKey,
  positiveFill,
  negativeFill,
  candleWidth,
  entrance,
  generation,
  bodyPatternPositive,
  bodyPatternNegative,
  insideStrokeWidth,
  solidPositiveFill,
  solidNegativeFill,
}: CandleMarkInput<Row>): Array<ChartMark<Row, Date, number>> {
  return [
    createMark<Row, Date, number>(
      () => ({
        id: CANDLE_MARK_ID,
        channels: {},
        render: ({ scales, chart, surface }) => {
          const { x, y } = scales

          if (x === undefined || y === undefined) {
            throw new Error('Candle requires x/y scales')
          }

          const points: Array<ChartPoint<Row, Date, number>> = []
          const geometries = new Map<string, CandleGeometry>()
          const presentationCss: Array<string> = []

          const nodes: Array<SceneGroup> = rows.map((row, index) => {
            const date = toDate(row[xKey])
            const positive = row.close >= row.open
            const key = `candle:${date.getTime()}`
            const pattern = positive ? bodyPatternPositive : bodyPatternNegative
            const hasPattern = pattern !== undefined && pattern !== ''
            const normalFill = positive ? positiveFill : negativeFill
            const solidFill = positive ? solidPositiveFill : solidNegativeFill
            const fill = hasPattern ? solidFill : normalFill
            const center = x.map(date)
            const open = y.map(row.open)

            const closeValue = row.close

            const close = y.map(closeValue)
            const high = y.map(row.high)
            const low = y.map(row.low)
            const bodyTop = Math.min(open, close)
            const bodyHeight = Math.abs(open - close) || 1

            const point: ChartPoint<Row, Date, number> = {
              key,
              markId: CANDLE_MARK_ID,
              group: 'close',
              groupLabel: 'close',
              datum: row,
              datumIndex: index,
              xValue: date,
              yValue: row.close,
              y1Value: row.open,
              y2Value: closeValue,
              yInterval: 'difference',
              x: center,
              y: y.map(row.close),
              color: fill,
            }

            points.push(point)

            const geometry: CandleGeometry = {
              key,
              className: candleGeometryClass(id, index),
              center,
              bodyTop,
              bodyHeight,
              candleWidth,
              wickTop: Math.min(high, low),
              wickHeight: Math.abs(high - low) || 1,
              fill,
              pattern: hasPattern ? pattern : undefined,
              insideStrokeWidth,
            }

            geometries.set(key, geometry)
            const children = candleBody(geometry, !entrance, point)
            presentationCss.push(candleGeometryCss(children))

            return {
              kind: 'group',
              key: entrance ? `enter:${generation}:${key}` : `static:${key}`,
              style: { opacity: entrance ? 0 : 1 },
              className: `bkm-candle bkm-candle-${entrance ? 'enter' : 'static'} bkm-candle-${index} bkm-candle-${positive ? 'positive' : 'negative'}`,
              children,
            }
          })

          onProjected({ centers: points.map((point) => point.x), css: presentationCss.join('') })

          const highlightKey = `${CANDLE_MARK_ID}:highlight`

          const focusGuides: ReadonlyArray<MarkFocusGuide> = entrance
            ? []
            : [
                {
                  key: `${CANDLE_MARK_ID}:highlight-guide`,
                  markId: CANDLE_MARK_ID,
                  chart,
                  surface,
                  placement: 'over',
                  motion: false,
                  resolve: ({ focus }) => {
                    const geometry = focus === null ? undefined : geometries.get(focus.primary.key)

                    return geometry === undefined
                      ? undefined
                      : {
                          kind: 'group',
                          key: highlightKey,
                          children: candleBody<Row>(geometry, true, undefined, highlightKey),
                        }
                  },
                },
              ]

          return {
            nodes: [
              {
                kind: 'group',
                key: CANDLE_MARK_ID,
                className: 'chart-candlesticks',
                children: nodes,
              },
            ],
            points,
            focusGuides,
          }
        },
      }),
      false,
    ),
  ]
}
