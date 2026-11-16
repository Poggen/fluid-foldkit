import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import {
  InputCopyBlock,
  layer,
  createInputCopyLayer,
  type InputCopyResources,
  type InputCopyConfig,
} from '@foldkit-visuals/fluid/input-copy'

const effects = Block.makeEffectsContract<never, InputCopyResources>()
const CopyFixtureKey = Symbol('ClipboardStyleContract')
const CopyFixture = Block.make('ClipboardStyleContract', {
  key: CopyFixtureKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ copy: InputCopyBlock.Model }),
  Message: Schema.Never,
  view: { kind: 'Element' },
  effects,
})
const Copy = CopyFixture.makeRequiredFieldBinding(InputCopyBlock, {
  field: 'copy',
  init: {
    contextToArgs: (): [InputCopyConfig] => [
      { id: 'copy-contract', value: 'fallback value', variant: 'button' },
    ],
  },
}).withOutMessagePolicy({
  fold: CopyFixture.makeOutMessageFold(InputCopyBlock, { Events: CopyFixture.makeNoopStep }),
})
const Composition = CopyFixture.makeComposition({ bindings: [Copy] })
const CopyFixtureLayer = CopyFixture.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) =>
    h.block(
      Copy.embedView({
        slotId: 'copy',
        model: model.copy,
        viewInputs: {
          animate: (node) => node,
          tooltip: () => {
            throw new Error('Button variant must not instantiate a tooltip')
          },
        },
      }),
    ),
  ),
}).pipe(Layer.provide(layer))

Runtime.embed(
  Program.makeElement({
    block: CopyFixture,
    layer: CopyFixtureLayer,
    container: document.getElementById('style-contract-root'),
  }).provide(createInputCopyLayer(document, navigator, window)),
)
