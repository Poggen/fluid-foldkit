import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  SeriesPointMarkerBlock,
  SeriesPointMarkerLayer,
} from '@foldkit-visuals/charts/series-point-marker'
import type { SeriesPointMarkerProps } from '@foldkit-visuals/charts/series-point-marker'

const configuration: SeriesPointMarkerProps = {
  dataKey: 'revenue',
  index: 2,
  cx: 24,
  cy: 48,
  revealDelay: 0.125,
  revealEpoch: 3,
  enterDuration: 0.4,
  fill: '#123456',
  stroke: '#abcdef',
  outlineWidth: 4,
}

export const SeriesPointMarkerPublicConsumerKey = Symbol('SeriesPointMarkerPublicConsumer')

const Model = Schema.Struct({ marker: SeriesPointMarkerBlock.Model })

const Message = defineMessageUnion({ RequestedEpoch: { epoch: Schema.Number } })

const SeriesPointMarkerPublicConsumerBlock = Block.make('SeriesPointMarkerPublicConsumer', {
  key: SeriesPointMarkerPublicConsumerKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Marker = SeriesPointMarkerPublicConsumerBlock.makeRequiredFieldBinding(
  SeriesPointMarkerBlock,
  {
    field: 'marker',
    init: { contextToArgs: () => [configuration] },
  },
)

const SeriesPointMarkerPublicConsumerComposition =
  SeriesPointMarkerPublicConsumerBlock.makeComposition({ bindings: [Marker] })

const layer = SeriesPointMarkerPublicConsumerBlock.makeLayer({
  init: SeriesPointMarkerPublicConsumerComposition.makeInit(() => ({ model: {} })),
  update: SeriesPointMarkerPublicConsumerComposition.makeUpdate({
    RequestedEpoch: (model, { epoch }) =>
      Marker.requestConfigure({
        configuration: {
          ...configuration,
          revealEpoch: epoch,
        },
      })(model),
  }),
  view: SeriesPointMarkerPublicConsumerComposition.makeView((model, h) => ({
    title: 'Series marker public consumer',
    body: h.svg(
      [h.Width('200'), h.Height('100')],
      [h.block(Marker.embedView({ slotId: 'marker', model: model.marker }))],
    ),
  })),
}).pipe(Layer.provide(SeriesPointMarkerLayer))

export const PublicConsumer = { block: SeriesPointMarkerPublicConsumerBlock, layer }
