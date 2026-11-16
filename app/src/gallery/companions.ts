import { createKeyedLazy } from 'foldkit/html'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import {
  BarLoadingSkeletonBlock,
  BarLoadingSkeletonLayer,
} from '@foldkit-visuals/charts/bar-skeleton'
import {
  SeriesPointMarkerBlock,
  SeriesPointMarkerLayer,
} from '@foldkit-visuals/charts/series-point-marker'
import { ChartStatFlowBlock, ChartStatFlowLayer } from '@foldkit-visuals/charts/stat-flow'
import {
  TooltipBoxBlock,
  TooltipBoxLayer,
  TooltipContent,
} from '@foldkit-visuals/charts/tooltip-box'
import { Button } from '@foldkit-visuals/fluid/button'
import { ChartBrushLayout } from '@foldkit-visuals/charts/brush'
import { PreviewOptions } from '../playground/options'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { chartPages } from '../../../lib/catalogue'
import type { ResolvedSettings as Settings } from '../settings'
import { makePreviewCard, previewBody, previewAdmitted } from './card'
import { BrushMainBlock, BrushMainLayer, brushMain, brushMainProps } from './companion-brush-main'
import {
  BrushBlock,
  BrushLayer,
  LegendBlock,
  LegendLayer,
  brushConfiguration,
  brushStrip,
  data,
  legend,
  legendData,
} from './companion-definitions'
const key = Symbol('CompanionGallery')
const Message = defineMessageUnion({ ClickedIncrement: {}, ClickedMoveTooltip: {} })
export const CompanionGalleryBlock = Block.make('CompanionGallery', {
  key,
  InitArgs: Schema.Tuple([PreviewOptions]),
  ChildInitContext: PreviewOptions,
  InMessage: defineInMessageUnion({ InformedOfPreview: { preview: PreviewOptions } }),
  Model: Schema.Struct({
    preview: PreviewOptions,
    amount: Schema.Finite,
    hovered: Schema.NullOr(Schema.Int),
    stat: ChartStatFlowBlock.Model,
    marker: SeriesPointMarkerBlock.Model,
    skeleton: BarLoadingSkeletonBlock.Model,
    tooltip: TooltipBoxBlock.Model,
    brushMain: BrushMainBlock.Model,
    brush: BrushBlock.Model,
    legend: LegendBlock.Model,
  }),
  Message,
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: Pick<Settings, 'shape' | 'size' | 'hover'>
      readonly only?: string
      readonly ready: boolean
      readonly admitted: ReadonlyArray<string>
    }>(),
  },
})
const Stat = CompanionGalleryBlock.makeRequiredFieldBinding(ChartStatFlowBlock, {
  field: 'stat',
  init: {
    contextToArgs: (options) => [
      {
        value: typeof options.value === 'number' ? options.value : 12480,
        label: options.label ?? 'Ideas brought to life',
      },
    ],
  },
})
const Marker = CompanionGalleryBlock.makeRequiredFieldBinding(SeriesPointMarkerBlock, {
  field: 'marker',
  init: {
    contextToArgs: (options) => [
      {
        dataKey: 'revenue',
        index: 2,
        cx: 130,
        cy: 65,
        revealDelay: 0.125,
        revealEpoch: 1,
        enterDuration: 0.6,
        fill: 'var(--fluid-accent)',
        stroke: 'var(--fluid-accent)',
        outlineWidth: 3,
        radius: options.radius ?? 7,
      },
    ],
  },
})
const Skeleton = CompanionGalleryBlock.makeRequiredFieldBinding(BarLoadingSkeletonBlock, {
  field: 'skeleton',
  init: {
    contextToArgs: (options) => [
      'preview-skeleton',
      {
        innerWidth: 280,
        innerHeight: 160,
        barCount: options.barCount ?? 14,
        fill: 'var(--fluid-accent)',
      },
      false,
    ],
  },
})
const Tooltip = CompanionGalleryBlock.makeRequiredFieldBinding(TooltipBoxBlock, {
  field: 'tooltip',
  init: {
    contextToArgs: () => [
      'preview-tooltip-box',
      {
        containerId: 'preview-tooltip-container',
        x: 130,
        y: 100,
        containerWidth: 280,
        containerHeight: 200,
        visible: true,
      },
    ],
  },
})
const BrushMain = CompanionGalleryBlock.makeRequiredFieldBinding(BrushMainBlock, {
  field: 'brushMain',
  init: {
    contextToArgs: () => ['preview-brush-main', data, brushMain.configuration(brushMainProps)],
  },
})
const Brush = CompanionGalleryBlock.makeRequiredFieldBinding(BrushBlock, {
  field: 'brush',
  init: { contextToArgs: () => ['preview-brush', data, brushConfiguration] },
}).withOutMessagePolicy({
  fold: CompanionGalleryBlock.makeOutMessageFold(BrushBlock, {
    SelectionObserved: ({ viewport, enabled }) =>
      BrushMain.requestBrush({ range: enabled ? viewport : Option.none() }),
    ViewportChanged: ({ viewport, enabled }) =>
      BrushMain.requestBrush({ range: enabled ? viewport : Option.none() }),
  }),
})
const Legend = CompanionGalleryBlock.makeRequiredFieldBinding(LegendBlock, {
  field: 'legend',
  init: { contextToArgs: () => ['preview-legend', legendData] },
}).withOutMessagePolicy({
  fold: CompanionGalleryBlock.makeOutMessageFold(LegendBlock, {
    HoverRequested: ({ index }) =>
      CompanionGalleryBlock.makeFieldsStep(() => ({ hovered: () => index })),
    LayoutMeasured: CompanionGalleryBlock.makeNoopStep,
  }),
})
const CompanionGalleryComposition = CompanionGalleryBlock.makeComposition({
  bindings: [Stat, Marker, Skeleton, Tooltip, BrushMain, Brush, Legend],
})
type CompanionViewBuilder = Parameters<
  Parameters<typeof CompanionGalleryComposition.makeView.withInputs>[0]
