import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { GaugeConfiguration } from '@foldkit-visuals/charts/gauge'
import { ShowcaseBlock, ShowcaseLayer } from './showcase'

export const ChartHydrationShowcaseKey = Symbol('ChartHydrationShowcase')

const Model = Schema.Struct({ showcase: ShowcaseBlock.Model })

export const ChartHydrationShowcaseBlock = Block.make('ChartHydrationShowcase', {
  key: ChartHydrationShowcaseKey,
  InitArgs: Schema.Tuple([GaugeConfiguration]),
  ChildInitContext: GaugeConfiguration,
  view: { kind: 'Document' },
  Model,
  Message: Schema.Never,
})

const Binding = ChartHydrationShowcaseBlock.makeRequiredFieldBinding(ShowcaseBlock, {
  field: 'showcase',
  init: { contextToArgs: (configuration) => [configuration] },
})

const ChartHydrationShowcaseComposition = ChartHydrationShowcaseBlock.makeComposition({
  bindings: [Binding],
})

export const ChartHydrationShowcaseLayer = ChartHydrationShowcaseBlock.makeLayer({
  init: ChartHydrationShowcaseComposition.makeInit((configuration) => ({
    model: {},
    childInitContext: configuration,
  })),
  update: ChartHydrationShowcaseComposition.makeUpdate({}),
  view: ChartHydrationShowcaseComposition.makeView((model, h) => ({
    title: 'Native Foldkit Charts SSR',
    body: h.div([], [h.block(Binding.embedView({ slotId: 'showcase', model: model.showcase }))]),
  })),
}).pipe(Layer.provide(ShowcaseLayer))
