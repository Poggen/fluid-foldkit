import { Layer, Schema } from 'effect'
import { Block, Program } from 'foldkit'
import type { DomChartDefinition } from '@tanstack/charts'
import {
  BarChart,
  Bar,
  ComposedChart,
  SeriesBar,
  Line,
  YAxis,
  BarXAxis,
} from '@/ui/charts/index.js'
const Row = Schema.Struct({
  name: Schema.String,
  date: Schema.DateFromString,
  value: Schema.Finite,
})
const bars = BarChart({ name: 'external-bar-consumer', Row })
const BarsKey = Symbol('ExternalBars')
const BarsBlock = Block.make(bars.namespace, { key: BarsKey, ...bars.contract })
const composed = ComposedChart({ name: 'external-composed-consumer', Row })
const ComposedKey = Symbol('ExternalComposed')
const ComposedBlock = Block.make(composed.namespace, { key: ComposedKey, ...composed.contract })
const domain: readonly [number, number] = [0, 100]
const axes = [YAxis({ domain }), YAxis({ yAxisId: 'right', domain: [0, 1] })]
const barProps = { yDomain: domain, children: [Bar({ dataKey: 'value' }), ...axes] }
const composedProps = {
  yDomain: domain,
  children: [
    SeriesBar({ dataKey: 'value' }),
    Line({ dataKey: 'value', yAxisId: 'right' }),
    ...axes,
  ],
}
export const numericBar = bars.inputs('numeric-bar', {
  orientation: 'horizontal',
  yDomain: domain,
  children: [
    Bar({ dataKey: 'value' }),
    BarXAxis({ type: 'number', formatValue: (value) => `${value}%` }),
  ],
})
const inputs = bars.inputs('bar', barProps)
const composedInputs = composed.inputs('composed', composedProps)
const Model = Schema.Struct({ bars: BarsBlock.Model, composed: ComposedBlock.Model })
const ParentKey = Symbol('ExternalBarParent')
const Parent = Block.make('ExternalBarParent', {
  key: ParentKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const Bars = Parent.makeRequiredFieldBinding(BarsBlock, {
  field: 'bars',
  init: { contextToArgs: () => ['bar', [], bars.configuration(barProps)] },
})
const Composed = Parent.makeRequiredFieldBinding(ComposedBlock, {
  field: 'composed',
  init: { contextToArgs: () => ['composed', [], composed.configuration(composedProps)] },
})
const Composition = Parent.makeComposition({ bindings: [Bars, Composed] })
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.block(Bars.embedView({ slotId: 'bars', model: model.bars, viewInputs: inputs })),
        h.block(
          Composed.embedView({
            slotId: 'composed',
            model: model.composed,
            viewInputs: composedInputs,
          }),
        ),
      ],
    ),
  ),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      BarsBlock.makeLayer(bars.plans(BarsBlock)),
      ComposedBlock.makeLayer(composed.plans(ComposedBlock)),
    ),
  ),
)
export const program = Program.makeElement({ block: Parent, layer, container: null })
export const dataOperation = Bars.requestData({
  data: [{ name: 'A', date: new Date(0), value: 1 }],
})
