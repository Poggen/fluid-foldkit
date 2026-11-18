import { lineAreaToolbar } from './line-area-toolbar'
import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { DateTime, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  AreaChart,
  ChartTooltip,
  Grid,
  Line,
  Area,
  XAxis,
  YAxis,
  LineChart,
} from '@foldkit-visuals/charts/line'
import type {
  CartesianLayer,
  ChartContextRenderer,
  ChartTooltipProps,
} from '@foldkit-visuals/charts/line'
import {
  PublicLoadingSegmentConsumerBlock,
  PublicLoadingSegmentConsumerLayer,
  LoadingSegmentFlags,
  loadingSegmentFlags,
} from './loading-segment-consumer'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  revenue: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  cost: Schema.Finite,
})

const showcaseOptions = new URLSearchParams(location.search)

const values = showcaseOptions.has('dense')
  ? Array.from({ length: 64 }, (_, index) => 120 + ((index * 37) % 170))
  : [120, 180, 150, 240, 210, 290, 180]

const data = values.map((revenue, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2025, 0, index + 1))),
    revenue,
    cost: revenue * 0.6,
  }),
)

const updatedData = data.map((row, index) =>
  index === 2 ? Row.make({ ...row, revenue: 190 }) : row,
)

const missingAreaData = data.map((row, index) => {
  if (index === 2) {
    return Row.make({ ...row, revenue: null })
  }

  return index === 4 ? Row.make({ date: row.date, cost: row.cost }) : row
})

const primaryArea = showcaseOptions.get('primary') === 'area'

const line = primaryArea
  ? AreaChart({ name: 'area-primary-family', Row })
  : LineChart({ name: 'line-family', Row })

const area = AreaChart({ name: 'area-family', Row })

export const LineChartKey = Symbol('LineAreaPrimary')

export const AreaChartKey = Symbol('LineAreaSecondary')

const LineBlock = Block.make(line.namespace, { key: LineChartKey, ...line.contract })

const AreaBlock = Block.make(area.namespace, { key: AreaChartKey, ...area.contract })

const chartLayers = Layer.mergeAll(
  LineBlock.makeLayer(line.plans(LineBlock)),
  AreaBlock.makeLayer(area.plans(AreaBlock)),
  PublicLoadingSegmentConsumerLayer,
)

const defaultPhase = (phase: string) =>
  document.dispatchEvent(
    new CustomEvent('fixture-phase', { detail: { variant: 'default', phase } }),
  )

const alternatePhase = (phase: string) =>
  document.dispatchEvent(
    new CustomEvent('fixture-phase', { detail: { variant: 'alternate', phase } }),
  )

const pulseCycle = () => {
  document.documentElement.dataset.pulseCycles = String(
    Number(document.documentElement.dataset.pulseCycles ?? '0') + 1,
  )
}

const showHighlight = !showcaseOptions.has('noHighlight')

type TooltipOptions = ChartTooltipProps<typeof Row.Type>

const CrosshairMode = Schema.Literals(['top', 'bottom', 'both', 'none', 'dashed'])
const crosshairCases: Readonly<Record<typeof CrosshairMode.Type, TooltipOptions>> = {
  top: { indicatorFadeEdges: 'top', indicatorFadeLength: 25 },
  bottom: { indicatorFadeEdges: 'bottom', indicatorFadeLength: 90 },
  both: { indicatorFadeEdges: 'both', indicatorFadeLength: 0 },
  none: { indicatorFadeEdges: 'none' },
  dashed: { indicatorFadeEdges: 'top', indicatorFadeLength: 25, indicatorDasharray: '6,4' },
}
const crosshairMode = Schema.decodeUnknownOption(CrosshairMode)(
  showcaseOptions.get('crosshairFade'),
)
const crosshairOptions = Option.match(crosshairMode, {
  onNone: () => ({}) satisfies TooltipOptions,
  onSome: (mode) => crosshairCases[mode],
})

type TooltipPoint = Parameters<NonNullable<TooltipOptions['rows']>>[0]

const readTooltipRow = Schema.decodeUnknownSync(Schema.toType(Row))

const indicatorColor = (point: TooltipPoint) =>
  (readTooltipRow(point).revenue ?? 0) >= 200 ? 'rgb(200, 0, 100)' : 'rgb(0, 100, 220)'

const makeTooltipOptions: () => TooltipOptions = () => {
  let tooltipOptions: TooltipOptions = crosshairOptions

  if (showcaseOptions.has('indicatorColor')) {
    tooltipOptions = { ...tooltipOptions, indicatorColor }
  }

  if (showcaseOptions.has('dotColor')) {
    tooltipOptions = { ...tooltipOptions, dotColor: indicatorColor }
  }

  if (showcaseOptions.has('dotRing')) {
    tooltipOptions = {
      ...tooltipOptions,
      dotVariant: 'ring',
      dotSize: 7,
      dotScale: 1.4,
      dotRadiusFraction: 0.12,
      dotStrokeWidth: 3,
    }
  }

  if (showcaseOptions.has('dotRows')) {
    tooltipOptions = {
      ...tooltipOptions,
      rows: (point: TooltipPoint) => [
        {
          color: 'rgb(30, 150, 80)',
          label: 'Revenue',
          value: readTooltipRow(point).revenue ?? 'Missing',
        },
      ],
    }
  }

  return tooltipOptions
}

