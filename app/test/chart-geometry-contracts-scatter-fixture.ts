import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { ChartTooltip, Scatter, ScatterChart } from '../../registry/charts/src/index'
const Row = Schema.Struct({
  date: Schema.DateFromString,
  value: Schema.Union([Schema.Finite, Schema.String]),
})
const rows = [10, '20', -30].map((value, index) =>
  Row.make({ value, date: new Date(index * 1000) }),
)
const recipe = ScatterChart({ name: 'browser-geometry-scatter', Row })
const chartKey = Symbol('GeometryScatter')
const Chart = Block.make(recipe.namespace, { key: chartKey, ...recipe.contract })
const props = {
  width: 600,
  height: 350,
  animationDuration: 0,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  children: [
    Scatter({
      dataKey: 'value',
      strokeWidth: 0,
      showActiveHighlight: false,
      yGradient: { from: 'black', to: 'green' },
    }),
    ChartTooltip(),
  ],
}
const inputs = recipe.inputs('geometry-scatter', props)
const Message = defineMessageUnion({ Focused: {} })
const parentKey = Symbol('GeometryScatterParent')
const effects = Block.makeEffectsContract<
  never,
  Block.FactsOf<typeof Chart>['programRequirements']
>()
const Parent = Block.make('GeometryScatterParent', {
  key: parentKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ chart: Chart.Model }),
  Message,
  view: { kind: 'Element' },
  effects,
})
const Binding = Parent.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['geometry-scatter', rows, recipe.configuration(props)] },
})
const Composition = Parent.makeComposition({ bindings: [Binding] })
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({ Focused: Binding.requestFocus({ index: 0 }) }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button([h.OnClick(Message.Focused())], ['Focus scatter']),
        h.section(
          [h.Style({ width: '600px', height: '350px' })],
          [
            h.block(
              Binding.embedView({
                slotId: 'scatter',
                model: model.chart,
                viewInputs: inputs,
              }),
            ),
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(Chart.makeLayer(recipe.plans(Chart))))
const container = document.querySelector<HTMLElement>('#style-contract-root')
if (container === null) throw new Error('Scatter fixture container required')
const runtime = Runtime.embed(
  Program.makeElement({ block: Parent, layer, container, devTools: false }),
)
window.addEventListener(
  'dispose-geometry-fixture',
  () => {
    void runtime.dispose()
  },
  { once: true },
)
