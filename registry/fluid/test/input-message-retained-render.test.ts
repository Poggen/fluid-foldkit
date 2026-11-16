import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Cause, Effect, Exit, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { renderToString } from 'foldkit/experimental/server'
import type { InputMessageConfig } from '../src/input-message.js'
import { InputMessageBlock, layer as InputMessageLayer } from '../src/input-message.js'
import { createMotionScope } from '../src/motion.js'
import { createReorderScope } from '../src/reorder.js'

const files = [
  { id: 'a', name: 'a.png', type: 'image/png', size: 10, lastModified: 1 },
  { id: 'b', name: 'b.png', type: 'image/png', size: 20, lastModified: 2 },
]

const queue = [
  { id: 'a', text: 'Queue A', files: [] },
  { id: 'b', text: 'Queue B', files: [] },
]

const Model = Schema.Struct({ input: InputMessageBlock.Model })

const Message = defineMessageUnion({ Noop: {} })

export const InputRetainedKey = Symbol('InputRetainedRender')

const effects = Block.makeEffectsContract<
  never,
  Block.FactsOf<typeof InputMessageBlock>['programRequirements']
>()

const Definition = Block.make('InputRetainedRender', {
  key: InputRetainedKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const Input = Definition.makeRequiredFieldBinding(InputMessageBlock, {
  field: 'input',
  init: {
    contextToArgs: (): [InputMessageConfig] => [
      {
        id: 'input',
        value: '',
        reduceMotion: false,
        supportsFiles: true,
        files,
        status: 'streaming',
        supportsQueue: true,
        queue,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(InputMessageBlock, {
    Events: Definition.makeNoopStep,
    PresentationChanged: Definition.makeNoopStep,
  }),
})

const Composition = Definition.makeComposition({ bindings: [Input] })

const init = Composition.makeInit(() => ({
  model: {},
  steps: [
    Input.requestRemoveFile({ index: 0 }),
    Input.requestRemoveFile({ index: 0 }),
    Input.requestRemoveQueued({ id: 'a' }),
    Input.requestRemoveQueued({ id: 'b' }),
  ],
}))

const update = Composition.makeUpdate({ Noop: Definition.makeNoopStep() })

const createLayer = () => {
  const motion = createMotionScope('input-retained-render')
  const reorder = createReorderScope(motion)

  const view = Composition.makeView((model, h) => ({
    title: 'Retained Input children',
    body: h.block(
      Input.embedView({
        slotId: model.input.id,
        model: model.input,
        viewInputs: {
          animate: motion.node,
          getReorder: () => reorder,
          tooltip: ({ trigger }) =>
            trigger({
              attributes: [],
              button: (attributes, children) => h.button(attributes, children),
              anchor: (attributes, children) => h.a(attributes, children),
              span: (attributes, children) => h.span(attributes, children),
              div: (attributes, children) => h.div(attributes, children),
            }),
        },
      }),
    ),
  }))

  return Definition.makeLayer({ init, update, view }).pipe(
    Layer.provide(InputMessageLayer),
    Layer.provide(Layer.merge(motion.layer, reorder.layer)),
  )
}

it.effect('retained InputMessage attachments are client-only on the pinned Blocks preview', () =>
  Effect.gen(function* retainedRegions() {
    const exit = yield* Effect.exit(
      renderToString({ block: Definition, layer: createLayer() }, {}, { isHydratable: false }),
    )

    expect(Exit.isFailure(exit)).toBe(true)

    if (Exit.isFailure(exit)) {
      expect(Cause.squash(exit.cause)).toMatchObject({
        cause: {
          message:
            '[foldkit] Block binding "thumbnails" emitted before its occurrence was captured.',
        },
      })
    }
  }),
)
