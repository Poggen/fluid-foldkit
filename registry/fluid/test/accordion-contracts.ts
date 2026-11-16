import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { AccordionBlock } from '@foldkit-visuals/fluid/accordion'

const Model = Schema.Struct({ radix: AccordionBlock.Model, base: AccordionBlock.Model })

const Message = defineMessageUnion({ Noop: {} })

const effects = Block.makeEffectsContract()

export const AccordionContractsKey = Symbol('AccordionContracts')

const AccordionContractsBlock = Block.make('AccordionContracts', {
  key: AccordionContractsKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const Radix = AccordionContractsBlock.makeRequiredFieldBinding(AccordionBlock, {
  field: 'radix',
  init: { contextToArgs: () => [{ id: 'radix' }] },
})

const Base = AccordionContractsBlock.makeRequiredFieldBinding(AccordionBlock, {
  field: 'base',
  init: { contextToArgs: () => [{ id: 'base' }] },
})

export const wrongAccordionOperations = () => {
  // @ts-expect-error Source values are strings, never numeric selections.
  Radix.informOfValue({ value: 123 })
  // @ts-expect-error Registered Accordion binding cannot invoke a Banner operation.
  const operation: keyof typeof Base = 'requestDismiss'

  return operation
}
