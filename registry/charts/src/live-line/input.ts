import { Schema } from 'effect'
import type { LiveLineChartProps } from './options'
import { LiveLinePoint } from './options'

export const plannerRows: (data: SourceRows) => ReadonlyArray<typeof PlannerRow.Type> =
  function plannerRows(data: SourceRows) {
    return data.map((row) => ({
      ...Object.fromEntries(
        Object.entries(row).filter((entry): entry is [string, number] =>
          Schema.is(Schema.Number)(entry[1]),
        ),
      ),
      time: row.time,
      value: row.value,
    }))
  }

export const SourceRows = Schema.Array(
  Schema.StructWithRest(LiveLinePoint, [Schema.Record(Schema.String, Schema.Unknown)]),
)

export const PlannerRow = Schema.StructWithRest(
  Schema.Struct({ time: Schema.NumberFromString, value: Schema.NumberFromString }),
  [Schema.Record(Schema.String, Schema.NumberFromString)],
)

export type SourceRows = LiveLineChartProps['data']

export const SourceRowsReference = Schema.declare<SourceRows>(Schema.is(SourceRows))
