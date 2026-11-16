import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  Bar,
  BarChart,
  ChartTooltip,
  GaugeBlock,
  GaugeLayer,
  GaugeConfiguration,
  PieChart,
  PieSlice,
  SankeyChart,
  SankeyLink,
  SankeyNode,
} from '@foldkit-visuals/charts'
import type { PieChartProps, SankeyChartProps } from '@foldkit-visuals/charts'

const root = document.getElementById('style-contract-root')
if (!(root instanceof HTMLElement)) throw new Error('Missing source-restored motion fixture root')
const mode = root.dataset.fixture
const Row = Schema.Struct({ name: Schema.String, value: Schema.Finite })
const rows = [
  Row.make({ name: 'Alpha', value: 32 }),
  Row.make({ name: 'Beta', value: 48 }),
  Row.make({ name: 'Gamma', value: 24 }),
]
const bar = BarChart({ name: 'source-motion-bar', Row })
const sankey = SankeyChart({ name: 'source-motion-sankey' })
const PieRow = Schema.Struct({ label: Schema.String, value: Schema.Finite })
const pie = PieChart({ name: 'source-motion-pie', Row: PieRow })
const BarKey = Symbol('SourceMotionBar')
const SankeyKey = Symbol('SourceMotionSankey')
const PieKey = Symbol('SourceMotionPie')
const Bars = Block.make(bar.namespace, { key: BarKey, ...bar.contract })
const Sankey = Block.make(sankey.namespace, { key: SankeyKey, ...sankey.contract })
const Pie = Block.make(pie.namespace, { key: PieKey, ...pie.contract })
const barProps = {
  width: 640,
  height: 320,
  animationDuration: 0,
  children: [
    Bar({ dataKey: 'value' }),
    ChartTooltip({ boxSpringConfig: { stiffness: 100, damping: 20 } }),
  ],
}
const barInputs = bar.inputs('source-motion-bar', barProps)
const pieRows = Array.from({ length: 40 }, (_, index) => ({
  label: `Slice ${index}`,
  value: 10,
}))
const pieProps: PieChartProps = {
  data: pieRows,
  size: 300,
  innerRadius: 70,
  enterTransition: { type: 'tween', duration: 0 },
  children: pieRows.map((_, index) =>
    PieSlice({
      index,
      hoverEffect: index === 0 ? 'grow' : 'translate',
      hoverOffset: index === 33 ? 24 : 12,
      showGlow: false,
    }),
  ),
}
const leftInputs = pie.inputs('source-motion-left', pieProps)
const rightInputs = pie.inputs('source-motion-right', pieProps)
const sankeyProps: SankeyChartProps = {
  data: {
    nodes: [{ name: 'Source A' }, { name: 'Source B' }, { name: 'Target A' }, { name: 'Target B' }],
    links: [
      { source: 0, target: 2, value: 40 },
      { source: 1, target: 3, value: 30 },
    ],
  },
  aspectRatio: '2 / 1',
  animationDuration: 1000,
  margin: { top: 30, right: 100, bottom: 30, left: 100 },
  children: [SankeyNode(), SankeyLink()],
}
const Model = Schema.Struct({
  bars: Bars.Model,
  sankey: Sankey.Model,
  left: Pie.Model,
  right: Pie.Model,
  defaultGauge: GaugeBlock.Model,
  overrideGauge: GaugeBlock.Model,
  mounted: Schema.Boolean,
})
const Message = defineMessageUnion({
  FocusLeft: {},
  FocusRightGrow: {},
  ClearLeft: {},
  Dispose: {},
})
const ParentKey = Symbol('SourceRestoredChartMotion')
const Parent = Block.make('SourceRestoredChartMotion', {
  key: ParentKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects: Block.makeEffectsContract<never, Block.FactsOf<typeof Bars>['programRequirements']>(),
  view: { kind: 'Element' },
})
const BarBinding = Parent.makeRequiredFieldBinding(Bars, {
  field: 'bars',
  init: {
    contextToArgs: () => ['source-motion-bar', rows, bar.configuration(barProps)],
  },
})
const SankeyBinding = Parent.makeRequiredFieldBinding(Sankey, {
  field: 'sankey',
  init: { contextToArgs: () => ['source-motion-sankey'] },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(Sankey, {
    NodeHoverChanged: Parent.makeNoopStep,
    NodeHoverRequested: Parent.makeNoopStep,
  }),
})
const LeftBinding = Parent.makeRequiredFieldBinding(Pie, {
  field: 'left',
  init: {
    contextToArgs: () => ['source-motion-left', pieRows, pie.configuration(pieProps)],
  },
})
const RightBinding = Parent.makeRequiredFieldBinding(Pie, {
  field: 'right',
  init: {
    contextToArgs: () => ['source-motion-right', pieRows, pie.configuration(pieProps)],
  },
})
const gaugeConfiguration = GaugeConfiguration.make({
  value: 50,
  width: 300,
  height: 240,
  geometryScrubbing: true,
})
const DefaultGaugeBinding = Parent.makeRequiredFieldBinding(GaugeBlock, {
  field: 'defaultGauge',
  init: { contextToArgs: () => [gaugeConfiguration, 'source-default-gauge'] },
})
const OverrideGaugeBinding = Parent.makeRequiredFieldBinding(GaugeBlock, {
  field: 'overrideGauge',
  init: {
    contextToArgs: () => [{ ...gaugeConfiguration, className: 'static' }, 'source-override-gauge'],
  },
})
const Composition = Parent.makeComposition({
  bindings: [
    BarBinding,
    SankeyBinding,
    LeftBinding,
    RightBinding,
    DefaultGaugeBinding,
    OverrideGaugeBinding,
  ],
})
const sankeyInputs = sankey.inputs('source-motion-sankey', sankeyProps, {
  focusNode: (index) => SankeyBinding.requestFocus({ kind: 'node', index }),
  focusLink: (index) => SankeyBinding.requestFocus({ kind: 'link', index }),
})
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: { mounted: true } })),
  update: Composition.makeUpdate({
    FocusLeft: LeftBinding.requestControl(pie.configuration({ ...pieProps, hoveredIndex: 33 })),
    FocusRightGrow: RightBinding.requestControl(
      pie.configuration({ ...pieProps, hoveredIndex: 0 }),
    ),
    ClearLeft: LeftBinding.requestControl(pie.configuration({ ...pieProps, hoveredIndex: null })),
    Dispose: Parent.makeFieldsStep(() => ({ mounted: () => false })),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.nav(
          [],
          [
            h.button([h.OnClick(Message.FocusLeft())], ['Translate slice 33 on left']),
            h.button([h.OnClick(Message.FocusRightGrow())], ['Grow slice 0 on right']),
            h.button([h.OnClick(Message.ClearLeft())], ['Clear left selection']),
            h.button([h.OnClick(Message.Dispose())], ['Dispose charts']),
          ],
        ),
        ...(model.mounted && mode === 'utility'
          ? [
              h.section(
                [h.Id('motion-gauge-default')],
                [
                  h.block(
                    DefaultGaugeBinding.embedView({
                      slotId: 'default-gauge',
                      model: model.defaultGauge,
                      viewInputs: {},
                    }),
                  ),
                ],
              ),
              h.section(
                [h.Id('motion-gauge-override')],
                [
                  h.block(
                    OverrideGaugeBinding.embedView({
                      slotId: 'override-gauge',
                      model: model.overrideGauge,
                      viewInputs: {},
                    }),
                  ),
                ],
              ),
            ]
          : []),
        ...(model.mounted && mode === 'tooltip'
          ? [
              h.section(
                [h.Id('motion-bar-stage'), h.Style({ width: '640px', height: '320px' })],
                [
                  h.block(
                    BarBinding.embedView({
                      slotId: 'bars',
                      model: model.bars,
                      viewInputs: barInputs,
                    }),
                  ),
                ],
              ),
            ]
          : []),
        ...(model.mounted && mode === 'sankey'
          ? [
              h.section(
                [h.Id('motion-sankey-stage'), h.Style({ width: '800px', height: '400px' })],
                [
                  h.block(
                    SankeyBinding.embedView({
                      slotId: 'sankey',
                      model: model.sankey,
                      viewInputs: sankeyInputs,
                    }),
                  ),
                ],
              ),
            ]
          : []),
        ...(model.mounted && mode === 'pie'
          ? [
              h.div(
                [h.Style({ display: 'flex', gap: '40px' })],
                [
                  h.section(
                    [h.Id('motion-pie-left'), h.Style({ width: '300px', height: '300px' })],
                    [
                      h.block(
                        LeftBinding.embedView({
                          slotId: 'left',
                          model: model.left,
                          viewInputs: leftInputs,
                        }),
                      ),
                    ],
                  ),
                  h.section(
                    [h.Id('motion-pie-right'), h.Style({ width: '300px', height: '300px' })],
                    [
                      h.block(
                        RightBinding.embedView({
                          slotId: 'right',
                          model: model.right,
                          viewInputs: rightInputs,
                        }),
                      ),
                    ],
                  ),
                ],
              ),
            ]
          : []),
      ],
    ),
  ),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      Bars.makeLayer(bar.plans(Bars)),
      Sankey.makeLayer(sankey.plans(Sankey)),
      Pie.makeLayer(pie.plans(Pie)),
      GaugeLayer,
    ),
  ),
)
const runtime = Runtime.embed(
  Program.makeElement({ block: Parent, layer, container: root, devTools: false }),
)
window.addEventListener('dispose-source-motion-fixture', () => void runtime.dispose(), {
  once: true,
})
