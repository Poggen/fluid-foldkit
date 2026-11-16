import { Schema } from 'effect'

export type ChartRowSchema = Schema.Codec<unknown, Schema.Json, never, never>

/** Keep caller identity during checked construction; persist through the caller's real row codec. */
export function chartRows<RowSchema extends ChartRowSchema>(Row: RowSchema) {
  const encodedRows = Schema.Array(Row)
  const rows = Schema.declare<ReadonlyArray<RowSchema['Type']>>(Schema.is(encodedRows))

  return encodedRows.pipe(Schema.decodeTo(rows))
}