>[2]
const renderStatFlow = (
  statModel: (typeof CompanionGalleryBlock.Model.Type)['stat'],
  shape: Settings['shape'],
  size: Settings['size'],
  hover: Settings['hover'],
  h: CompanionViewBuilder,
) => {
  const context = createPresentationContext({
    shape,
    size,
    hoverMode: hover,
    hasShapeProvider: true,
    hasSizeProvider: true,
    reducedMotion: 'user',
  })
  return h.div(
    [h.Class('flex flex-col gap-4 w-full max-w-[330px] mx-auto ')],
    [
      h.block(Stat.embedView({ slotId: 'stat', model: statModel, viewInputs: {} })),
      Button(
        {
          context,
          variant: 'ghost',
          children: ['A little more'],
          attributes: [h.OnClick(Message.ClickedIncrement())],
        },
        h,
      ),
    ],
  )
}
const renderSeriesPointMarker = (
  markerModel: (typeof CompanionGalleryBlock.Model.Type)['marker'],
  h: CompanionViewBuilder,
) => {
  return h.svg(
    [h.ViewBox('0 0 260 140'), h.Role('img'), h.AriaLabel('Animated series marker')],
    [
      h.path([
        h.D('M10 110 Q60 120 95 80 T170 60 T250 20'),
        h.Fill('none'),
        h.Stroke('var(--fluid-accent)'),
        h.StrokeWidth('2'),
      ]),
      h.block(Marker.embedView({ slotId: 'marker', model: markerModel })),
    ],
  )
}
const renderBarSkeleton = (
  skeletonModel: (typeof CompanionGalleryBlock.Model.Type)['skeleton'],
  h: CompanionViewBuilder,
) => {
  return h.svg(
    [h.ViewBox('0 0 280 160'), h.Role('img'), h.AriaLabel('Loading chart')],
    [h.block(Skeleton.embedView({ slotId: 'skeleton', model: skeletonModel }))],
  )
}
const renderBrush = (
  previewModel: (typeof CompanionGalleryBlock.Model.Type)['preview'],
  brushModel: (typeof CompanionGalleryBlock.Model.Type)['brush'],
  brushMainModel: (typeof CompanionGalleryBlock.Model.Type)['brushMain'],
  h: CompanionViewBuilder,
) => {
  return h.div(
    [h.Class('w-full min-w-0')],
    [
      h.div(
        [
          h.Style({
            height: previewModel.height === undefined ? '360px' : `${previewModel.height + 232}px`,
            minHeight: '0',
          }),
        ],
        [
          h.block(
            Brush.embedView({
              slotId: 'brush',
              model: brushModel,
              viewInputs: ChartBrushLayout({
                data: brushModel.data,
                enabled: brushModel.owner.enabled,
                height: previewModel.height ?? 80,
                children: (layout) =>
                  h.block(
                    BrushMain.embedView({
                      slotId: 'brush-main',
                      model: brushMainModel,
                      viewInputs: brushMain.inputs(brushMainModel.id, {
                        ...brushMainProps,
                        ...(layout.xDomain === undefined
                          ? {}
                          : {
                              xDomain: layout.xDomain,
                            }),
                        ...(layout.xDomainSlotCount === undefined
                          ? {}
                          : { xDomainSlotCount: layout.xDomainSlotCount }),
                      }),
                    }),
                  ),
                brushStrip: () => brushStrip,
              }),
            }),
          ),
        ],
      ),
      h.p(
        [h.Class('text-muted-foreground text-[12px] ')],
        ['Drag the handles to focus your view.'],
      ),
    ],
  )
}
const renderLegend = (
  legendModel: (typeof CompanionGalleryBlock.Model.Type)['legend'],
  hoveredModel: (typeof CompanionGalleryBlock.Model.Type)['hovered'],
  previewModel: (typeof CompanionGalleryBlock.Model.Type)['preview'],
  h: CompanionViewBuilder,
) => {
  return h.block(
    Legend.embedView({
      slotId: 'legend',
      model: legendModel,
      viewInputs: legend.inputs(hoveredModel, {
        showMarker: previewModel.showMarker ?? true,
        showValue: previewModel.showValue ?? true,
        showProgress: previewModel.showProgress ?? true,
        showPercentage: previewModel.showPercentage ?? true,
      }),
    }),
  )
}
const renderTooltipBox = (
  tooltipModel: (typeof CompanionGalleryBlock.Model.Type)['tooltip'],
  previewModel: (typeof CompanionGalleryBlock.Model.Type)['preview'],
  shape: Settings['shape'],
  size: Settings['size'],
  hover: Settings['hover'],
  h: CompanionViewBuilder,
) => {
  const context = createPresentationContext({
    shape,
    size,
    hoverMode: hover,
    hasShapeProvider: true,
    hasSizeProvider: true,
    reducedMotion: 'user',
  })
  return h.div(
    [h.Class('flex flex-col gap-4 w-full max-w-[330px] mx-auto ')],
    [
      h.div(
        [h.Class(['relative', 'w-full', 'h-[200px]'].join(' ')), h.Id('preview-tooltip-container')],
        [
          h.block(
            Tooltip.embedView({
              slotId: 'tooltip-box',
              model: tooltipModel,
              viewInputs: {
                children: TooltipContent({
                  title: previewModel.label ?? 'A clearer picture',
                  rows: [
                    {
                      label: previewModel.label ?? 'Design',
                      value: typeof previewModel.value === 'number' ? previewModel.value : 12480,
                      color: '#A088BF',
                    },
                    { label: 'Product', value: 8620, color: '#C6B3D8' },
                  ],
                }),
              },
            }),
          ),
        ],
      ),
      Button(
        {
          context,
          variant: 'ghost',
          children: ['Follow the detail'],
          attributes: [h.OnClick(Message.ClickedMoveTooltip())],
        },
        h,
      ),
    ],
  )
}
const makeView = () => {
  const previewCard = makePreviewCard()
  const body = createKeyedLazy()
  return CompanionGalleryComposition.makeView.withInputs((model, inputs, h) => {
    const cards = {
      'stat-flow': () =>
        body('stat-flow', renderStatFlow, [
          model.stat,
          inputs.settings.shape,
          inputs.settings.size,
          inputs.settings.hover,
          h,
        ]),
      'series-point-marker': () =>
        body('series-point-marker', renderSeriesPointMarker, [model.marker, h]),
      'bar-skeleton': () => body('bar-skeleton', renderBarSkeleton, [model.skeleton, h]),
      brush: () => body('brush', renderBrush, [model.preview, model.brush, model.brushMain, h]),
      legend: () => body('legend', renderLegend, [model.legend, model.hovered, model.preview, h]),
      'tooltip-box': () =>
        body('tooltip-box', renderTooltipBox, [
          model.tooltip,
          model.preview,
          inputs.settings.shape,
          inputs.settings.size,
          inputs.settings.hover,
          h,
        ]),
    }
    return h.div(
      [h.Class('contents')],
      chartPages
        .filter(
          (page) =>
            Object.hasOwn(cards, page.slug) &&
            (inputs.only === undefined || inputs.only === page.href),
        )
        .map((page) => {
          const render = Object.entries(cards).find(([slug]) => slug === page.slug)?.[1]
          return render === undefined
            ? h.empty
            : previewCard(
                page,
                inputs.settings,
                previewBody(page, inputs, render, h),
                h,
                !previewAdmitted(page, inputs),
                inputs.only !== undefined,
              )
        }),
    )
  })
}
const implementation = {
  inMessageUpdate: CompanionGalleryComposition.makeInMessageUpdate({
    InformedOfPreview: CompanionGalleryBlock.makeStep((model, { preview }) =>
      Update.combineSteps([
        CompanionGalleryBlock.makeFieldsStep(() => ({ preview: () => preview })),
        ...(preview.value !== model.preview.value && typeof preview.value === 'number'
          ? [
              Stat.requestConfigure({
                configuration: { ...model.stat.configuration, value: preview.value },
              }),
              CompanionGalleryBlock.makeFieldsStep(() => ({
                amount: (amount) => (typeof preview.value === 'number' ? preview.value : amount),
              })),
            ]
          : []),
        Marker.requestConfigure({
          configuration: { ...model.marker.configuration, radius: preview.radius ?? 7 },
        }),
        Skeleton.requestConfigure({
          configuration: { ...model.skeleton.configuration, barCount: preview.barCount ?? 14 },
        }),
      ]),
    ),
  }),
  init: CompanionGalleryComposition.makeInit((preview) => ({
    model: {
      preview,
      amount: typeof preview.value === 'number' ? preview.value : 12480,
      hovered: null,
    },
    childInitContext: preview,
  })),
  update: CompanionGalleryComposition.makeUpdate({
    ClickedIncrement: CompanionGalleryBlock.makeStep((model) =>
      Update.combineSteps([
        Stat.requestConfigure({
          configuration: { value: model.amount + 127, label: 'Ideas brought to life' },
        }),
        CompanionGalleryBlock.makeFieldsStep(() => ({ amount: (amount) => amount + 127 })),
      ]),
    ),
    ClickedMoveTooltip: CompanionGalleryBlock.makeStep((model) =>
      Tooltip.requestConfigure({
        configuration: {
          ...model.tooltip.configuration,
          x: model.tooltip.configuration.x === 130 ? 180 : 130,
          y: 100,
        },
      }),
    ),
  }),
}
const plans = Effect.gen(function* () {
  const children = yield* CompanionGalleryComposition.acquireChildren()
  return { ...implementation, children, view: makeView() }
})
export const layer = CompanionGalleryBlock.makeLayer(plans).pipe(
  Layer.provide(
    Layer.mergeAll(
      ChartStatFlowLayer,
      SeriesPointMarkerLayer,
      BarLoadingSkeletonLayer,
      TooltipBoxLayer,
      BrushMainLayer,
      BrushLayer,
      LegendLayer,
    ),
  ),
)