const tooltipLayers = showcaseOptions.has('noTooltip')
  ? []
  : [ChartTooltip<typeof Row.Type>(makeTooltipOptions())]

const entrance = showcaseOptions.has('enterTransition')
  ? { enterTransition: { type: 'tween', duration: 0.6, delay: 0.2, ease: 'linear' } }
  : {}

const contextReadout: ChartContextRenderer<typeof Row.Type> = (context, h) =>
  h.output([h.Id('line-context')], [`${context.stable.chartStatus}/${context.stable.chartPhase}`])

const lineProps = {
  ...entrance,
  onPhaseChange: defaultPhase,
  animationDuration: 1100,
  children: [
    Grid({ horizontal: true }),
    primaryArea
      ? Area({ dataKey: 'revenue', showMarkers: true, showHighlight })
      : Line({
          dataKey: 'revenue',
          showMarkers: true,
          showHighlight,
          onLoadingPulseCycleComplete: pulseCycle,
        }),
    XAxis(),
    YAxis(),
    ...tooltipLayers,
  ],
}

const areaProps = {
  ...entrance,
  ...lineProps,
  children: [
    Grid({ horizontal: true }),
    Area({ dataKey: 'revenue', fill: 'var(--chart-1)', showHighlight }),
    XAxis(),
    YAxis(),
    ...tooltipLayers,
  ],
}

const Model = Schema.Struct({
  line: LineBlock.Model,
  area: AreaBlock.Model,
  loadingExample: PublicLoadingSegmentConsumerBlock.Model,
  isAlternate: Schema.Boolean,
  isAreaMissing: Schema.Boolean,
  isSweep: Schema.Boolean,
  isMounted: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedLoading: {},
  ClickedShrink: {},
  ClickedReset: {},
  ClickedReplay: {},
  ClickedFocus: {},
  ClickedRestore: {},
  ClickedClear: {},
  ClickedZoomed: {},
  ClickedUnzoomed: {},
  ClickedChangeInputs: {},
  ClickedChangeSweep: {},
  ClickedValues: {},
  ClickedToggleAreaMissing: {},
  ClickedToggleMount: {},
})

export const LineAreaFixtureKey = Symbol('LineAreaFixture')

export const LineAreaFixtureBlock = Block.make('LineAreaFixture', {
  key: LineAreaFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([LoadingSegmentFlags]),
  view: { kind: 'Element' },
})

const LineBinding = LineAreaFixtureBlock.makeRequiredFieldBinding(LineBlock, {
  field: 'line',
  init: { contextToArgs: () => ['native-line', data, line.configuration(lineProps)] },
})

const AreaBinding = LineAreaFixtureBlock.makeRequiredFieldBinding(AreaBlock, {
  field: 'area',
  init: { contextToArgs: () => ['native-area', data, area.configuration(areaProps)] },
})

const LoadingExampleBinding = LineAreaFixtureBlock.makeRequiredFieldBinding(
  PublicLoadingSegmentConsumerBlock,
  {
    field: 'loadingExample',
    init: { contextToArgs: (flags: typeof LoadingSegmentFlags.Type) => [flags] },
  },
)

const LineAreaFixtureComposition = LineAreaFixtureBlock.makeComposition({
  bindings: [LineBinding, AreaBinding, LoadingExampleBinding],
})
export type LineAreaFixtureViewBuilder = Block.ViewBuilderFor<typeof LineAreaFixtureComposition>

const lineInputs = line.inputs(
  'native-line',
  showcaseOptions.has('context') ? { ...lineProps, renderContext: contextReadout } : lineProps,
)

const areaInputs = area.inputs('native-area', areaProps)

const alternateProps = {
  ...lineProps,
  loadingLabel: 'Updating chart',
  onPhaseChange: alternatePhase,
  style: { backgroundColor: 'rgb(240, 245, 250)' },
  children: [
    Grid({ horizontal: true }),
    Line({ dataKey: 'cost', stroke: 'rgb(20, 110, 180)' }),
    XAxis(),
    YAxis(),
    ChartTooltip<typeof Row.Type>({ ...crosshairOptions, showDatePill: false }),
  ],
}

const alternateInputs = line.inputs('native-line', alternateProps)

const sweepChildren = (children: ReadonlyArray<CartesianLayer<typeof Row.Type>>) =>
  children.map((child) =>
    child.kind === 'line' ? Line({ ...child.props, loadingStyle: 'sweep' }) : child,
  )

const sweepInputs = line.inputs('native-line', {
  ...lineProps,
  children: sweepChildren(lineProps.children),
})

const alternateSweepInputs = line.inputs('native-line', {
  ...alternateProps,
  children: sweepChildren(alternateProps.children),
})

