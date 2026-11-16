import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { GaugeConfiguration } from './model'
import type { GaugeViewInputs } from './model'

const Model = Schema.Struct({
  id: Schema.String,
  configuration: GaugeConfiguration,
  isMounted: Schema.Boolean,
})

const Message = defineMessageUnion({
  CompletedMount: {},
  CompletedPrepare: {},
})

const InMessage = defineInMessageUnion({
  RequestedConfigure: { configuration: GaugeConfiguration },
})

const effects = Block.makeEffectsContract()

export const GaugeKey = Symbol('Gauge')

export const GaugeBlock = Block.make('Gauge', {
  key: GaugeKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([GaugeConfiguration, Schema.String]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<GaugeViewInputs>() },
  effects,
})
