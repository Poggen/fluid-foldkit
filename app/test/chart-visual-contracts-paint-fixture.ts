import { Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  Bar,
  BarSquares,
  BarChart,
  ChartTooltip,
  Line,
  LineChart,
  ChartMarkers,
  MarkerGroup,
} from '@foldkit-visuals/charts'
import type { BarChartProps, ChartTooltipProps, TimeSeriesProps } from '@foldkit-visuals/charts'

const Row = Schema.Struct({ name: Schema.String, a: Schema.Finite, b: Schema.Finite })
const rows = [Row.make({ name: 'A', a: 32, b: 18 }), Row.make({ name: 'B', a: -10, b: 48 })]
const bars = BarChart({ name: 'visual-bar-paint', Row })
const BarKey = Symbol('VisualBarPaint')
const BarBlock = Block.make(bars.namespace, { key: BarKey, ...bars.contract })
const TimeRow = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })
const timeRows = [
  TimeRow.make({ date: new Date(0), value: 20 }),
  TimeRow.make({ date: new Date(1000), value: 50 }),
  TimeRow.make({ date: new Date(2000), value: 30 }),
]
const lines = LineChart({ name: 'visual-line-paint', Row: TimeRow })
const LineKey = Symbol('VisualLinePaint')
const LineBlock = Block.make(lines.namespace, { key: LineKey, ...lines.contract })
const paints = [
  { fill: 'url(#external-paint)', stroke: '#ff5500' },
  { fill: 'blue', stroke: '#ff5500' },
  { fill: 'blue' },
  { fill: 'blue', stroke: '' },
  { fill: '', stroke: '' },
]
const lineOptions: ReadonlyArray<ChartTooltipProps<typeof TimeRow.Type>> = [
  { indicatorFadeEdges: 'top', indicatorFadeLength: 25 },
  { indicatorFadeEdges: 'bottom', indicatorFadeLength: 90 },
  { indicatorFadeEdges: 'both', indicatorFadeLength: 0 },
  { indicatorFadeEdges: 'none' },
  { indicatorFadeEdges: 'top', indicatorDasharray: '6,4' },
]
const barProps = (
  paint: number,
  ring: boolean,
  override: boolean,
): BarChartProps<typeof Row.Type> => ({
  width: 640,
  height: 320,
  animationDuration: 0,
  children: [
    Bar({ dataKey: 'a', ...paints[paint] }),
    BarSquares({
      dataKey: 'b',
      ...paints[paint],
      ...(paint === 0 ? { fill: 'blue', stroke: '#00aa88' } : {}),
    }),
    ChartTooltip({
      dotVariant: ring ? 'ring' : 'dot',
      ...(override ? { dotColor: '#123456' } : {}),
    }),
  ],
})
const lineProps = (mode: number, loading: boolean): TimeSeriesProps<typeof TimeRow.Type> => ({
  width: 640,
  height: 320,
  animationDuration: 0,
  status: loading ? 'loading' : 'ready',
  loadingLabel: 'A😀B',
  style: { '--chart-crosshair': 'rgb(29, 73, 111)' },
  children: [
    Line({ dataKey: 'value' }),
    ChartTooltip({ showDatePill: false, ...lineOptions[mode] }),
    ChartMarkers({
      maxFanned: 1,
      items: [
        { date: new Date(1000), title: 'First', icon: 'A' },
        { date: new Date(0), title: 'Earlier date seen second', icon: 'B' },
        { date: new Date(1000), title: 'Second same-date event', icon: 'C' },
      ],
    }),
    MarkerGroup({
      markers: [{ date: new Date(0), title: 'Standalone group', icon: 'D' }],
      showLine: false,
    }),
  ],
})
const barInputs = Array.from({ length: 20 }, (_, index) =>
  bars.inputs('visual-bar', barProps(index % 5, Math.floor(index / 5) % 2 === 1, index >= 10)),
)
const lineInputs = Array.from({ length: 10 }, (_, index) =>
  lines.inputs('visual-line', lineProps(index % 5, index >= 5)),
)
const Message = defineMessageUnion({
  NextPaint: {},
  ToggleRing: {},
  OverrideDot: {},
  NextLine: {},
  ShowLoading: {},
  FocusBar: {},
  FocusLine: {},
  ClearBar: {},
})
const Model = Schema.Struct({
  bar: BarBlock.Model,
  line: LineBlock.Model,
  paint: Schema.Int,
  ring: Schema.Boolean,
  override: Schema.Boolean,
  lineMode: Schema.Int,
  loading: Schema.Boolean,
})
type Model = typeof Model.Type
const effects = Block.makeEffectsContract<
  never,
  | Block.FactsOf<typeof BarBlock>['programRequirements']
  | Block.FactsOf<typeof LineBlock>['programRequirements']