const layer = LineAreaFixtureBlock.makeLayer({
  init: LineAreaFixtureComposition.makeInit((flags: typeof LoadingSegmentFlags.Type) => ({
    childInitContext: flags,
    model: { isAlternate: false, isAreaMissing: false, isSweep: false, isMounted: true },
  })),
  update: LineAreaFixtureComposition.makeUpdate({
    ClickedToggleAreaMissing: LineAreaFixtureBlock.makeStep((model) =>
      Update.combineSteps([
        AreaBinding.requestData({ data: model.isAreaMissing ? data : missingAreaData }),
        LineAreaFixtureBlock.makeFieldsStep(() => ({ isAreaMissing: Boolean.not })),
      ]),
    ),
    ClickedValues: Update.combineSteps([
      LineAreaFixtureBlock.makeFieldsStep(() => ({ isAreaMissing: () => false })),
      LineBinding.requestData({ data: updatedData }),
      AreaBinding.requestData({ data: updatedData }),
    ]),
    ClickedChangeInputs: (model) => ({
      model: modifyFields(model, { isAlternate: Boolean.not }),
    }),
    ClickedChangeSweep: (model) => ({ model: modifyFields(model, { isSweep: Boolean.not }) }),
    ClickedToggleMount: (model) => ({
      model: modifyFields(model, { isMounted: Boolean.not }),
    }),
    ClickedLoading: LineBinding.requestConfigure({
      configuration: { ...line.configuration(lineProps), status: 'loading' },
    }),
    ClickedShrink: Update.combineSteps([
      LineAreaFixtureBlock.makeFieldsStep(() => ({ isAreaMissing: () => false })),
      LineBinding.requestData({ data: data.slice(0, 3) }),
      AreaBinding.requestData({ data: data.slice(0, 3) }),
    ]),
    ClickedRestore: Update.combineSteps([
      LineAreaFixtureBlock.makeFieldsStep(() => ({ isAreaMissing: () => false })),
      LineBinding.requestData({ data }),
      AreaBinding.requestData({ data }),
    ]),
    ClickedClear: LineBinding.requestFocus({ index: null }),
    ClickedZoomed: LineBinding.requestBrush({
      range: Option.some({ start: Date.UTC(2025, 0, 2), end: Date.UTC(2025, 0, 5) }),
    }),
    ClickedUnzoomed: LineBinding.requestBrush({ range: Option.none() }),
    ClickedReset: LineBinding.requestConfigure({ configuration: line.configuration(lineProps) }),
    ClickedReplay: LineBinding.requestConfigure({
      configuration: { ...line.configuration(lineProps), revealSignature: 'again' },
    }),
    ClickedFocus: LineBinding.requestFocus({ index: 4 }),
  }),
  view: LineAreaFixtureComposition.makeView((model, h) => {
    if (showcaseOptions.has('publicPulse')) {
      return h.block(
        LoadingExampleBinding.embedView({
          slotId: 'public-loading-example',
          model: model.loadingExample,
        }),
      )
    }

    const presentation = model.isAlternate
      ? { pulse: alternateInputs, sweep: alternateSweepInputs }
      : { pulse: lineInputs, sweep: sweepInputs }

    return h.div(
      [],
      [
        lineAreaToolbar(Message, model.isMounted, showcaseOptions.has('lifecycle'), h),
        h.section(
          [
            h.Id('line-fixture'),
            h.Class(model.isAlternate ? 'w-[480px] h-[240px]' : 'w-[640px] h-[320px]'),
          ],
          [
            model.isMounted
              ? h.block(
                  LineBinding.embedView({
                    slotId: 'line',
                    model: model.line,
                    viewInputs: model.isSweep ? presentation.sweep : presentation.pulse,
                  }),
                )
              : h.empty,
          ],
        ),
        h.section(
          [h.Class('[width:640px] [height:320px]'), h.Id('area-fixture')],
          [
            h.block(
              AreaBinding.embedView({
                slotId: 'area',
                model: model.area,
                viewInputs: areaInputs,
              }),
            ),
          ],
        ),
        h.output(
          [h.Id('state')],
          [
            `Phase ${model.line.phase}; ready ${model.line.revealReady}; rows ${model.line.data.length}; focus ${Option.getOrNull(model.line.focusedIndex) ?? 'none'}; generation ${model.line.generation}`,
          ],
        ),
        h.nav(
          [],
          [
            Button.view(
              {
                onClick: Message.ClickedToggleAreaMissing(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button, h.AriaPressed(String(model.isAreaMissing))],
                    ['Missing Area observations'],
                  ),
              },
              h,
            ),
          ],
        ),
        showcaseOptions.has('familyOnly')
          ? h.empty
          : h.block(
              LoadingExampleBinding.embedView({
                slotId: 'public-loading-example',
                model: model.loadingExample,
              }),
            ),
      ],
    )
  }),
}).pipe(Layer.provide(chartLayers))

Runtime.run(
  Program.makeElement({
    block: LineAreaFixtureBlock,
    layer,
    Flags: LoadingSegmentFlags,
    flags: loadingSegmentFlags,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
