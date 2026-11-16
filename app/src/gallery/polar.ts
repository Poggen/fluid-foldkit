import { createKeyedLazy } from 'foldkit/html'
import { polarPreview } from '../playground/polar'
import { PreviewOptions } from '../playground/options'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { chartPages } from '../../../lib/catalogue'
import type { ResolvedSettings as Settings } from '../settings'
import { makePreviewCard, previewBody, previewAdmitted } from './card'
import {
  FunnelBlock,
  FunnelLayer,
  HeatBlock,
  HeatLayer,
  LiveBlock,
  LiveLayer,
  PieBlock,
  PieLayer,
  RadarBlock,
  RadarLayer,
  RingBlock,
  RingLayer,
  funnel,
  funnelData,
  heat,
  heatData,
  live,
  liveData,
  pie,
  pieData,
  radar,
  radarData,
  ring,
  ringData,
} from './polar-definitions'
const key = Symbol('PolarGallery')
export const PolarGalleryBlock = Block.make('PolarGallery', {
  key,
  InitArgs: Schema.Tuple([PreviewOptions]),
  ChildInitContext: PreviewOptions,
  InMessage: defineInMessageUnion({ InformedOfPreview: { preview: PreviewOptions } }),
  Model: Schema.Struct({
    preview: PreviewOptions,
    pie: PieBlock.Model,
    ring: RingBlock.Model,
    radar: RadarBlock.Model,
    funnel: FunnelBlock.Model,
    heat: HeatBlock.Model,
    live: LiveBlock.Model,
  }),
  Message: defineMessageUnion({ Refreshed: {} }),
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
const Pie = PolarGalleryBlock.makeRequiredFieldBinding(PieBlock, {
  field: 'pie',
  init: {
    contextToArgs: () => ['preview-pie', pieData, pie.configuration({})],
  },
})
const Ring = PolarGalleryBlock.makeRequiredFieldBinding(RingBlock, {
  field: 'ring',
  init: {
    contextToArgs: () => ['preview-ring', ringData, ring.configuration({})],
  },
})
const Radar = PolarGalleryBlock.makeRequiredFieldBinding(RadarBlock, {
  field: 'radar',
  init: {
    contextToArgs: () => ['preview-radar', radarData, radar.configuration({})],
  },
})
const Funnel = PolarGalleryBlock.makeRequiredFieldBinding(FunnelBlock, {
  field: 'funnel',
  init: {
    contextToArgs: () => ['preview-funnel', funnelData, funnel.configuration({})],
  },
})
const Heat = PolarGalleryBlock.makeRequiredFieldBinding(HeatBlock, {
  field: 'heat',
  init: {
    contextToArgs: () => ['preview-heat', heatData, heat.configuration()],
  },
})
const Live = PolarGalleryBlock.makeRequiredFieldBinding(LiveBlock, {
  field: 'live',
  init: {
    contextToArgs: (options) => [
      'preview-live',
      liveData,
      live.configuration(polarPreview(options).live),
    ],
  },
})
const PolarGalleryComposition = PolarGalleryBlock.makeComposition({
  bindings: [Pie, Ring, Radar, Funnel, Heat, Live],
})
type PolarViewBuilder = Parameters<
  Parameters<typeof PolarGalleryComposition.makeView.withInputs>[0]
>[2]
const renderPie = (
  pieModel: (typeof PolarGalleryBlock.Model.Type)['pie'],
  previewModel: (typeof PolarGalleryBlock.Model.Type)['preview'],
  h: PolarViewBuilder,
) => {
  return h.block(
    Pie.embedView({
      slotId: 'pie',
      model: pieModel,
      viewInputs: pie.inputs('preview-pie', polarPreview(previewModel).pie),
    }),
  )
}
const renderRing = (
  ringModel: (typeof PolarGalleryBlock.Model.Type)['ring'],
  previewModel: (typeof PolarGalleryBlock.Model.Type)['preview'],
  h: PolarViewBuilder,
) => {
  return h.block(
    Ring.embedView({
      slotId: 'ring',
      model: ringModel,
      viewInputs: ring.inputs('preview-ring', polarPreview(previewModel).ring),
    }),
  )
}
const renderRadar = (
  radarModel: (typeof PolarGalleryBlock.Model.Type)['radar'],
  previewModel: (typeof PolarGalleryBlock.Model.Type)['preview'],
  h: PolarViewBuilder,
) => {
  return h.block(
    Radar.embedView({
      slotId: 'radar',
      model: radarModel,
      viewInputs: radar.inputs('preview-radar', polarPreview(previewModel).radar),
    }),
  )
}
const renderFunnel = (
  funnelModel: (typeof PolarGalleryBlock.Model.Type)['funnel'],
  previewModel: (typeof PolarGalleryBlock.Model.Type)['preview'],
  h: PolarViewBuilder,
) => {
  return h.block(
    Funnel.embedView({
      slotId: 'funnel',
      model: funnelModel,
      viewInputs: funnel.inputs('preview-funnel', polarPreview(previewModel).funnel),
    }),
  )
}
const renderHeatmap = (
  heatModel: (typeof PolarGalleryBlock.Model.Type)['heat'],
  previewModel: (typeof PolarGalleryBlock.Model.Type)['preview'],
  h: PolarViewBuilder,
) => {
  return h.block(
    Heat.embedView({
      slotId: 'heat',
      model: heatModel,
      viewInputs: heat.inputs('preview-heat', polarPreview(previewModel).heat),
    }),
  )
}
const renderLiveLine = (
  liveModel: (typeof PolarGalleryBlock.Model.Type)['live'],
  previewModel: (typeof PolarGalleryBlock.Model.Type)['preview'],
  h: PolarViewBuilder,
) => {
  return h.block(
    Live.embedView({
      slotId: 'live',
      model: liveModel,
      viewInputs: live.inputs('preview-live', polarPreview(previewModel).live),
    }),
  )
}
const makeView = () => {
  const previewCard = makePreviewCard()
  const body = createKeyedLazy()

  return PolarGalleryComposition.makeView.withInputs((model, inputs, h) => {
    const cards = {
      pie: () => body('pie', renderPie, [model.pie, model.preview, h]),
      ring: () => body('ring', renderRing, [model.ring, model.preview, h]),
      radar: () => body('radar', renderRadar, [model.radar, model.preview, h]),
      funnel: () => body('funnel', renderFunnel, [model.funnel, model.preview, h]),
      heatmap: () => body('heatmap', renderHeatmap, [model.heat, model.preview, h]),
      'live-line': () => body('live-line', renderLiveLine, [model.live, model.preview, h]),
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
  inMessageUpdate: PolarGalleryComposition.makeInMessageUpdate({
    InformedOfPreview: PolarGalleryBlock.makeFieldsStep.fromMessage(({ preview }) => ({
      preview: () => preview,
    })),
  }),
  init: PolarGalleryComposition.makeInit((preview) => ({
    model: { preview },
    childInitContext: preview,
  })),
  update: PolarGalleryComposition.makeUpdate({ Refreshed: PolarGalleryBlock.makeNoopStep() }),
}
const plans = Effect.gen(function* () {
  const children = yield* PolarGalleryComposition.acquireChildren()
  return { ...implementation, children, view: makeView() }
})
export const layer = PolarGalleryBlock.makeLayer(plans).pipe(
  Layer.provide(Layer.mergeAll(PieLayer, RingLayer, RadarLayer, FunnelLayer, HeatLayer, LiveLayer)),
)
