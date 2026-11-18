import { referenceSection, referenceMuted, referenceHeading, previewToolbar } from './classes'
import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import { codeBlock } from '../../../components/docs/code-block'
import { createLazy } from 'foldkit/html'
import { memoizeVariant } from '../view-inputs'
import { AuthoredChartVariantsBlock, layer as VariantLayer } from './authored-chart-variants'
import { HeatmapLegend, HeatmapInteractionBoundary } from '@foldkit-visuals/charts/heatmap'
import { Option } from 'effect'
// Authored examples transposed from bklit-tanstack-charts-migration's chart-docs and demos. MIT.
import { Effect, Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
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
import type { Html } from 'foldkit/html'
import { ComponentPresentation, presentation } from '../settings'
import * as Scenes from './chart-scenes'
import { documentationRuntime } from '../documentation-runtime'
const key = Symbol('AuthoredCharts')
export const AuthoredChartsBlock = Block.make('AuthoredCharts', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    variants: AuthoredChartVariantsBlock.Model,
    previewTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
    loaded: Schema.Record(Schema.String, Schema.Boolean),
    lines: Schema.Record(Schema.String, Scenes.LineBlock.Model),
    areas: Schema.Record(Schema.String, Scenes.AreaBlock.Model),
    bar: Scenes.BarBlock.Model,
    heat: Scenes.HeatBlock.Model,
    heatPlaceholder: Scenes.HeatBlock.Model,
    linePlaceholder: Scenes.LineLoadingBlock.Model,
    areaPlaceholder: Scenes.AreaLoadingBlock.Model,
    barPlaceholder: Scenes.BarLoadingBlock.Model,
  }),
  Message: defineMessageUnion({
    HoveredHeatLevel: { level: Schema.NullOr(Schema.Int) },
    ToggledLoading: { slug: Schema.String, key: Schema.String },
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
const Root = AuthoredChartsBlock
const PreviewTabs = Root.makeRecordBinding(PreviewControlsBlock, { field: 'previewTabs' })
const Lines = Root.makeRecordBinding(Scenes.LineBlock, { field: 'lines' })
const Areas = Root.makeRecordBinding(Scenes.AreaBlock, { field: 'areas' })
const Bar = Root.makeRequiredFieldBinding(Scenes.BarBlock, {
  field: 'bar',
  init: {
    contextToArgs: () => [
      'authored-bar-pulse',
      Scenes.barData,
      Scenes.bar.configuration(Scenes.barProps(true)),
    ],
  },
})
const Heat = Root.makeRequiredFieldBinding(Scenes.HeatBlock, {
  field: 'heat',
  init: {
    contextToArgs: () => ['authored-heat-pulse', Scenes.heatData, Scenes.heat.configuration()],
  },
})
const HeatPlaceholder = Root.makeRequiredFieldBinding(Scenes.HeatBlock, {
  field: 'heatPlaceholder',
  init: {
    contextToArgs: () => [
      'authored-heat-placeholder',
      Scenes.heatPlaceholder.data,
      Scenes.heat.configuration(),
    ],
  },
})
const LinePlaceholder = Root.makeRequiredFieldBinding(Scenes.LineLoadingBlock, {
  field: 'linePlaceholder',
  init: {
    contextToArgs: () => [
      'authored-line-placeholder',
      Scenes.lineLoading.data,
      Scenes.lineLoading.configuration,
    ],
  },
})
const AreaPlaceholder = Root.makeRequiredFieldBinding(Scenes.AreaLoadingBlock, {
  field: 'areaPlaceholder',
  init: {
    contextToArgs: () => [
      'authored-area-placeholder',
      Scenes.areaLoading.data,
      Scenes.areaLoading.configuration,
    ],
  },
})
const BarPlaceholder = Root.makeRequiredFieldBinding(Scenes.BarLoadingBlock, {
  field: 'barPlaceholder',
  init: {
    contextToArgs: () => [
      'authored-bar-placeholder',
      Scenes.barLoading.data,
      Scenes.barLoading.configuration,
    ],
  },
})
const Variants = Root.makeRequiredFieldBinding(AuthoredChartVariantsBlock, { field: 'variants' })
const Composition = Root.makeComposition({
  bindings: [
    PreviewTabs,
    Lines,
    Areas,
    Variants,
    Bar,
    Heat,
    HeatPlaceholder,
    LinePlaceholder,
    AreaPlaceholder,
    BarPlaceholder,
  ],
})
const initChartExamples = Root.makeStep(() =>
  Update.combineSteps([
    ...['line', 'area', 'bar', 'heatmap'].flatMap((slug) =>
      [...(slug === 'line' || slug === 'area' ? ['pulse', 'sweep'] : ['pulse']), 'placeholder'].map(
        (key) =>
          Root.makeStep((model) => {
            const section = `${slug}:${key}`
            const id = previewCodeTabId('chart-scenes', section)
            return initAndInsert(PreviewTabs, model, {
              key: section,
              args: [{ id, idPrefix: id, selectedIndex: 0 }],
            })
          }),
      ),
    ),
    ...Scenes.loadingScenes.flatMap(({ key, sweep }) => [
      Root.makeStep((model) =>
        initAndInsert(Lines, model, {
          key,
          args: [
            `authored-line-${key}`,
            Scenes.lineData,
            Scenes.line.configuration(Scenes.lineProps(true, sweep)),
          ],
        }),
      ),
      Root.makeStep((model) =>
        initAndInsert(Areas, model, {
          key,
          args: [
            `authored-area-${key}`,
            Scenes.areaData,
            Scenes.area.configuration(Scenes.areaProps(true, sweep)),
          ],
        }),
      ),
    ]),
  ]),
)
const makeView = () => {
  type Model = typeof Root.Model.Type
  type H = Parameters<Parameters<typeof Composition.makeView.withInputs>[0]>[2]
  const lineInputs = memoizeVariant<ReturnType<typeof Scenes.line.inputs>>()
  const areaInputs = memoizeVariant<ReturnType<typeof Scenes.area.inputs>>()
  const barInputs = memoizeVariant<ReturnType<typeof Scenes.bar.inputs>>()
  const heatInputs = memoizeVariant<ReturnType<typeof Scenes.heat.inputs>>()
  const lineLoadingInputs = Scenes.lineLoading.inputs('authored-line-placeholder')
  const areaLoadingInputs = Scenes.areaLoading.inputs('authored-area-placeholder')
  const barLoadingInputs = Scenes.barLoading.inputs('authored-bar-placeholder')
  const heatPlaceholderInputs = Scenes.heat.inputs(
    'authored-heat-placeholder',
    Scenes.heatPlaceholder,
  )
  const lazyVariants = createLazy()
  const renderVariants = (
    model: Model['variants'],
    slug: string,
    settings: ComponentPresentation,
    ready: boolean,
    h: H,
  ) =>
    h.block(
      Variants.embedView({
        slotId: 'authored-chart-variants',
        model,
        viewInputs: { slug, settings, ready },
      }),
    )
  return Composition.makeView.withInputs((model, inputs, h) => {
    if (!inputs.ready) return h.empty
    const variants = lazyVariants(renderVariants, [
      model.variants,
      inputs.slug,
      inputs.settings,
      inputs.ready,
      h,
    ])
    if (!['line', 'area', 'bar', 'heatmap'].includes(inputs.slug)) return variants
    const context = presentation(inputs.settings)
    const scene = (
      key: string,
      title: string,
      description: string,
      content: Html,
      toggle: boolean,
    ) => {
      const id = `${inputs.slug}:${key}`
      const tabs = model.previewTabs[id]
      if (tabs === undefined) return h.empty
      const pane = paneForTabIndex(tabs.tabs.selectedIndex)
      return h.section(
        [h.Class(`${referenceSection} authored-frame`), h.AriaLabel(title)],
        [
          h.h3([h.Class(referenceHeading)], [title]),
          h.p([h.Class(referenceMuted)], [description]),
          h.div(
            [h.Class(previewToolbar)],
            [
              h.block(
                PreviewTabs.embedView({
                  key: id,
                  slotId: tabs.tabs.id,
                  model: tabs,
                  viewInputs: previewCodeTabsViewInputs(h, {
                    context,
                    animate: target.node,
                    ariaLabel: `${title} preview and code`,
                  }),
                }),
              ),
              toggle
                ? Button(
                    {
                      context,
                      variant: 'secondary',
                      buttonSize: 'compact',
                      className: 'ml-auto',
                      children: [model.loaded[id] ? 'Show loading' : 'Load data'],
                      attributes: [
                        h.OnClick(Root.Message.ToggledLoading({ slug: inputs.slug, key })),
                      ],
                    },
                    h,
                  )
                : null,
            ],
          ),
          h.div(
            [
              h.Id(`${tabs.tabs.id}-panel-0`),
              h.Role('tabpanel'),
              h.AriaLabelledBy(`${tabs.tabs.id}-tab-0`),
              h.Tabindex(-1),
              h.Class(
                pane === 'preview'
                  ? 'overflow-hidden rounded-lg border border-border bg-background p-3'
                  : 'hidden',
              ),
            ],
            [content],
          ),
          h.div(
            [
              h.Id(`${tabs.tabs.id}-panel-1`),
              h.Role('tabpanel'),
              h.AriaLabelledBy(`${tabs.tabs.id}-tab-1`),
              h.Tabindex(-1),
              h.Class(pane === 'code' ? '' : 'hidden'),
            ],
            pane === 'code'
              ? [
                  codeBlock(
                    {
                      code: documentationRuntime().sources['chart-scenes'],
                      label: `${title} code`,
                      context,
                    },
                    h,
                  ),
                ]
              : [],
          ),
        ],
      )
    }
    const loadingExamples = (
      inputs.slug === 'line' || inputs.slug === 'area'
        ? Scenes.loadingScenes
        : [Scenes.loadingScenes[0]]
    ).flatMap(({ key, title, sweep }) => {
      const loading = !model.loaded[`${inputs.slug}:${key}`]
      const lineChild = model.lines[key],
        areaChild = model.areas[key]
      const chartContent =
        inputs.slug === 'line' && lineChild !== undefined
          ? h.block(
              Lines.embedView({
                key,
                slotId: `authored-line-${key}`,
                model: lineChild,
                viewInputs: lineInputs(`${key}:${loading}`, () =>
                  Scenes.line.inputs(`authored-line-${key}`, Scenes.lineProps(loading, sweep)),
                ),
              }),
            )
          : inputs.slug === 'area' && areaChild !== undefined
            ? h.block(
                Areas.embedView({
                  key,
                  slotId: `authored-area-${key}`,
                  model: areaChild,
                  viewInputs: areaInputs(`${key}:${loading}`, () =>
                    Scenes.area.inputs(`authored-area-${key}`, Scenes.areaProps(loading, sweep)),
                  ),
                }),
              )
            : inputs.slug === 'bar'
              ? h.block(
                  Bar.embedView({
                    slotId: 'authored-bar-pulse',
                    model: model.bar,
                    viewInputs: barInputs(String(loading), () =>
                      Scenes.bar.inputs('authored-bar-pulse', Scenes.barProps(loading)),
                    ),
                  }),
                )
              : h.block(
                  Heat.embedView({
                    slotId: 'authored-heat-pulse',
                    model: model.heat,
                    viewInputs: heatInputs(String(loading), () =>
                      Scenes.heat.inputs('authored-heat-pulse', Scenes.heatProps(loading)),
                    ),
                  }),
                )
      const focused = Option.getOrNull(model.heat.focusedIndex)
      const column = focused === null ? undefined : Scenes.heatData[Math.floor(focused / 7)]
      const cell = focused === null ? undefined : column?.bins[focused % 7]
      const heatInteraction = {
        hoveredLegendLevel: Option.getOrNull(model.heat.hoveredLegendLevel),
        hoveredCell:
          cell === undefined || focused === null
            ? null
            : { column: Math.floor(focused / 7), row: focused % 7, count: cell.count },
        requestLegendLevel: (level: number | null) => Root.Message.HoveredHeatLevel({ level }),
      }
      const content =
        inputs.slug !== 'heatmap'
          ? chartContent
          : HeatmapInteractionBoundary(
              {
                children: [
                  chartContent,
                  HeatmapLegend(
                    { inactiveOpacity: 1, inactiveScale: 1 },
                    h,
                    'authored-heat-legend',
                    heatInteraction,
                  ),
                ],
              },
              h,
              heatInteraction,
            )

      return [
        scene(
          key,
          title,
          sweep
            ? 'loadingStyle="sweep" runs a light band along the line instead of the default pulse.'
            : 'Set status to "loading" while data is on its way. Switching to "ready" plays the reveal on the same chart.',
          content,
          true,
        ),
      ]
    })
    const placeholder =
      inputs.slug === 'line'
        ? h.block(
            LinePlaceholder.embedView({
              slotId: 'authored-line-placeholder',
              model: model.linePlaceholder,
              viewInputs: lineLoadingInputs,
            }),
          )
        : inputs.slug === 'area'
          ? h.block(
              AreaPlaceholder.embedView({
                slotId: 'authored-area-placeholder',
                model: model.areaPlaceholder,
                viewInputs: areaLoadingInputs,
              }),
            )
          : inputs.slug === 'bar'
            ? h.block(
                BarPlaceholder.embedView({
                  slotId: 'authored-bar-placeholder',
                  model: model.barPlaceholder,
                  viewInputs: barLoadingInputs,
                }),
              )
            : h.block(
                HeatPlaceholder.embedView({
                  slotId: 'authored-heat-placeholder',
                  model: model.heatPlaceholder,
                  viewInputs: heatPlaceholderInputs,
                }),
              )
    return h.div(
      [],
      [
        h.section(
          [h.Class(referenceSection), h.AriaLabel('Examples')],
          [
            h.h2([h.Class(referenceHeading)], ['Examples']),
            ...loadingExamples,
            scene(
              'placeholder',
              'Loading placeholder',
              'Render a standalone loading chart before you have data.',
              placeholder,
              false,
            ),
          ],
        ),
        variants,
      ],
    )
  })
}
const implementation = {
  init: Composition.makeInit(() => ({
    model: { previewTabs: {}, loaded: {}, lines: {}, areas: {} },
    steps: [initChartExamples],
  })),
  update: Composition.makeUpdate({
    HoveredHeatLevel: Root.makeStep.fromMessage(({ level }) => Heat.requestLegendLevel({ level })),
    ToggledLoading: Root.makeStep((model, { slug, key }) => {
      const loading = model.loaded[`${slug}:${key}`] ?? false
      return Update.combineSteps([
        Root.makeFieldsStep(() => ({
          loaded: (loaded) => ({ ...loaded, [`${slug}:${key}`]: !loading }),
        })),
        ...(slug === 'line'
          ? [
              Lines.requestConfigure(key, {
                configuration: Scenes.line.configuration(
                  Scenes.lineProps(loading, key === 'sweep'),
                ),
              }),
            ]
          : []),
        ...(slug === 'area'
          ? [
              Areas.requestConfigure(key, {
                configuration: Scenes.area.configuration(
                  Scenes.areaProps(loading, key === 'sweep'),
                ),
              }),
            ]
          : []),
        ...(slug === 'bar'
          ? [
              Bar.requestConfigure({
                configuration: Scenes.bar.configuration(Scenes.barProps(loading)),
              }),
            ]
          : []),
      ])
    }),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        ...Object.entries(model.previewTabs).flatMap(([key, child]) =>
          tabsHoverModeOf(child) === settings.hover
            ? []
            : [PreviewTabs.requestHoverMode(key, { mode: settings.hover })],
        ),
        Variants.informOfPresentation({ presentation: settings }),
      ]),
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
      VariantLayer,
      Scenes.LineBlock.makeLayer(Scenes.line.plans(Scenes.LineBlock)),
      Scenes.AreaBlock.makeLayer(Scenes.area.plans(Scenes.AreaBlock)),
      Scenes.BarBlock.makeLayer(Scenes.bar.plans(Scenes.BarBlock)),
      Scenes.HeatBlock.makeLayer(Scenes.heat.plans(Scenes.HeatBlock)),
      Scenes.LineLoadingBlock.makeLayer(Scenes.lineLoading.plans(Scenes.LineLoadingBlock)),
      Scenes.AreaLoadingBlock.makeLayer(Scenes.areaLoading.plans(Scenes.AreaLoadingBlock)),
      Scenes.BarLoadingBlock.makeLayer(Scenes.barLoading.plans(Scenes.BarLoadingBlock)),
    ),
  ),
)
