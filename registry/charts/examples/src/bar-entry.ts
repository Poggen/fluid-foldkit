import { barToolbar } from './bar-toolbar'
import { Boolean } from 'effect'
import { Number as EffectNumber } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  BarChart,
  Bar,
  BarSquares,
  BarColumnTrack,
  BarDepthProvider,
  BarDepthBack,
  BarDepthFront,
  BarPulse,
  BarXAxis,
  BarYAxis,
  YAxis,
  ChartTooltip,
  Grid,
  ChartConfigProvider,
  defaultChartEnvironment,
} from '@foldkit-visuals/charts/bar'
import type { BarChartProps, BarProps, BarLineCap } from '@foldkit-visuals/charts/bar'
import { PatternCircles } from '@foldkit-visuals/charts'
import type { PatternPresetId } from '@foldkit-visuals/charts'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const query = new URLSearchParams(window.location.search)
const matchCrosshair = query.has('matchCrosshair')
const axis70 = query
if (axis70.has('zero')) document.body.classList.add('[padding-left:240px]')
const axis70Margin = axis70.has('zero') ? { top: 0, right: 0, bottom: 0, left: 0 } : undefined
const axis70Formatter = (value: number) =>
  axis70.has('literal') ? `<b>&"long label ${value}</b>` : `$${value}`
const axisCase = query.get('axis')
const entranceCase = query.get('entrance')
const squareMode = query.get('squares')
const mixed = axisCase === 'mixed'
const namedAxes = mixed || axisCase === 'dual'
const hasSquares = squareMode !== null || mixed
const initialHorizontal = query.has('horizontal')
const initialStacked = query.has('stacked')
const track = query.has('track')
const depth = query.has('depth')
function numericOption(name: string, second = false): number | undefined {
  const raw = query.get(second ? `second${name[0]?.toUpperCase()}${name.slice(1)}` : name)
  if (raw === null) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}
function geometryOptions(
  second = false,
): Pick<BarProps, 'minBarHeight' | 'groupGap' | 'stackGap' | 'lineCap' | 'perspective'> {
  const minimum = numericOption('minimum', second)
  const gap = numericOption('gap', second)
  const stackGap = numericOption('stackGap', second)
  const raw = query.get(second ? 'secondRadius' : 'radius')
  const radius: BarLineCap | undefined =
    raw === 'round' || raw === 'butt' ? raw : numericOption('radius', second)
  return {
    ...(minimum === undefined ? {} : { minBarHeight: minimum }),
    ...(gap === undefined ? {} : { groupGap: gap }),
    ...(stackGap === undefined ? {} : { stackGap }),
    ...(radius === undefined ? {} : { lineCap: radius }),
    ...(query.has(second ? 'secondPerspective' : 'perspective') ? { perspective: true } : {}),
  }
}
const firstGeometry = geometryOptions()
const secondGeometry = geometryOptions(true)
const requestedBarWidth = numericOption('barWidth')
const pulseIndex = numericOption('pulse')
const decorations = [
  ...(pulseIndex === undefined
    ? []
    : [
        BarPulse({
          dataKey: 'revenue',
          activeIndex: pulseIndex,
          pulsePaused: query.has('pausePulse'),
        }),
      ]),
  ...(track ? [BarColumnTrack()] : []),
  ...(depth
    ? [
        BarDepthProvider({
          minBarHeight: numericOption('depthMinimum') ?? 0,
          ...(query.has('segments')
            ? {
                segmentsAccessor: (row: typeof Row.Type) => [
                  { value: row.revenue * 0.4, color: '#ff5500' },
                  { value: row.revenue * 0.6, color: '#2864e8' },
                ],
              }
            : {}),
        }),
        BarDepthBack({ dataKey: 'revenue' }),
        BarDepthFront({ dataKey: 'revenue' }),
      ]
    : []),
]
const showCompanion = query.has('two')
const variablePaint = query.has('variables')
function squarePreset(value: string | null): PatternPresetId {
  switch (value) {
    case 'none':
    case 'diagonal':
    case 'horizontal':
    case 'vertical':
    case 'cross':
    case 'dots':
    case 'circles':
    case 'accent':
      return value
    default:
      return 'dots'
  }
}
const preset = squareMode === 'none' ? 'none' : squarePreset(query.get('preset'))
const enterTransition = ((): BarChartProps<typeof Row.Type>['enterTransition'] => {
  switch (entranceCase) {
    case 'linear':
      return { type: 'tween', duration: 0.6, ease: 'linear' }
    case 'spring':
      return { type: 'spring', stiffness: 100, damping: 12 }
    case 'function':
      return { type: 'tween', duration: 0.6, ease: (progress: number) => progress * progress }
    default:
      return undefined
  }
})()
const barEntrance =
  entranceCase === 'none'
    ? { animate: false }
    : entranceCase === 'fade'
      ? { animationType: 'fade' as const }
      : {}
