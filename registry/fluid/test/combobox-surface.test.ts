import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { makeInitIfMissingStep } from 'foldkit/binding'
import { renderToString } from 'foldkit/experimental/server'
import { defineMessageUnion } from 'foldkit/message'
import { ComboboxPopupBlock, layer as PopupLayer } from '../src/combobox-popup.js'
import { Elevated } from '../src/elevated.js'
import { DialogResourcesServerLayer } from '../src/dialog-resources.js'
import { createPresentationContext } from '../src/presentation.js'

const key = Symbol('ComboboxSurfaces')
const Root = Block.make('ComboboxSurfaces', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ combos: Schema.Record(Schema.String, ComboboxPopupBlock.Model) }),
  Message: defineMessageUnion({}),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof ComboboxPopupBlock>['programRequirements']
  >(),
  view: { kind: 'Document' },
})
const Combos = Root.makeRecordBinding(ComboboxPopupBlock, { field: 'combos' }).withOutMessagePolicy(
  {
    fold: Root.makeOutMessageFold(ComboboxPopupBlock, {
      Dismissed: Root.makeNoopStep,
      RowsChanged: Root.makeNoopStep,
    }),
  },
)
const Composition = Root.makeComposition({ bindings: [Combos] })
const surfaces = [1, 4, 7]
const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { combos: {} },
    steps: surfaces.flatMap((surface) => [
      makeInitIfMissingStep(Combos, {
        key: String(surface),
        args: [{ id: `surface-${surface}`, anchorId: `anchor-${surface}` }],
      }),
      Combos.requestVisibility(String(surface), { open: true }),
    ]),
  })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Nested Combobox surfaces',
    body: h.div(
      [],
      surfaces.map((surface) => {
        const combo = model.combos[String(surface)]
        if (combo === undefined) throw new Error('Missing Combobox')
        return h.block(
          Combos.embedView({
            key: String(surface),
            slotId: combo.id,
            model: combo,
            viewInputs: {
              animate: (node) => node,
              context: createPresentationContext({ surface }),
              content: (context) => [
                Elevated({ context, offset: 1, children: () => ['Nested child'] }, h),
              ],
            },
          }),
        )
      }),
    ),
  })),
}).pipe(Layer.provide(PopupLayer), Layer.provide(DialogResourcesServerLayer))

it.effect(
  'Combobox inherits nested surfaces and clamps at 8 while its popup shadow stays at 3',
  () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString({ block: Root, layer }, {}, { isHydratable: false })
      expect(rendered.html).toContain('bg-surface-3')
      expect(rendered.html).toContain('bg-surface-6')
      expect(rendered.html).toContain('bg-surface-8')
      expect(rendered.html).toContain('bg-surface-7')
      expect(rendered.html.match(/shadow-surface-3/gu)).toHaveLength(3)
    }),
)
