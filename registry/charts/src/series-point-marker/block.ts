import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { SeriesPointMarkerProps } from './props'

const Model = Schema.Struct({ configuration: SeriesPointMarkerProps })

const Message = defineMessageUnion({
  CompletedMount: {},
})

const InMessage = defineInMessageUnion({
  RequestedConfigure: { configuration: SeriesPointMarkerProps },
})

const effects = Block.makeEffectsContract()

export const SeriesPointMarkerKey = Symbol('SeriesPointMarker')

export const SeriesPointMarkerBlock = Block.make('SeriesPointMarker', {
  key: SeriesPointMarkerKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([SeriesPointMarkerProps]),
  view: { kind: 'Element' },
  effects,
})
