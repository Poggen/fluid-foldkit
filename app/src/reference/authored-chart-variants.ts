import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import { Boolean } from 'effect'
import { createKeyedLazy, createLazy } from 'foldkit/html'
import { memoizeVariant } from '../view-inputs'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { GaugeBlock, GaugeLayer } from '@foldkit-visuals/charts/gauge'
import { ChartLegend } from '@foldkit-visuals/charts/legend'
import { Button } from '@foldkit-visuals/fluid/button'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import {
  paneForTabIndex,
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
import { target } from '../motion'
import {
  LineBlock,
  AreaBlock,
  BarBlock,
  line,
  area,
  bar,
  lineData,
  areaData,
  barData,
} from './chart-scenes'
import {
  lineVariants,
  barVariants,
  areaVariant,
  gauges,
  pulseOptions,
} from './chart-variant-options'
import { ComponentPresentation, presentation } from '../settings'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { documentationRuntime } from '../documentation-runtime'
const legend = ChartLegend({
  Item: Schema.Struct({ label: Schema.String, value: Schema.Finite, color: Schema.String }),
})
const legendKey = Symbol('AuthoredVariantLegend')
const LegendBlock = Block.make(legend.namespace, { key: legendKey, ...legend.contract })
const key = Symbol('AuthoredChartVariants')
export const AuthoredChartVariantsBlock = Block.make('AuthoredChartVariants', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    lines: Schema.Record(Schema.String, LineBlock.Model),
    area: AreaBlock.Model,
    bars: Schema.Record(Schema.String, BarBlock.Model),
    gauges: Schema.Record(Schema.String, GaugeBlock.Model),
    legends: Schema.Record(Schema.String, LegendBlock.Model),
    hovered: Schema.Record(Schema.String, Schema.NullOr(Schema.Int)),
    isPulsePaused: Schema.Boolean,
    previewTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  Message: defineMessageUnion({
    ToggledPulse: {},
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly slug: string
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredChartVariantsBlock
const PreviewTabs = Root.makeRecordBinding(PreviewControlsBlock, { field: 'previewTabs' })
const previewSections = [
  'Markers',
  'Reference area',
  'Segment',
  'Projection',
  'Pattern area',
  'Bar depth',
  'Pulse',
  'Bar squares',
  'Composition',
  'Gauge variants',
]
const Lines = Root.makeRecordBinding(LineBlock, { field: 'lines' }),
  Bars = Root.makeRecordBinding(BarBlock, { field: 'bars' }),
  Gauges = Root.makeRecordBinding(GaugeBlock, { field: 'gauges' })
const Area = Root.makeRequiredFieldBinding(AreaBlock, {
  field: 'area',
  init: {
    contextToArgs: () => ['authored-area-pattern', areaData, area.configuration(areaVariant)],
  },
})
const Legends = Root.makeRecordBinding(LegendBlock, { field: 'legends' }).withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(LegendBlock, {
      LayoutMeasured: Root.makeNoopStep,
      HoverRequested: ({ index }) =>
        Update.combineSteps([
          Root.makeFieldsStep(() => ({ hovered: (hovered) => ({ ...hovered, [key]: index }) })),
          ...(key === 'markers'
            ? [Lines.requestLegendHover(key, { index: Option.fromNullOr(index) })]
            : [Bars.requestLegendHover(key, { index: Option.fromNullOr(index) })]),
        ]),
    }),
})
const Composition = Root.makeComposition({
  bindings: [Lines, Area, Bars, Gauges, Legends, PreviewTabs],
})
const makeView = () => {
  type Model = typeof Root.Model.Type
  type H = Parameters<Parameters<typeof Composition.makeView.withInputs>[0]>[2]
  const lazyLines = createKeyedLazy(),
    lazyBars = createKeyedLazy(),
    lazyArea = createLazy()
  const lineInputs = memoizeVariant<ReturnType<typeof line.inputs>>()
  const barInputs = memoizeVariant<ReturnType<typeof bar.inputs>>()
  const areaInputs = area.inputs('authored-area-pattern', areaVariant)
  const renderLine = (key: string, child: Model['lines'][string] | undefined, h: H) => {
    const options = lineVariants[key]
    return child === undefined || options === undefined
      ? h.empty
      : h.block(
          Lines.embedView({
            key,
            slotId: `authored-line-${key}`,
            model: child,
            viewInputs: lineInputs(key, () => line.inputs(`authored-line-${key}`, options)),
          }),
        )
  }
  const renderBar = (
    key: string,
    child: Model['bars'][string] | undefined,
    paused: boolean,
    h: H,
  ) => {
    const options = key === 'pulse' ? pulseOptions(paused) : barVariants[key]
    return child === undefined || options === undefined
      ? h.empty
      : h.block(
          Bars.embedView({
            key,
            slotId: `authored-bar-${key}`,
            model: child,
            viewInputs: barInputs(`${key}:${paused}`, () =>
              bar.inputs(`authored-variant-bar-${key}`, options),
            ),
          }),
        )
  }
  const renderArea = (model: Model['area'], h: H) =>
    h.block(
      Area.embedView({
        slotId: 'authored-area-pattern',
        model,
        viewInputs: areaInputs,
      }),
    )
  return Composition.makeView.withInputs((model, inputs, h) => {
    if (!inputs.ready) return h.empty
    const context = presentation(inputs.settings)
    const lineView = (key: string) => lazyLines(key, renderLine, [key, model.lines[key], h])
    const barView = (key: string) =>
      lazyBars(key, renderBar, [key, model.bars[key], key === 'pulse' && model.isPulsePaused, h])
    const withLegend = (key: string, chart: ReturnType<typeof h.div>) => {
      const child = model.legends[key]
      return h.div(
        [h.Style({ display: 'flex', gap: '32px', alignItems: 'flex-start' })],
        [
          h.div([h.Style({ flex: '1', minWidth: '0' })], [chart]),
          child === undefined
            ? null
            : h.div(
                [h.Style({ width: '200px' })],
                [
                  h.block(
                    Legends.embedView({
                      key,
                      slotId: `authored-legend-${key}`,
                      model: child,
                      viewInputs: legend.inputs(model.hovered[key] ?? null, { title: 'Series' }),
                    }),
                  ),
                ],
              ),
        ],
      )
    }
    const section = (
      title: string,
      children: ReadonlyArray<ReturnType<typeof h.div>>,
      description = '',
    ) => {
      const tabs = model.previewTabs[title]
      if (tabs === undefined) return h.empty
      return docSection(h, {
        title,
        description,
        children,
        source: documentationRuntime().sources['chart-variant-options'],
        pane: paneForTabIndex(tabs.tabs.selectedIndex),
        tabsId: tabs.tabs.id,
        tabs: h.block(
          PreviewTabs.embedView({
            key: title,
            slotId: tabs.tabs.id,
            model: tabs,
            viewInputs: previewCodeTabsViewInputs(h, {
              context,
              animate: target.node,
              ariaLabel: `${title} preview and code`,
            }),
          }),
        ),
        presentation: { context },
        className: 'w-full',
        previewPadding: 'none',
        ...(title === 'Pulse'
          ? {
              actions: [
                Button(
                  {
                    context,
                    variant: 'secondary',
                    buttonSize: 'compact',
                    children: [model.isPulsePaused ? 'Play pulse' : 'Pause pulse'],
                    attributes: [h.OnClick(Root.Message.ToggledPulse())],
                  },
                  h,
                ),
              ],
            }
          : {}),
      })
    }
    if (inputs.slug === 'area')
      return section('Pattern area', [lazyArea(renderArea, [model.area, h])])
    if (inputs.slug === 'bar')
      return h.div(
        [],
        [
          section('Bar depth', [barView('depth')]),
          section(
            'Pulse',
            [barView('pulse')],
            'BarPulse loops a light sweep over one bar, such as the latest value. Set pulsePaused to hold it still.',
          ),
          section('Bar squares', [withLegend('squares', barView('squares'))]),
        ],
      )
    if (inputs.slug === 'composed')
      return section('Composition', [lineView('composition'), barView('composition')])
    if (inputs.slug === 'gauge')
      return section('Gauge variants', [
        h.div(
          [h.Class('mx-auto w-full min-w-[300px] max-w-lg py-4')],
          ['arc', 'track', 'label'].flatMap((key) => {
            const child = model.gauges[key]
            return child === undefined
              ? []
              : [
                  h.div(
                    [
                      h.Class(
                        key === 'arc'
                          ? ''
                          : key === 'track'
                            ? 'mt-6 flex w-full items-center py-6'
                            : 'flex w-full items-center py-6',
                      ),
                      h.DataAttribute('gauge-linear', key),
                    ],
                    [
                      h.block(
                        Gauges.embedView({
                          key,
                          slotId: `authored-gauge-${key}`,
                          model: child,
                          viewInputs: {},
                        }),
                      ),
                    ],
                  ),
                ]
          }),
        ),
      ])
    if (inputs.slug !== 'line') return h.empty
    const child = model.lines.segment,
      selection = child === undefined ? undefined : Option.getOrUndefined(child.selection),
      first = lineData[selection?.startIndex ?? 0],
      last = lineData[selection?.endIndex ?? lineData.length - 1],
      change = (last?.users ?? 0) - (first?.users ?? 0),
      pct = first?.users ? (change / first.users) * 100 : 0
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
    return h.div(
      [],
      [
        section('Markers', [withLegend('markers', lineView('markers'))]),
        section('Reference area', [lineView('reference')]),
        section('Segment', [
          h.div(
            [h.Class('mb-4 space-y-1')],
            [
              h.div(
                [h.Class('flex items-baseline gap-2')],
                [
                  h.span(
                    [h.Class('font-semibold text-2xl tabular-nums')],
                    [(last?.users ?? 0).toLocaleString('en-US')],
                  ),
                  h.span([h.Class('text-muted-foreground text-sm')], ['users']),
                ],
              ),
              h.div(
                [h.Class('flex items-baseline gap-2 text-sm')],
                [
                  h.span(
                    // oxlint-disable-next-line shadcn/no-raw-colors -- Original Bklit showcase/components/demos/segment.tsx:89 at 9bdabac6 uses these signed-change colors.
                    [h.Class(change >= 0 ? 'text-emerald-500' : 'text-red-500')],
                    [
                      `${change >= 0 ? '+' : ''}${change.toLocaleString('en-US')} (${change >= 0 ? '+' : ''}${pct.toFixed(1)}%)`,
                    ],
                  ),
                  h.span(
                    [h.Class('text-muted-foreground')],
                    [
                      `${first ? formatter.format(first.date) : ''} – ${last ? formatter.format(last.date) : ''}`,
                    ],
                  ),
                ],
              ),
            ],
          ),
          lineView('segment'),
        ]),
        section('Projection', [lineView('projection')]),
      ],
    )
  })
}
const implementation = {
  init: Composition.makeInit(() => ({
    model: {
      lines: {},
      bars: {},
      gauges: {},
      legends: {},
      hovered: {},
      isPulsePaused: false,
      previewTabs: {},
    },
    steps: [
      ...previewSections.map((title) =>
        Root.makeStep((model) => {
          const id = previewCodeTabId('chart-variants', title)
          return initAndInsert(PreviewTabs, model, {
            key: title,
            args: [{ id, idPrefix: id, selectedIndex: 0 }],
          })
        }),
      ),
      ...Object.entries(lineVariants).map(([key, options]) =>
        Root.makeStep((model) =>
          initAndInsert(Lines, model, {
            key,
            args: [`authored-line-${key}`, lineData, line.configuration(options)],
          }),
        ),
      ),
      ...Object.entries(barVariants).map(([key, options]) =>
        Root.makeStep((model) =>
          initAndInsert(Bars, model, {
            key,
            args: [`authored-variant-bar-${key}`, barData, bar.configuration(options)],
          }),
        ),
      ),
      ...Object.entries(gauges).map(([key, options]) =>
        Root.makeStep((model) =>
          initAndInsert(Gauges, model, { key, args: [options, `authored-gauge-${key}`] }),
        ),
      ),
      ...['markers', 'squares'].map((key) =>
        Root.makeStep((model) =>
          initAndInsert(Legends, model, {
            key,
            args: [
              `authored-legend-${key}`,
              key === 'markers'
                ? [
                    { label: 'Users', value: 100, color: 'var(--chart-line-primary)' },
                    { label: 'Pageviews', value: 100, color: 'var(--chart-line-secondary)' },
                  ]
                : [
                    { label: 'Revenue (gradient)', value: 100, color: 'var(--chart-1)' },
                    { label: 'Profit (pattern)', value: 100, color: 'var(--chart-2)' },
                  ],
            ],
          }),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({
    ToggledPulse: Root.makeStep((model) =>
      Update.combineSteps([
        Root.makeFieldsStep(() => ({ isPulsePaused: Boolean.not })),
        Bars.requestConfigure('pulse', {
          configuration: bar.configuration(pulseOptions(!model.isPulsePaused)),
        }),
      ]),
    ),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps(
        Object.entries(model.previewTabs).flatMap(([key, child]) =>
          tabsHoverModeOf(child) === settings.hover
            ? []
            : [PreviewTabs.requestHoverMode(key, { mode: settings.hover })],
        ),
      ),
    ),
  }),
}
const plans = Effect.gen(function* () {
  const children = yield* Composition.acquireChildren()
  return { ...implementation, children, view: makeView() }
})
export const layer = Root.makeLayer(plans).pipe(
  Layer.provide(
    Layer.mergeAll(
      PreviewControlsLayer,
      LineBlock.makeLayer(line.plans(LineBlock)),
      AreaBlock.makeLayer(area.plans(AreaBlock)),
      BarBlock.makeLayer(bar.plans(BarBlock)),
      GaugeLayer,
      LegendBlock.makeLayer(legend.plans(LegendBlock)),
    ),
  ),
)
