import type { TouchPrimaryResources } from '../src/touch-primary.js'
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { defineMessageUnion } from 'foldkit/message'
import { expect } from 'vitest'
import {
  TouchPrimaryBlock,
  TouchPrimaryServerLayer,
  useTouchPrimary,
  layer as TouchLayer,
} from '../src/touch-primary.js'

const TouchPrimaryServerKey = Symbol('TouchPrimaryServer')

const effects = Block.makeEffectsContract<never, TouchPrimaryResources>()

const ServerBlock = Block.make('TouchPrimaryServer', {
  key: TouchPrimaryServerKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ consumer: TouchPrimaryBlock.Model }),
  Message: defineMessageUnion({}),
  view: { kind: 'Document' },
  effects,
})

const Consumer = ServerBlock.makeRequiredFieldBinding(TouchPrimaryBlock, {
  field: 'consumer',
  init: { contextToArgs: () => [{ id: 'server-consumer' }] },
}).withOutMessagePolicy({
  fold: ServerBlock.makeOutMessageFold(TouchPrimaryBlock, {
    Changed: () => ServerBlock.makeNoopStep(),
  }),
})

const ServerComposition = ServerBlock.makeComposition({ bindings: [Consumer] })

const serverLayer = ServerBlock.makeLayer({
  init: ServerComposition.makeInit(() => ({ model: {} })),
  update: ServerComposition.makeUpdate({}),
  view: ServerComposition.makeView((model, h) => ({
    title: 'Touch-primary server contract',
    body: h.div([h.Id(model.consumer.id)], [useTouchPrimary(model.consumer) ? 'touch' : 'fine']),
  })),
}).pipe(Layer.provide(TouchLayer), Layer.provide(TouchPrimaryServerLayer))

const subject = {
  block: TouchPrimaryBlock,
  layer: TouchLayer.pipe(Layer.provide(TouchPrimaryServerLayer)),
}

it.effect('begins false and remains JSON serializable after observations', () =>
  Effect.gen(function* touchCodec() {
    const model = yield* Story.story(
      subject,
      Story.init({ id: 'consumer' }),
      Story.model((initial) => {
        expect(initial).toEqual({ id: 'consumer', isTouchPrimary: false })
        expect(useTouchPrimary(initial)).toBe(false)
      }),
      Story.message(TouchPrimaryBlock.Message.Observed({ value: true })),
    )

    expect(useTouchPrimary(model)).toBe(true)
    const codec = Schema.fromJsonString(TouchPrimaryBlock.Model)
    const serialized = yield* Schema.encodeEffect(codec)(model)
    expect(yield* Schema.decodeEffect(codec)(serialized)).toEqual({
      id: 'consumer',
      isTouchPrimary: true,
    })
  }),
)

it.effect('only Boolean transitions emit Changed', () =>
  Story.story(
    subject,
    Story.init({ id: 'consumer' }),
    Story.message(TouchPrimaryBlock.Message.Observed({ value: false })),
    Story.expectNoOutMessage(),
    Story.message(TouchPrimaryBlock.Message.Observed({ value: true })),
    Story.expectOutMessage(TouchPrimaryBlock.OutMessage.Changed({ value: true })),
    Story.message(TouchPrimaryBlock.Message.Observed({ value: true })),
    Story.expectNoOutMessage(),
    Story.message(TouchPrimaryBlock.Message.Observed({ value: false })),
    Story.expectOutMessage(TouchPrimaryBlock.OutMessage.Changed({ value: false })),
    Story.model((model) => {
      expect(useTouchPrimary(model)).toBe(false)
    }),
  ),
)

it.effect(
  'a registered headless consumer renders its false branch on the server without a browser',
  () =>
    Effect.gen(function* touchServer() {
      const rendered = yield* renderToString(
        { block: ServerBlock, layer: serverLayer },
        {},
        { isHydratable: false },
      )

      expect(rendered.html).toContain('id="server-consumer"')
      expect(rendered.html).toContain('>fine</div>')
    }),
)
