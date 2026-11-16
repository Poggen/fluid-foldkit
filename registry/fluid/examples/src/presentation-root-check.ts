import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import {
  PresentationProviderBlock,
  layer as ProviderLayer,
} from '@foldkit-visuals/fluid/presentation/provider'
import type { PresentationProviderConfig } from '@foldkit-visuals/fluid/presentation/provider'

const ModelA = Schema.Struct({
  outer: PresentationProviderBlock.Model,
  inner: PresentationProviderBlock.Model,
})

export const FluidRootCheckAKey = Symbol('FluidRootCheckA')

const effectsA = Block.makeEffectsContract()

const FluidRootCheckABlock = Block.make('FluidRootCheckA', {
  key: FluidRootCheckAKey,
  InitArgs: Schema.Tuple([]),
  Model: ModelA,
  Message: Schema.Never,
  view: { kind: 'Element' },
  effects: effectsA,
})

const Outer = FluidRootCheckABlock.makeRequiredFieldBinding(PresentationProviderBlock, {
  field: 'outer',
  init: {
    contextToArgs: (): [PresentationProviderConfig] => [
      { id: 'root-a-outer', mode: 'shape', defaultShape: 'pill' },
    ],
  },
})

const Inner = FluidRootCheckABlock.makeRequiredFieldBinding(PresentationProviderBlock, {
  field: 'inner',
  init: {
    contextToArgs: (): [PresentationProviderConfig] => [
      { id: 'root-a-inner', mode: 'shape', defaultShape: 'rounded' },
    ],
  },
})

const FluidRootCheckAComposition = FluidRootCheckABlock.makeComposition({
  bindings: [Outer, Inner],
})

const initA = FluidRootCheckAComposition.makeInit(() => ({ model: {} }))

const updateA = FluidRootCheckAComposition.makeUpdate({})

const viewA = FluidRootCheckAComposition.makeView((model, h) =>
  h.block(
    Outer.embedView({
      slotId: model.outer.id,
      model: model.outer,
      viewInputs: {
        content: () => [
          h.block(
            Inner.embedView({
              slotId: model.inner.id,
              model: model.inner,
              viewInputs: { content: () => [h.span([], ['A'])] },
            }),
          ),
        ],
      },
    }),
  ),
)

const RootALayer = FluidRootCheckABlock.makeLayer({
  init: initA,
  update: updateA,
  view: viewA,
}).pipe(Layer.provide(ProviderLayer))

const ModelB = Schema.Struct({ provider: PresentationProviderBlock.Model })

export const FluidRootCheckBKey = Symbol('FluidRootCheckB')

const effectsB = Block.makeEffectsContract()

const FluidRootCheckBBlock = Block.make('FluidRootCheckB', {
  key: FluidRootCheckBKey,
  InitArgs: Schema.Tuple([]),
  Model: ModelB,
  Message: Schema.Never,
  view: { kind: 'Element' },
  effects: effectsB,
})

const Provider = FluidRootCheckBBlock.makeRequiredFieldBinding(PresentationProviderBlock, {
  field: 'provider',
  init: {
    contextToArgs: (): [PresentationProviderConfig] => [
      { id: 'root-b', mode: 'shape', defaultShape: 'rounded' },
    ],
  },
})

const FluidRootCheckBComposition = FluidRootCheckBBlock.makeComposition({
  bindings: [Provider],
})

const initB = FluidRootCheckBComposition.makeInit(() => ({ model: {} }))

const updateB = FluidRootCheckBComposition.makeUpdate({})

const viewB = FluidRootCheckBComposition.makeView((model, h) =>
  h.block(
    Provider.embedView({
      slotId: model.provider.id,
      model: model.provider,
      viewInputs: { content: () => [h.span([], ['B'])] },
    }),
  ),
)

const RootBLayer = FluidRootCheckBBlock.makeLayer({
  init: initB,
  update: updateB,
  view: viewB,
}).pipe(Layer.provide(ProviderLayer))

export const mountA = (element: HTMLElement) =>
  Runtime.embed(
    Program.makeElement({ block: FluidRootCheckABlock, layer: RootALayer, container: element }),
  )

export const mountB = (element: HTMLElement) =>
  Runtime.embed(
    Program.makeElement({ block: FluidRootCheckBBlock, layer: RootBLayer, container: element }),
  )
