import { modifyFields } from 'foldkit/struct'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import {
  AccordionBlock,
  AccordionLayer,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../../../registry/fluid/src/accordion.js'

const Model = Schema.Struct({
  accordion: AccordionBlock.Model,
  refTags: Schema.Array(Schema.String),
})

const Message = defineMessageUnion({ CapturedRef: { tag: Schema.String } })

const effects = Block.makeEffectsContract()

export const AccordionRefParentKey = Symbol('AccordionRefParent')

export const AccordionRefParentBlock = Block.make('AccordionRefParent', {
  key: AccordionRefParentKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const CaptureRef = AccordionRefParentBlock.makeMount('CaptureRef', {
  messages: [Message.CapturedRef],
})

const CaptureRefLayer = CaptureRef.toLayer(
  Effect.succeed(({ element }) => Effect.succeed(Message.CapturedRef({ tag: element.tagName }))),
)

const Accordion = AccordionRefParentBlock.makeRequiredFieldBinding(AccordionBlock, {
  field: 'accordion',
  init: { contextToArgs: () => [{ id: 'refs', defaultValue: 'entry' }] },
}).withOutMessagePolicy({
  fold: AccordionRefParentBlock.makeOutMessageFold(AccordionBlock, {
    ValueChanged: AccordionRefParentBlock.makeNoopStep,
  }),
})

const AccordionRefParentComposition = AccordionRefParentBlock.makeComposition({
  bindings: [Accordion],
  mounts: [CaptureRef],
})

const init = AccordionRefParentComposition.makeInit(() => ({ model: { refTags: [] } }))

const update = AccordionRefParentComposition.makeUpdate({
  CapturedRef: (model, { tag }) => ({
    model: modifyFields(model, { refTags: (refTags) => [...refTags, tag] }),
  }),
})

const view = AccordionRefParentComposition.makeView((model, h) => {
  const refAttributes = childAttributes([h.OnMount(CaptureRef())])

  return {
    title: 'Accordion caller refs',
    body: h.div(
      [h.DataAttribute('caller-ref-tags', JSON.stringify(model.refTags))],
      [
        h.block(
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
      ],
    ),
  }
})

export const AccordionRefParentLayer = AccordionRefParentBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: CaptureRefLayer,
}).pipe(Layer.provide(AccordionLayer))
