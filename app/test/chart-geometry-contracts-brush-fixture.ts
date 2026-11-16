import { Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Area, ChartBrush } from '../../registry/charts/src/index'
const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })
const rows = [0, 1, 2].map((day) =>
  Row.make({ date: new Date(day * 86_400_000), value: (day + 1) * 10 }),
)
const recipe = ChartBrush({ name: 'browser-geometry-brush', Row })
const childKey = Symbol('GeometryBrush')
const Brush = Block.make(recipe.namespace, { key: childKey, ...recipe.contract })
const plot = { height: 80, animationDuration: 0, children: [Area({ dataKey: 'value' })] }
const brush = { initialSelection: { start: new Date(0), end: new Date(86_400_000) } }
const inputs = recipe.inputs(recipe.plot('geometry-brush-strip', plot, brush))
const Message = defineMessageUnion({ Resized: {}, Selected: {} })
const parentKey = Symbol('GeometryBrushParent')
const effects = Block.makeEffectsContract<
  never,
  Block.FactsOf<typeof Brush>['programRequirements']
>()
const Parent = Block.make('GeometryBrushParent', {
  key: parentKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ brush: Brush.Model, width: Schema.Finite }),
  Message,
  view: { kind: 'Element' },
  effects,
})
const Binding = Parent.makeRequiredFieldBinding(Brush, {
  field: 'brush',
  init: {
    contextToArgs: () => [
      'geometry-brush',
      rows,
      recipe.configuration({ enabled: true }, plot, brush),
    ],
  },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(Brush, {
    SelectionObserved: Parent.makeNoopStep,
    ViewportChanged: Parent.makeNoopStep,
  }),
})
const Composition = Parent.makeComposition({ bindings: [Binding] })
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: { width: 400 } })),
  update: Composition.makeUpdate({
    Resized: Parent.makeFieldsStep(() => ({ width: () => 600 })),
    Selected: Binding.requestSelection({
      range: Option.some({ start: 86_400_000, end: 172_800_000 }),
    }),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button([h.OnClick(Message.Resized())], ['Resize brush']),
        h.button([h.OnClick(Message.Selected())], ['Select brush']),
        h.output(
          [h.DataAttribute('brush-selection', '')],
          [
            Option.match(model.brush.brushSelection, {
              onNone: () => '',
              onSome: (range) => `${range.start}:${range.end}`,
            }),
          ],
        ),
        h.section(
          [h.Style({ width: `${model.width}px` })],
          [h.block(Binding.embedView({ slotId: 'brush', model: model.brush, viewInputs: inputs }))],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(Brush.makeLayer(recipe.plans(Brush))))
const container = document.querySelector<HTMLElement>('#style-contract-root')
if (container === null) throw new Error('Brush fixture container required')
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
