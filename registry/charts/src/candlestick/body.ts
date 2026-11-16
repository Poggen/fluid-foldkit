import type { ChartPoint, SceneRect } from '@tanstack/charts'

export interface CandleGeometry {
  readonly key: string
  readonly className: string
  readonly center: number
  readonly bodyTop: number
  readonly bodyHeight: number
  readonly candleWidth: number
  readonly wickTop: number
  readonly wickHeight: number
  readonly fill: string
  readonly pattern: string | undefined
  readonly insideStrokeWidth: number
}

export interface CandleProjection {
  readonly centers: ReadonlyArray<number>
  readonly css: string
}

type CandleRect = SceneRect & { readonly className: string }

export const candleGeometryClass = (id: string, index: number): string =>
  `bkm-candle-geometry-${Array.from(id, (unit) => unit.codePointAt(0)?.toString(16)).join(
    '-',
  )}-${index}`

export const candleGeometryCss = (rectangles: ReadonlyArray<CandleRect>): string =>
  rectangles
    .map(
      (rect) =>
        `.${rect.className}{--bkm-candle-x:${rect.x}px;--bkm-candle-y:${rect.y}px;--bkm-candle-width:${rect.width}px;--bkm-candle-height:${rect.height}px}`,
    )
    .join('')

export function candleBody<Row>(
  geometry: CandleGeometry,
  staticBody: boolean,
  point?: ChartPoint<Row, Date, number>,
  key = geometry.key,
): ReadonlyArray<CandleRect> {
  const {
    center,
    bodyTop,
    bodyHeight,
    candleWidth,
    wickTop,
    wickHeight,
    fill,
    pattern,
    insideStrokeWidth,
  } = geometry

  const left = center - candleWidth / 2

  const body: CandleRect = {
    kind: 'rect',
    key: `body:${key}`,
    className: `${geometry.className}-body`,
    x: left,
    y: bodyTop,
    width: candleWidth,
    height: bodyHeight,
    radius: 1,
    style: { fill, stroke: fill, strokeWidth: 1 },
  }

  const rectangles: Array<CandleRect> = [
    {
      kind: 'rect',
      key: `wick:${key}`,
      className: `${geometry.className}-wick`,
      x: center - 0.75,
      y: wickTop,
      width: 1.5,
      height: wickHeight,
      style: { fill },
    },
    point === undefined ? body : { ...body, interaction: { point } },
  ]

  if (pattern !== undefined) {
    rectangles.push({
      kind: 'rect',
      key: `pattern:${key}`,
      className: `${geometry.className}-pattern`,
      x: left,
      y: bodyTop,
      width: candleWidth,
      height: bodyHeight,
      radius: 1,
      style: { fill: pattern },
    })
  }

  if (staticBody && insideStrokeWidth > 0) {
    rectangles.push({
      kind: 'rect',
      key: `inset:${key}`,
      className: `${geometry.className}-inset`,
      x: left + insideStrokeWidth / 2,
      y: bodyTop + insideStrokeWidth / 2,
      width: candleWidth - insideStrokeWidth,
      height: bodyHeight - insideStrokeWidth,
      radius: 1,
      style: { fill: 'none', stroke: fill, strokeWidth: insideStrokeWidth },
    })
  }

  return rectangles
}
