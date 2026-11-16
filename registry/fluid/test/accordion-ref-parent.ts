import { renderToString } from 'foldkit/experimental/server'

import { Elevated } from '@foldkit-visuals/fluid/elevated'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import {
  ShapeProvider,
  SizeProvider,
  useSizeContext,
} from '@foldkit-visuals/fluid/presentation/context'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import {
  type AccordionViewInputs,
  AccordionBlock,
  AccordionLayer,
  AccordionGroupBlock,
  AccordionGroupLayer,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@foldkit-visuals/fluid/accordion'

const Model = Schema.Struct({ accordion: AccordionBlock.Model, refTag: Schema.String })

const Message = defineMessageUnion({ CapturedRef: { tag: Schema.String } })

const effects = Block.makeEffectsContract()

export const AccordionRefTestParentKey = Symbol('AccordionRefTestParent')

export const AccordionRefTestParentBlock = Block.make('AccordionRefTestParent', {
  key: AccordionRefTestParentKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const CaptureRef = AccordionRefTestParentBlock.makeMount('CaptureRef', {
  messages: [Message.CapturedRef],
})

const CaptureRefLayer = CaptureRef.toLayer(
  Effect.succeed(({ element }) => Effect.succeed(Message.CapturedRef({ tag: element.tagName }))),
)

const Accordion = AccordionRefTestParentBlock.makeRequiredFieldBinding(AccordionBlock, {
  field: 'accordion',
  init: { contextToArgs: () => [{ id: 'refs', defaultValue: 'entry' }] },
}).withOutMessagePolicy({
  fold: AccordionRefTestParentBlock.makeOutMessageFold(AccordionBlock, {
    ValueChanged: AccordionRefTestParentBlock.makeNoopStep,
  }),
})

const AccordionRefTestParentComposition = AccordionRefTestParentBlock.makeComposition({
  bindings: [Accordion],
  mounts: [CaptureRef],
})

const init = AccordionRefTestParentComposition.makeInit(() => ({ model: { refTag: '' } }))

const update = AccordionRefTestParentComposition.makeUpdate({
  CapturedRef: (model, { tag }) => ({ model: { ...model, refTag: tag } }),
})

const view = AccordionRefTestParentComposition.makeView((model, h) => {
  const refAttributes = childAttributes([h.OnMount(CaptureRef())])

  return {
    title: 'Accordion caller refs',
    body: h.block(
      Accordion.embedView({
        slotId: model.accordion.id,
        model: model.accordion,
        viewInputs: {
          animate: (node) => node,
          animateHighlight: (node) => node,
          content: (rootContext) => [
            AccordionItem(
              {
                value: 'entry',
                attributes: refAttributes,
                children: (context) => [
                  AccordionTrigger(
                    {
                      value: 'entry',
                      attributes: refAttributes,
                      children: ['Reference target'],
                    },
                    context,
                    h,
                  ),
                  AccordionContent(
                    {
                      value: 'entry',
                      attributes: refAttributes,
                      children: ['Content target'],
                    },
                    context,
                    h,
                  ),
                ],
              },
              rootContext,
              h,
            ),
          ],
        },
      }),
    ),
  }
})

export const AccordionRefTestParentLayer = AccordionRefTestParentBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: CaptureRefLayer,
}).pipe(Layer.provide(AccordionLayer))

export const AccordionContextParentKey = Symbol('AccordionContextParent')

const contextEffects = Block.makeEffectsContract()

const ContextRoot = Block.make('AccordionContextParent', {
  key: AccordionContextParentKey,
  Model: Schema.Struct({
    radix: AccordionBlock.Model,
    base: AccordionBlock.Model,
    radixGroup: AccordionGroupBlock.Model,
    baseGroup: AccordionGroupBlock.Model,
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: contextEffects,
})

const RadixContext = ContextRoot.makeRequiredFieldBinding(AccordionBlock, {
  field: 'radix',
  init: { contextToArgs: () => [{ id: 'radix-accordion', defaultValue: 'entry' }] },
}).withOutMessagePolicy({
  fold: ContextRoot.makeOutMessageFold(AccordionBlock, { ValueChanged: ContextRoot.makeNoopStep }),
})

const BaseContext = ContextRoot.makeRequiredFieldBinding(AccordionBlock, {
  field: 'base',
  init: { contextToArgs: () => [{ id: 'base-accordion', defaultValue: 'entry' }] },
}).withOutMessagePolicy({
  fold: ContextRoot.makeOutMessageFold(AccordionBlock, {
    ValueChanged: ContextRoot.makeNoopStep,
  }),
})

const RadixGroupContext = ContextRoot.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'radixGroup',
  init: { contextToArgs: () => [{ id: 'radix-group-accordion', defaultValue: 'entry' }] },
}).withOutMessagePolicy({
  fold: ContextRoot.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: ContextRoot.makeNoopStep,
  }),
})

