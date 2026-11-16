import { DateTime, Schema } from 'effect'
import { splitProfitLossSegments } from '@foldkit-visuals/charts'

const Row = Schema.Struct({ value: Schema.Number, epoch: Schema.Finite, label: Schema.String })

export const profitSegmentsPublicConsumer = () => {
  const rows = Schema.decodeUnknownSync(Schema.Array(Row))([
    { value: 1, epoch: 0, label: 'Opening' },
    { value: -3, epoch: 100, label: 'Closing' },
  ])

  return splitProfitLossSegments({
    data: [...rows],
    dataKey: 'value',
    xAccessor: (row) =>
      DateTime.toDateUtc(DateTime.makeUnsafe(Schema.decodeUnknownSync(Schema.Finite)(row.epoch))),
  })
}
