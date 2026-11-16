import { HeatmapChart, HeatmapCells } from '@foldkit-visuals/charts/heatmap'
import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const data = [
  {
    bin: 0,
    bins: Array.from({ length: 7 }, (_, row) => ({
      bin: row,
      count: row + 1,
      date: new Date(Date.UTC(2026, 10, 8 + row, 12)),
    })),
  },
]
const recipe = HeatmapChart({ name: 'visual-heatmap-loading' })
const ChartKey = Symbol('VisualHeatmapLoading')
const Chart = Block.make(recipe.namespace, { key: ChartKey, ...recipe.contract })
const inputs = recipe.inputs('visual-heatmap-loading', {
  data,
  status: 'loading',
  animate: true,
  binSize: 24,
  children: [HeatmapCells({ hideGhostCells: false })],
})
const Message = defineMessageUnion({ Removed: {} })
const Model = Schema.Struct({ chart: Chart.Model, mounted: Schema.Boolean })
type Model = typeof Model.Type
const effects = Block.makeEffectsContract<
  never,
  Block.FactsOf<typeof Chart>['programRequirements']
>()
const ParentKey = Symbol('VisualHeatmapLoadingParent')
const Parent = Block.make('VisualHeatmapLoadingParent', {
  key: ParentKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Element' },
})
const Binding = Parent.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['visual-heatmap-loading', data, recipe.configuration()] },
})
const Composition = Parent.makeComposition({ bindings: [Binding] })
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: { mounted: true } })),
  update: Composition.makeUpdate({
    Removed: Parent.makeFieldsStep(() => ({ mounted: () => false })),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button([h.OnClick(Message.Removed())], ['Dispose heatmap']),
        h.section(
          [h.Style({ width: '400px', height: '400px' })],
          [
            model.mounted
              ? h.block(
                  Binding.embedView({ slotId: 'chart', model: model.chart, viewInputs: inputs }),
                )
              : h.empty,
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(Chart.makeLayer(recipe.plans(Chart))))

export const mountHeatmapLoadingFixture = (container: HTMLElement) => {
  const runtime = Runtime.embed(
    Program.makeElement({ block: Parent, layer, container, devTools: false }),
  )
  window.addEventListener(
    'dispose-visual-fixture',
    () => {
      void runtime.dispose()
    },
    { once: true },
  )
}