const BaseGroupContext = ContextRoot.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'baseGroup',
  init: { contextToArgs: () => [{ id: 'base-group-accordion', defaultValue: 'entry' }] },
}).withOutMessagePolicy({
  fold: ContextRoot.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: ContextRoot.makeNoopStep,
  }),
})

const contextComposition = ContextRoot.makeComposition({
  bindings: [RadixContext, BaseContext, RadixGroupContext, BaseGroupContext],
})

const contextMotion = createMotionScope('accordion-context-parent')

const animateHighlight = hoverHighlightAnimation(contextMotion)

const contextView = contextComposition.makeView((model, h) => {
  const content: AccordionViewInputs['content'] = (rootContext) => [
    AccordionItem(
      {
        value: 'entry',
        children: (context) => [
          h.span([
            h.DataAttribute('accordion-presentation', context.id),
            h.DataAttribute('size-provider', useSizeContext(context.context, (size) => size).size),
            h.DataAttribute('context-grouped', String(context.grouped)),
          ]),
          AccordionTrigger(
            {
              value: 'entry',
              attributes: childAttributes([h.DataAttribute('context-trigger', context.id)]),
              children: [`${context.id} direct`],
            },
            context,
            h,
          ),
          Elevated(
            {
              ...context,
              offset: 1,
              children: () => [
                AccordionContent(
                  {
                    value: 'entry',
                    attributes: childAttributes([h.DataAttribute('context-content', context.id)]),
                    children: [`${context.id} wrapped`],
                  },
                  context,
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      },
      rootContext,
      h,
    ),
  ]

  return {
    title: 'Public Accordion context composition',
    body: ShapeProvider({
      defaultShape: 'pill',
      children: (shapeContext) =>
        SizeProvider({
          context: shapeContext,
          defaultSize: 'compact',
          children: (presentation) =>
            h.main(
              [],
              [
                h.block(
                  RadixContext.embedView({
                    slotId: model.radix.id,
                    model: model.radix,
                    viewInputs: {
                      context: presentation,
                      animate: contextMotion.node,
                      animateHighlight,
                      className: 'root-radix-accordion',
                      attributes: childAttributes([
                        h.Id('radix-accordion'),
                        h.DataAttribute('root-owner', 'radix-accordion'),
                      ]),
                      content,
                    },
                  }),
                ),
                h.block(
                  BaseContext.embedView({
                    slotId: model.base.id,
                    model: model.base,
                    viewInputs: {
                      context: presentation,
                      animate: contextMotion.node,
                      animateHighlight,
                      className: 'root-base-accordion',
                      attributes: childAttributes([
                        h.Id('base-accordion'),
                        h.DataAttribute('root-owner', 'base-accordion'),
                      ]),
                      content,
                    },
                  }),
                ),
                h.block(
                  RadixGroupContext.embedView({
                    slotId: model.radixGroup.id,
                    model: model.radixGroup,
                    viewInputs: {
                      context: presentation,
                      animate: contextMotion.node,
                      animateHighlight,
                      className: 'root-radix-group-accordion',
                      attributes: childAttributes([
                        h.Id('radix-group-accordion'),
                        h.DataAttribute('root-owner', 'radix-group-accordion'),
                      ]),
                      content,
                    },
                  }),
                ),
                h.block(
                  BaseGroupContext.embedView({
                    slotId: model.baseGroup.id,
                    model: model.baseGroup,
                    viewInputs: {
                      context: presentation,
                      animate: contextMotion.node,
                      animateHighlight,
                      className: 'root-base-group-accordion',
                      attributes: childAttributes([
                        h.Id('base-group-accordion'),
                        h.DataAttribute('root-owner', 'base-group-accordion'),
                      ]),
                      content,
                    },
                  }),
                ),
              ],
            ),
        }),
    }),
  }
})

const contextLayer = ContextRoot.makeLayer({
  init: contextComposition.makeInit(() => ({ model: {} })),
  update: contextComposition.makeUpdate({}),
  view: contextView,
}).pipe(Layer.provide(Layer.merge(AccordionLayer, AccordionGroupLayer)))

export const renderAccordionContext = () =>
  renderToString({ block: ContextRoot, layer: contextLayer }, {}, { isHydratable: false })
