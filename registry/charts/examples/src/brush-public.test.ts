import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { BrushBinding, BrushFixture, BrushBlock } from './brush-public'

export const BrushServerProofKey = Symbol('BrushServerProof')

it.effect(
  'routes the real Brush child output to Main.requestBrush without a parent selection mirror',
  () =>
    Story.story(
      BrushFixture,
      Story.init(),
      Story.messageIn(
        BrushBinding,
        BrushBlock.Message.ObservedBrush({
          kind: 'preview',
          range: { start: 200, end: 600 },
          spanMs: 1000,
          innerWidth: 100,
        }),
      ),
      Story.model((preview) => {
        expect(preview.main.brush).toEqual(Option.some({ start: 180, end: 620 }))
        expect(preview.brush.control.accepted).toEqual(Option.none())
        expect(preview.brush.control.live).toEqual(Option.some({ start: 200, end: 600 }))
        expect(Object.keys(preview).toSorted()).toEqual(['brush', 'isVisible', 'main'])
      }),
      Story.messageIn(
        BrushBinding,
        BrushBlock.Message.ObservedBrush({
          kind: 'cancel',
          range: { start: 0, end: 1000 },
          spanMs: 1000,
          innerWidth: 100,
        }),
      ),
      Story.model((canceled) => {
        expect(canceled.main.brush).toEqual(Option.some({ start: 0, end: 1000 }))
      }),
    ),
)

it.effect(
  'renders the real parent-owned main slot inside the Brush layout through actual registered Bindings',
  () =>
    Effect.gen(function* brushServerProof() {
      const Model = Schema.Struct({ fixture: BrushFixture.block.Model })

      const Definition = Block.make('BrushServerProof', {
        key: BrushServerProofKey,
        Model,
        Message: Schema.Never,
        InitArgs: Schema.Tuple([]),
        view: { kind: 'Document' },
      })

      const Binding = Definition.makeRequiredFieldBinding(BrushFixture.block, {
        field: 'fixture',
        init: { contextToArgs: () => [] },
      })

      const Composition = Definition.makeComposition({ bindings: [Binding] })

      const layer = Definition.makeLayer({
        init: Composition.makeInit(() => ({ model: {} })),
        update: Composition.makeUpdate({}),
        view: Composition.makeView((model, h) => ({
          title: 'Brush proof',
          body: h.block(Binding.embedView({ slotId: 'fixture', model: model.fixture })),
        })),
      }).pipe(Layer.provide(BrushFixture.layer))

      const Server = { block: Definition, layer }

      const { html } = yield* renderToString(Server, {}, { isHydratable: false })
      expect(html).toContain('Toggle brush')
      expect(html).toContain('Full extent')
      expect(html).toContain('bk-brush-main')
      expect(html).toContain('bk-brush-strip')
      expect(html.match(/<svg\b/gu)).toHaveLength(2)
      expect(html).toContain('0..1000')
    }),
)
