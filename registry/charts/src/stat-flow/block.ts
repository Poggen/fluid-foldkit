import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { ChartStatFlowProps } from './props'
import type { ChartStatFlowViewInputs } from './layer'

const Model = Schema.Struct({ configuration: ChartStatFlowProps })

const Message = defineMessageUnion({
  CompletedMount: {},
})

const InMessage = defineInMessageUnion({
  RequestedConfigure: { configuration: ChartStatFlowProps },
})

const effects = Block.makeEffectsContract()

export const ChartStatFlowKey = Symbol('ChartStatFlow')

export const ChartStatFlowBlock = Block.make('ChartStatFlow', {
  key: ChartStatFlowKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([ChartStatFlowProps]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ChartStatFlowViewInputs>() },
  effects,
})
