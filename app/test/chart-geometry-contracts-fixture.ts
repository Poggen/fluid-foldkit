import { Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Bar, BarChart, BarPulse } from '../../registry/charts/src/index'
import type { BarChartProps } from '../../registry/charts/src/index'

const Row = Schema.Struct({ name: Schema.String, value: Schema.Finite, other: Schema.Finite })
const first = Row.make({ name: 'A', value: 37, other: 11 })
const second = Row.make({ name: 'B', value: 91, other: 23 })
const rows = [first, second]
const recipe = BarChart({ name: 'browser-geometry-contract', Row })
const chartKey = Symbol('GeometryChart')
const Chart = Block.make(recipe.namespace, { key: chartKey, ...recipe.contract })
const Mode = Schema.Literals(['initial', 'patched', 'horizontal'])
type Mode = typeof Mode.Type
const options = (mode: Mode, generation: number): BarChartProps<typeof Row.Type> => ({
  width: 643.25,
  height: 321.75,
  barGap: 0,
  barWidth: mode === 'patched' ? 170.12345 : 51.98765,
  margin: {
    top: 17.125,
    right: 29.375,
    bottom: 31.625,
    left: mode === 'patched' ? 11.98765 : 25.23456,
  },
  animationDuration: 2200,
  enterTransition: { duration: 2, ease: 'linear' },
  revealSignature: String(generation),
  orientation: mode === 'horizontal' ? 'horizontal' : 'vertical',
  stacked: mode === 'horizontal',
  children: [
    Bar({ dataKey: 'value', fill: 'rgb(17, 83, 149)', lineCap: 3.123456, staggerDelay: 0 }),
    BarPulse({ dataKey: 'value', activeIndex: 0 }),
    ...(mode === 'horizontal'
      ? [Bar({ dataKey: 'other', fill: 'rgb(173, 61, 29)', lineCap: 3.123456, staggerDelay: 0 })]
      : []),
  ],
})
const inputs = {
  initial: recipe.inputs('precision-owner', options('initial', 0)),
  patched: recipe.inputs('precision-owner', options('patched', 0)),
  horizontal: recipe.inputs('precision-owner', options('horizontal', 0)),
}
const neighborInputs = recipe.inputs('precision-neighbor', {
  ...options('initial', 0),
  animationDuration: 0,
})
const Message = defineMessageUnion({ Patched: {}, Replayed: {}, Horizontal: {}, Removed: {} })
const parentKey = Symbol('GeometryParent')
const effects = Block.makeEffectsContract<
  never,
  Block.FactsOf<typeof Chart>['programRequirements']
>()
const Parent = Block.make('GeometryParent', {
  key: parentKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    chart: Chart.Model,
    neighbor: Chart.Model,
    mode: Mode,
    generation: Schema.Int,
    mounted: Schema.Boolean,
  }),
  Message,
  view: { kind: 'Element' },
  effects,
})
const Binding = Parent.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: {
    contextToArgs: () => ['precision-owner', rows, recipe.configuration(options('initial', 0))],
  },
})
const Neighbor = Parent.makeRequiredFieldBinding(Chart, {
  field: 'neighbor',
  init: {
    contextToArgs: () => [
      'precision-neighbor',
      rows,
      recipe.configuration({ ...options('initial', 0), animationDuration: 0 }),
    ],
  },
})
const Composition = Parent.makeComposition({ bindings: [Binding, Neighbor] })
const { makeStep, makeFieldsStep } = Parent
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: { mode: 'initial', generation: 0, mounted: true } })),
  update: Composition.makeUpdate({
    Patched: makeStep(() =>
      Update.combineSteps([
        makeFieldsStep(() => ({ mode: () => 'patched' })),
        Binding.requestData({ data: [Row.make({ name: 'A', value: 63, other: 11 }), second] }),
      ]),
    ),
    Replayed: makeStep((model) =>
      Update.combineSteps([
        makeFieldsStep(() => ({ generation: (value) => value + 1 })),
        Binding.requestConfigure({
          configuration: recipe.configuration(options(model.mode, model.generation + 1)),
        }),
      ]),
    ),
    Horizontal: makeStep((model) =>
      Update.combineSteps([
        makeFieldsStep(() => ({ mode: () => 'horizontal', generation: (value) => value + 1 })),
        Binding.requestData({ data: rows }),
        Binding.requestConfigure({
          configuration: recipe.configuration(options('horizontal', model.generation + 1)),
        }),
      ]),
    ),
    Removed: makeFieldsStep(() => ({ mounted: () => false })),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button([h.OnClick(Message.Patched())], ['Patch']),
        h.button([h.OnClick(Message.Replayed())], ['Replay']),
        h.button([h.OnClick(Message.Horizontal())], ['Horizontal']),
        h.button([h.OnClick(Message.Removed())], ['Remove']),
        h.output([h.DataAttribute('geometry-state', '')], [`${model.mode}:${model.generation}`]),
        h.section(
          [h.Style({ width: '643.25px', height: '321.75px' })],
          [
            model.mounted
              ? h.block(
                  Binding.embedView({
                    slotId: 'chart',
                    model: model.chart,
                    viewInputs: inputs[model.mode],
                  }),
                )
              : h.empty,
          ],
        ),
        h.section(
          [h.Style({ width: '643.25px', height: '321.75px' })],
          [
            h.block(
              Neighbor.embedView({
                slotId: 'neighbor',
                model: model.neighbor,
                viewInputs: neighborInputs,
              }),
            ),
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(Chart.makeLayer(recipe.plans(Chart))))
const container = document.querySelector<HTMLElement>('#style-contract-root')
if (container === null) throw new Error('Geometry fixture container required')
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