>()
const ParentKey = Symbol('ChartVisualPaintParent')
const Parent = Block.make('ChartVisualPaintParent', {
  key: ParentKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Element' },
})
const BarBinding = Parent.makeRequiredFieldBinding(BarBlock, {
  field: 'bar',
  init: {
    contextToArgs: () => ['visual-bar', rows, bars.configuration(barProps(0, false, false))],
  },
})
const LineBinding = Parent.makeRequiredFieldBinding(LineBlock, {
  field: 'line',
  init: {
    contextToArgs: () => ['visual-line', timeRows, lines.configuration(lineProps(0, false))],
  },
})
const Composition = Parent.makeComposition({ bindings: [BarBinding, LineBinding] })
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({
    model: { paint: 0, ring: false, override: false, lineMode: 0, loading: false },
  })),
  update: Composition.makeUpdate({
    NextPaint: Parent.makeFieldsStep(() => ({ paint: (value) => (value + 1) % 5 })),
    ToggleRing: Parent.makeFieldsStep(() => ({ ring: (value) => !value })),
    OverrideDot: Parent.makeFieldsStep(() => ({ override: () => true })),
    NextLine: Parent.makeFieldsStep(() => ({ lineMode: (value) => (value + 1) % 5 })),
    ShowLoading: Parent.makeStep(() =>
      Update.combineSteps([
        Parent.makeFieldsStep(() => ({ loading: () => true })),
        LineBinding.requestConfigure({ configuration: lines.configuration(lineProps(0, true)) }),
      ]),
    ),
    FocusBar: BarBinding.requestFocus({ index: 1, seriesIndex: null }),
    ClearBar: BarBinding.requestFocus({ index: null, seriesIndex: null }),
    FocusLine: LineBinding.requestFocus({ index: 0, seriesIndex: null }),
  }),
  view: Composition.makeView((model, h) => {
    const barInput = barInputs[model.paint + (model.ring ? 5 : 0) + (model.override ? 10 : 0)]
    const lineInput = lineInputs[model.lineMode + (model.loading ? 5 : 0)]
    if (barInput === undefined || lineInput === undefined)
      throw new Error('Invalid visual fixture input mode')
    return h.div(
      [],
      [
        h.button([h.OnClick(Message.NextPaint())], ['Next bar paint']),
        h.button([h.OnClick(Message.ToggleRing())], ['Toggle ring']),
        h.button([h.OnClick(Message.OverrideDot())], ['Override dot color']),
        h.button([h.OnClick(Message.NextLine())], ['Next crosshair paint']),
        h.button([h.OnClick(Message.FocusBar())], ['Focus bar']),
        h.button([h.OnClick(Message.ClearBar())], ['Clear bar']),
        h.button([h.OnClick(Message.FocusLine())], ['Focus line']),
        h.button([h.OnClick(Message.ShowLoading())], ['Show loading label']),
        h.output(
          [h.Id('visual-paint-state')],
          [
            `${model.paint}:${model.lineMode}:${model.ring}:${model.loading}:${model.line.configuration.status}:${model.line.phase}:${model.line.phaseClockReady}`,
          ],
        ),
        h.section(
          [h.Id('bar-section'), h.Style({ width: '640px', height: '320px' })],
          [
            h.svg(
              [h.Width('0'), h.Height('0')],
              [
                h.defs(
                  [],
                  [
                    h.linearGradient(
                      [h.Id('external-paint')],
                      [
                        h.stop([h.Offset('0%'), h.StopColor('red')]),
                        h.stop([h.Offset('100%'), h.StopColor('blue')]),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            h.block(
              BarBinding.embedView({
                slotId: 'bar',
                model: model.bar,
                viewInputs: barInput,
              }),
            ),
          ],
        ),
        h.section(
          [h.Id('line-section'), h.Style({ width: '640px', height: '320px' })],
          [
            h.block(
              LineBinding.embedView({
                slotId: 'line',
                model: model.line,
                viewInputs: lineInput,
              }),
            ),
          ],
        ),
      ],
    )
  }),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      BarBlock.makeLayer(bars.plans(BarBlock)),
      LineBlock.makeLayer(lines.plans(LineBlock)),
    ),
  ),
)
const container = document.getElementById('style-contract-root')
if (!(container instanceof HTMLElement)) throw new Error('Missing chart visual paint root')
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