const environment = matchCrosshair
  ? ChartConfigProvider({
      value: { tooltipSpring: { stiffness: 40, damping: 12 } },
      children: (value) => value,
    })
  : defaultChartEnvironment

const Row = Schema.Struct({
  name: Schema.String,
  revenue: Schema.Finite,
  cost: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
})

const revenues =
  query.get('values') === 'small'
    ? [0, 0.01, 20, 80, 40, 100, 5]
    : query.get('values') === 'signed'
      ? [-20, 0, 10, 40, 80, 100, 5]
      : [120, 180, 150, 240, 210, 290, 180]
const data = Array.from({ length: query.has('many') ? 70 : revenues.length }, (_, index) => {
  const revenue = revenues[index % revenues.length] ?? 120

  return Row.make({ name: `Group ${index + 1}`, revenue, cost: revenue * (namedAxes ? 60 : 0.6) })
})

const root = BarChart({ name: 'bar-family', Row })
export const BarChartKey = Symbol('BarShowcaseChart')
const Chart = Block.make(root.namespace, { ...root.contract, key: BarChartKey })
const chartLayer = Chart.makeLayer(root.plans(Chart))

const props = {
  environment,
  xDataKey: 'name',
  missingValues: 'gap',
  width: axis70.has('zero') ? 400 : 640,
  height: axis70.has('zero') ? 240 : 320,
  ...(axis70Margin === undefined ? {} : { margin: axis70Margin }),
  animationDuration: 1100,
  orientation: initialHorizontal ? 'horizontal' : 'vertical',
  stacked: initialStacked,
  stackGap: numericOption('tooltipGap') ?? 0,
  ...(requestedBarWidth === undefined ? {} : { barWidth: requestedBarWidth }),
  ...(enterTransition === undefined ? {} : { enterTransition }),
  children: [
    Grid(),
    Bar({ ...barEntrance, dataKey: 'revenue', ...firstGeometry }),
    Bar({
      ...barEntrance,
      dataKey: 'cost',
      fill: 'rgb(30, 150, 90)',
      ...(namedAxes ? { yAxisId: 'right' } : {}),
      ...secondGeometry,
    }),
    initialHorizontal ? BarYAxis() : BarXAxis(),
    ...decorations,
    ...(namedAxes
      ? [
          YAxis({
            yAxisId: 'right',
            orientation: 'right',
            formatValue: axis70Formatter,
            ...(axis70.has('right') ? { orientation: 'right' } : {}),
          }),
        ]
      : []),
    ...(axisCase === 'both'
      ? [BarYAxis()]
      : axisCase === 'numeric'
        ? [
            YAxis({
              formatValue: axis70Formatter,
              ...(axis70.has('right') ? { orientation: 'right' } : {}),
            }),
          ]
        : []),
    ChartTooltip(matchCrosshair ? { matchCrosshair: true } : {}),
  ],
} satisfies BarChartProps<typeof Row.Type>

const inputs = root.inputs('native-bar', props)

const alternateInputs = root.inputs('native-bar', {
  ...props,
  orientation: initialHorizontal ? 'vertical' : 'horizontal',
  stacked: !initialStacked,
  stackGap: numericOption('tooltipGap') ?? 2,
  children: [
    Grid(),
    Bar({ ...barEntrance, dataKey: 'revenue', fill: 'navy', lineCap: 'butt', ...firstGeometry }),
    Bar({
      ...barEntrance,
      dataKey: 'cost',
      fill: 'rgb(30, 150, 90)',
      ...(namedAxes ? { yAxisId: 'right' } : {}),
      ...secondGeometry,
    }),
    initialHorizontal ? BarXAxis() : BarYAxis(),
    ...decorations,
    ChartTooltip(matchCrosshair ? { matchCrosshair: true } : {}),
  ],
})

