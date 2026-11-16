import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { Background, Line, LineChart } from '../../registry/charts/src/index'
const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })
const rows = [10, 20].map((value, index) => Row.make({ date: new Date(index * 86_400_000), value }))
const recipe = LineChart({ name: 'browser-geometry-background', Row })
const chartKey = Symbol('GeometryBackground')
const Chart = Block.make(recipe.namespace, { key: chartKey, ...recipe.contract })
const common = {
  width: 320,
  height: 180,
  animationDuration: 0,
  children: [
    Background({ pattern: 'dots', color: 'red', fadeHorizontalLength: 60, fadeVertical: false }),
    Line({ dataKey: 'value' }),
  ],
}
const loading: typeof common & { readonly status: 'loading' } = { ...common, status: 'loading' }
const readyInputs = recipe.inputs('background-ready', common)
const loadingInputs = recipe.inputs('background-loading', loading)
const parentKey = Symbol('GeometryBackgroundParent')
const effects = Block.makeEffectsContract<
  never,
  Block.FactsOf<typeof Chart>['programRequirements']
>()
const Parent = Block.make('GeometryBackgroundParent', {
  key: parentKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ ready: Chart.Model, loading: Chart.Model }),
  Message: Schema.Never,
  view: { kind: 'Element' },
  effects,
})
const Ready = Parent.makeRequiredFieldBinding(Chart, {
  field: 'ready',
  init: { contextToArgs: () => ['background-ready', rows, recipe.configuration(common)] },
})
const Loading = Parent.makeRequiredFieldBinding(Chart, {
  field: 'loading',
  init: { contextToArgs: () => ['background-loading', rows, recipe.configuration(loading)] },
})
const Composition = Parent.makeComposition({ bindings: [Ready, Loading] })
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.section(
          [h.Style({ width: '320px', height: '180px' })],
          [
            h.block(
              Ready.embedView({ slotId: 'ready', model: model.ready, viewInputs: readyInputs }),
            ),
          ],
        ),
        h.section(
          [h.Style({ width: '320px', height: '180px' })],
          [
            h.block(
              Loading.embedView({
                slotId: 'loading',
                model: model.loading,
                viewInputs: loadingInputs,
              }),
            ),
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(Chart.makeLayer(recipe.plans(Chart))))
const container = document.querySelector<HTMLElement>('#style-contract-root')
if (container === null) throw new Error('Background fixture container required')
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
