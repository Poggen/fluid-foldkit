import { DateTime, Schema } from 'effect'

export const SkeletonRow = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

export type ChartSkeletonDatum = Readonly<Record<string, Date | number>>

export interface GenerateChartSkeletonDataOptions {
  readonly dataKey?: string
  readonly pointCount?: number
  readonly baseDate?: Date
}

export function generateChartSkeletonData(
  options: GenerateChartSkeletonDataOptions = {},
): Array<ChartSkeletonDatum> {
  const key = options.dataKey ?? 'value'
  const baseDate = options.baseDate ?? DateTime.toDateUtc(DateTime.makeUnsafe('2025-01-01'))

  return Array.from({ length: options.pointCount ?? 7 }, (_, index) => {
    const date = DateTime.toDateUtc(DateTime.makeUnsafe(baseDate.getTime()))
    date.setDate(baseDate.getDate() + index)

    return { date, [key]: Math.round(110 + Math.sin(index * 1.15) * 36 + index * 9) }
  })
}

export function generateChartSkeletonFromTarget<Row extends object>(
  targetData: ReadonlyArray<Row>,
  dataKey: string,
): Array<Readonly<Record<string, Row[keyof Row] | number>>> {
  return targetData.map((row, index) => ({
    ...row,
    [dataKey]: Math.round(95 + Math.sin(index * 1.05) * 28 + index * 7),
  }))
}