function squareProps(
  alternate: boolean,
  gradient: boolean,
  companion: boolean,
): BarChartProps<typeof Row.Type> {
  const start = companion ? '#18a878' : '#ff5500'
  const end = companion ? '#c040df' : '#2864e8'
  const paintStart = variablePaint ? 'var(--bar-paint-start)' : start
  const paintEnd = variablePaint ? 'var(--bar-paint-end)' : end
  const patternId = companion ? 'bar-paint-companion' : 'bar-paint'
  const fill =
    squareMode === 'gradient' || squareMode === 'fallback' ? paintStart : `url(#${patternId})`
  const stops =
    squareMode === 'fallback'
      ? [{ offset: 50, color: 'orange' }]
      : [
          { offset: 0, color: paintStart },
          { offset: 100, color: paintEnd },
        ]
  let result: BarChartProps<typeof Row.Type> = {
    environment,
    xDataKey: 'name',
    missingValues: 'gap',
    animationDuration: 1100,
    ...(requestedBarWidth === undefined ? {} : { barWidth: requestedBarWidth }),
    children: [
      Grid(),
      PatternCircles({ id: patternId, width: 8, height: 8, radius: 2, fill: paintStart }),
      ...(mixed
        ? [Bar({ ...barEntrance, dataKey: 'revenue', ...firstGeometry })]
        : [
            BarSquares({
              dataKey: 'revenue',
              fill,
              stroke: start,
              useGradient: gradient,
              gradientStops: stops,
              patternPreset: preset,
              animate: entranceCase !== 'none',
            }),
          ]),
      BarSquares({
        dataKey: 'cost',
        fill: '#aaa',
        animate: entranceCase !== 'none',
        ...(namedAxes ? { yAxisId: 'right' } : {}),
      }),
      ...decorations,
      ...(namedAxes
        ? [
            YAxis({
              yAxisId: 'right',
              orientation: 'right',
              formatValue: axis70Formatter,
              ...(axis70.has('right') ? { orientation: 'right' } : {}),
            }),
          ]
        : []),
      initialHorizontal !== alternate ? BarYAxis() : BarXAxis(),
      ...(alternate || axisCase === null
        ? []
        : axisCase === 'both'
          ? [BarYAxis()]
          : [
              YAxis({
                formatValue: axis70Formatter,
                ...(axis70.has('right') ? { orientation: 'right' } : {}),
              }),
            ]),
      ChartTooltip(matchCrosshair ? { matchCrosshair: true } : {}),
    ],
  }
  if (enterTransition !== undefined) result = { ...result, enterTransition }
  result = {
    ...result,
    orientation: initialHorizontal !== alternate ? 'horizontal' : 'vertical',
    stacked: initialStacked !== alternate,
    stackGap: numericOption('tooltipGap') ?? (alternate ? 2 : 0),
  }
  if (variablePaint)
    result = { ...result, style: { '--bar-paint-start': start, '--bar-paint-end': end } }
  return result
}

function squareInputs(id: string, companion: boolean) {
  const normal = root.inputs(id, squareProps(false, true, companion))
  const plain = root.inputs(id, squareProps(false, false, companion))
  const horizontal = root.inputs(id, squareProps(true, true, companion))
  const horizontalPlain = root.inputs(id, squareProps(true, false, companion))
  return (alternate: boolean, gradient: boolean) => {
    if (alternate) return gradient ? horizontal : horizontalPlain
    return gradient ? normal : plain
  }
}
const primarySquareInputs = squareInputs('native-bar', false)
const companionSquareInputs = squareInputs('native-bar-companion', true)

const Model = Schema.Struct({
  chart: Chart.Model,
  companion: Chart.Model,
  isAlternate: Schema.Boolean,
  isMounted: Schema.Boolean,
  replay: Schema.Number,
  isGradient: Schema.Boolean,
  isNarrow: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedChangeOptions: {},
  ClickedFocus: {},
  ClickedClearFocus: {},
  ClickedUnmount: {},
  ClickedRemount: {},
  ClickedReplay: {},
  ClickedEmpty: {},
  ClickedRestore: {},
  ClickedMissingCosts: {},
  ClickedToggleGradient: {},
  ClickedResize: {},
})

export const BarFixtureKey = Symbol('BarShowcase')
export const BarFixtureBlock = Block.make('BarFixture', {
  key: BarFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const ChartBinding = BarFixtureBlock.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['native-bar', data, root.configuration(props)] },
})
const CompanionBinding = BarFixtureBlock.makeRequiredFieldBinding(Chart, {
  field: 'companion',
  init: { contextToArgs: () => ['native-bar-companion', data, root.configuration(props)] },
})

