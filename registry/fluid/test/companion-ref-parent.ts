import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Card, CardTitle, CardMedia } from '../src/card.js'

const Model = Schema.Struct({ refs: Schema.Natural })

const Message = defineMessageUnion({ Captured: {} })

const CardRefsKey = Symbol('CardRefs')

const effects = Block.makeEffectsContract()

export const CardRefsBlock = Block.make('CardRefs', {
  key: CardRefsKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  effects,
  view: { kind: 'Document' },
})

const Capture = CardRefsBlock.makeMount('Capture', {
  messages: [Message.Captured],
  *handler() {
    return yield* Effect.succeed(({ element }: { readonly element: Element }) =>
      Effect.sync(() => {
        if (element.nodeType !== 1) {
          throw new Error('Expected element')
        }

        return Message.Captured()
      }),
    )
  },
})

const CardRefsComposition = CardRefsBlock.makeComposition({ mounts: [Capture] })

const init = CardRefsComposition.makeInit(() => ({ model: { refs: 0 } }))

const update = CardRefsComposition.makeUpdate({
  Captured: (model) => ({ model: { refs: model.refs + 1 } }),
})

const view = CardRefsComposition.makeView((_model, h) => ({
  title: 'Card refs',
  body: Card(
    {
      href: '',
      label: 'Empty href',
      attributes: [h.OnMount(Capture())],
      children: (context) => [
        CardMedia({ logo: '' }, h),
        CardTitle(
          { ...context, attributes: [h.OnMount(Capture())], children: ['Title with parent ref'] },
          h,
        ),
      ],
    },
    h,
  ),
}))

export const CardRefsLayer = CardRefsBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: Capture.layer,
})
