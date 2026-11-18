import type { ChartPoint } from '@tanstack/charts'
import type { CellDatum } from './definition'

export const gridTarget: (
  points: ReadonlyArray<Point>,
  current: Point,
  key: string,
  columns: number,
  rows: number,
) => Point | undefined = function gridTarget(
  points: ReadonlyArray<Point>,
  current: Point,
  key: string,
  columns: number,
  rows: number,
) {
  const step = steps.get(key)

  if (step === undefined) {
    return undefined
  }

  let column = current.datum.column + step[0],
    row = current.datum.row + step[1]

  while (column >= 0 && column < columns && row >= 0 && row < rows) {
    const target = points.find((point) => point.datum.column === column && point.datum.row === row)

    if (target !== undefined) {
      return target
    }

    column += step[0]
    row += step[1]
  }

  return current
}

type Point = ChartPoint<Readonly<CellDatum>, number | string, string>

const steps = new Map<string, readonly [number, number]>([
  ['ArrowDown', [0, 1]],
  ['ArrowLeft', [-1, 0]],
  ['ArrowRight', [1, 0]],
  ['ArrowUp', [0, -1]],
])