const BarFixtureComposition = BarFixtureBlock.makeComposition({
  bindings: [ChartBinding, CompanionBinding],
})
export type BarFixtureViewBuilder = Block.ViewBuilderFor<typeof BarFixtureComposition>

const layer = BarFixtureBlock.makeLayer({
  init: BarFixtureComposition.makeInit(() => ({
    model: {
      isAlternate: false,
      isMounted: true,
      replay: 0,
      isGradient: squareMode !== 'plain',
      isNarrow: false,
    },
  })),
  update: BarFixtureComposition.makeUpdate({
    ClickedChangeOptions: (model) => ({
      model: modifyFields(model, { isAlternate: Boolean.not }),
    }),
    ClickedToggleGradient: (model) => ({
      model: modifyFields(model, { isGradient: Boolean.not }),
    }),
    ClickedResize: (model) => ({ model: modifyFields(model, { isNarrow: Boolean.not }) }),
    ClickedFocus: ChartBinding.requestFocus({ index: 6 }),
    ClickedClearFocus: ChartBinding.requestFocus({ index: null }),
    ClickedUnmount: Update.combineSteps([
      ChartBinding.requestFocus({ index: null }),
      BarFixtureBlock.makeFieldsStep(() => ({ isMounted: () => false })),
    ]),
    ClickedRemount: BarFixtureBlock.makeFieldsStep(() => ({ isMounted: () => true })),
    ClickedReplay: (model) =>
      Update.combineSteps([
        BarFixtureBlock.makeFieldsStep(() => ({ replay: EffectNumber.increment })),
        ChartBinding.requestConfigure({
          configuration: {
            ...model.chart.configuration,
            revealSignature: String(model.replay + 1),
          },
        }),
        CompanionBinding.requestConfigure({
          configuration: {
            ...model.companion.configuration,
            revealSignature: String(model.replay + 1),
          },
        }),
      ])(model),
    ClickedEmpty: Update.combineSteps([
      ChartBinding.requestData({ data: [] }),
      CompanionBinding.requestData({ data: [] }),
    ]),
    ClickedRestore: Update.combineSteps([
      ChartBinding.requestData({ data }),
      CompanionBinding.requestData({ data }),
    ]),
    ClickedMissingCosts: ChartBinding.requestData({
      data: data.map((row, index) =>
        index === 1
          ? Row.make({ ...row, cost: null })
          : index === 2
            ? Row.make({ name: row.name, revenue: row.revenue })
            : index === 0
              ? Row.make({ ...row, cost: 0 })
              : row,
      ),
    }),
  }),
  view: BarFixtureComposition.makeView((model, h) =>
    h.div(
      [
        h.Class(
          '[line-height:1.5] [&_button]:[border:0_solid_var(--border)] [&_button]:bg-transparent',
        ),
      ],
      [
        barToolbar(Message, hasSquares, h),
        h.section(
          [
            h.Id('bar-fixture'),
            h.Class(
              !hasSquares ? 'w-[640px] h-[320px]' : model.isNarrow ? 'w-[420px]' : 'w-[640px]',
            ),
          ],
          [
            model.isMounted
              ? h.block(
                  ChartBinding.embedView({
                    slotId: 'bar',
                    model: model.chart,
                    viewInputs: !hasSquares
                      ? model.isAlternate
                        ? alternateInputs
                        : inputs
                      : primarySquareInputs(model.isAlternate, model.isGradient),
                  }),
                )
              : h.empty,
          ],
        ),
        hasSquares && showCompanion && model.isMounted
          ? h.section(
              [h.Id('bar-companion'), h.Class(model.isNarrow ? 'w-[420px]' : 'w-[640px]')],
              [
                h.block(
                  CompanionBinding.embedView({
                    slotId: 'companion',
                    model: model.companion,
                    viewInputs: companionSquareInputs(model.isAlternate, model.isGradient),
                  }),
                ),
              ],
            )
          : h.empty,
        h.output(
          [h.Id('state')],
          [
            `Ready ${model.chart.revealReady}; rows ${model.chart.data.length}; focus ${Option.getOrNull(model.chart.focusedIndex) ?? 'none'}; generation ${model.chart.generation}`,
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(chartLayer))

Runtime.run(
  Program.makeElement({
    block: BarFixtureBlock,
    layer,
    container: document.getElementById('root'),
  }),
)
