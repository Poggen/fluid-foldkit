/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Block } from 'foldkit'
import { AccordionNamespace, accordionContract } from './accordion-contract.js'
import { accordionLayer } from './accordion-layer.js'

export const AccordionKey = Symbol('Accordion')

export const AccordionBlock = Block.make(AccordionNamespace, {
  key: AccordionKey,
  ...accordionContract,
})

export const AccordionLayer = accordionLayer<typeof AccordionKey>(AccordionBlock, false)

export const AccordionGroupKey = Symbol('AccordionGroup')

export const AccordionGroupBlock = Block.make(AccordionNamespace, {
  key: AccordionGroupKey,
  ...accordionContract,
})

export const AccordionGroupLayer = accordionLayer<typeof AccordionGroupKey>(
  AccordionGroupBlock,
  true,
)

export { AccordionItem, AccordionTrigger, AccordionContent } from './accordion-parts.js'

export type { AccordionContext, AccordionPartProps, AccordionItemProps } from './accordion-parts.js'

export type { AccordionViewInputs } from './accordion-contract.js'

export type { AccordionConfig } from './accordion-state.js'

export const hoverModeOf = (model: typeof AccordionBlock.Model.Type) => model.hover.mode
