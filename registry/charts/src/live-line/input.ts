import { Schema } from 'effect'
import type { LiveLineChartProps } from './options'
import { LiveLinePoint } from './options'

export const SourceRows = Schema.Array(
  Schema.StructWithRest(LiveLinePoint, [Schema.Record(Schema.String, Schema.Unknown)]),
)

export const PlannerRow = Schema.StructWithRest(
  Schema.Struct({ time: Schema.NumberFromString, value: Schema.NumberFromString }),
  [Schema.Record(Schema.String, Schema.NumberFromString)],
)

export type SourceRows = LiveLineChartProps['data']

// Native request/initialization channels carry the original dataset capability.
// Structural decoding would clone it before the scoped identity resolver sees it.
export const SourceRowsReference = Schema.declare<SourceRows>(Schema.is(SourceRows))

export function plannerRows(data: SourceRows): ReadonlyArray<typeof PlannerRow.Type> {
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
