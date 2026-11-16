import { createKeyedLazy } from 'foldkit/html'
import { flowPreview } from '../playground/flows'
import { PreviewOptions } from '../playground/options'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { chartPages } from '../../../lib/catalogue'
import type { ResolvedSettings as Settings } from '../settings'
import { makePreviewCard, previewBody, previewAdmitted } from './card'
import {
  map,
  MapBlock,
  MapLayer,
  sankey,
  SankeyBlock,
  SankeyLayer,
  sunburst,
  SunburstBlock,
  SunLayer,
} from './flow-definitions'
const key = Symbol('FlowGallery')
const Message = defineMessageUnion({
  FocusedSun: { id: Schema.NullOr(Schema.String) },
  HoveredSun: { index: Schema.NullOr(Schema.Int) },
  FocusedNode: { index: Schema.NullOr(Schema.Int) },
  FocusedLink: { index: Schema.NullOr(Schema.Int) },
  HoveredMap: { index: Schema.NullOr(Schema.Int) },
  TransformedMap: { scale: Schema.Finite, x: Schema.Finite, y: Schema.Finite },
})
export const FlowGalleryBlock = Block.make('FlowGallery', {
  key,
  InitArgs: Schema.Tuple([PreviewOptions]),
  ChildInitContext: PreviewOptions,
  InMessage: defineInMessageUnion({ InformedOfPreview: { preview: PreviewOptions } }),
  Model: Schema.Struct({
    preview: PreviewOptions,
    sun: SunburstBlock.Model,
    sankey: SankeyBlock.Model,
    map: MapBlock.Model,
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
const Sun = FlowGalleryBlock.makeRequiredFieldBinding(SunburstBlock, {
  field: 'sun',
  init: { contextToArgs: () => ['preview-sunburst'] },
}).withOutMessagePolicy({
  fold: FlowGalleryBlock.makeOutMessageFold(SunburstBlock, {
    FocusChanged: FlowGalleryBlock.makeNoopStep,
    HoverChanged: FlowGalleryBlock.makeNoopStep,
  }),
})
const Sankey = FlowGalleryBlock.makeRequiredFieldBinding(SankeyBlock, {
  field: 'sankey',
  init: { contextToArgs: () => ['preview-sankey'] },
}).withOutMessagePolicy({
  fold: FlowGalleryBlock.makeOutMessageFold(SankeyBlock, {
    NodeHoverChanged: FlowGalleryBlock.makeNoopStep,
    NodeHoverRequested: FlowGalleryBlock.makeNoopStep,
  }),
})
const Map = FlowGalleryBlock.makeRequiredFieldBinding(MapBlock, {
  field: 'map',
  init: {
    contextToArgs: (options) => ['preview-map', map.configuration(flowPreview(options).map)],
  },
})
const FlowGalleryComposition = FlowGalleryBlock.makeComposition({ bindings: [Sun, Sankey, Map] })
type FlowViewBuilder = Parameters<
  Parameters<typeof FlowGalleryComposition.makeView.withInputs>[0]
>[2]
const renderSunburst = (
  sunModel: (typeof FlowGalleryBlock.Model.Type)['sun'],
  previewModel: (typeof FlowGalleryBlock.Model.Type)['preview'],
  h: FlowViewBuilder,
) => {
  return h.block(
    Sun.embedView({
      slotId: 'sunburst',
      model: sunModel,
      viewInputs: sunburst.inputs('preview-sunburst', flowPreview(previewModel).sun, {
        focus: (id) => Message.FocusedSun({ id }),
        hover: (index) => Message.HoveredSun({ index }),
      }),
    }),
  )
}
const renderSankey = (
  sankeyModel: (typeof FlowGalleryBlock.Model.Type)['sankey'],
  previewModel: (typeof FlowGalleryBlock.Model.Type)['preview'],
  h: FlowViewBuilder,
) => {
  return h.block(
    Sankey.embedView({
      slotId: 'sankey',
      model: sankeyModel,
      viewInputs: sankey.inputs<typeof Message.Type>(
        'preview-sankey',
        flowPreview(previewModel).sankey,
        {
          focusNode: (index) => Message.FocusedNode({ index }),
          focusLink: (index) => Message.FocusedLink({ index }),
        },
      ),
    }),
  )
}
const renderChoropleth = (
  mapModel: (typeof FlowGalleryBlock.Model.Type)['map'],
  previewModel: (typeof FlowGalleryBlock.Model.Type)['preview'],
  h: FlowViewBuilder,
) => {
  return h.block(
    Map.embedView({
      slotId: 'map',
      model: mapModel,
      viewInputs: map.inputs<typeof Message.Type>('preview-map', flowPreview(previewModel).map, {
        hover: (index) => Message.HoveredMap({ index }),
        transform: (scale, x, y) => Message.TransformedMap({ scale, x, y }),
      }),
    }),
  )
}
const makeView = () => {
  const previewCard = makePreviewCard()
  const body = createKeyedLazy()
  return FlowGalleryComposition.makeView.withInputs((model, inputs, h) => {
    const cards = {
      sunburst: () => body('sunburst', renderSunburst, [model.sun, model.preview, h]),
      sankey: () => body('sankey', renderSankey, [model.sankey, model.preview, h]),
      choropleth: () => body('choropleth', renderChoropleth, [model.map, model.preview, h]),
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
  inMessageUpdate: FlowGalleryComposition.makeInMessageUpdate({
    InformedOfPreview: FlowGalleryBlock.makeFieldsStep.fromMessage(({ preview }) => ({
      preview: () => preview,
    })),
  }),
  init: FlowGalleryComposition.makeInit((preview) => ({
    model: { preview },
    childInitContext: preview,
  })),
  update: FlowGalleryComposition.makeUpdate({
    FocusedSun: FlowGalleryBlock.makeStep.fromMessage(({ id }) => Sun.requestFocus({ id })),
    HoveredSun: FlowGalleryBlock.makeStep.fromMessage(({ index }) => Sun.requestHover({ index })),
    FocusedNode: FlowGalleryBlock.makeStep.fromMessage(({ index }) =>
      Sankey.requestFocus({ kind: 'node', index }),
    ),
    FocusedLink: FlowGalleryBlock.makeStep.fromMessage(({ index }) =>
      Sankey.requestFocus({ kind: 'link', index }),
    ),
    HoveredMap: FlowGalleryBlock.makeStep.fromMessage(({ index }) => Map.requestHover({ index })),
    TransformedMap: FlowGalleryBlock.makeStep.fromMessage(({ scale, x, y }) =>
      Map.requestTransform({ scale, x, y }),
    ),
  }),
}
const plans = Effect.gen(function* () {
  const children = yield* FlowGalleryComposition.acquireChildren()
  return { ...implementation, children, view: makeView() }
})
export const layer = FlowGalleryBlock.makeLayer(plans).pipe(
  Layer.provide(Layer.mergeAll(SunLayer, SankeyLayer, MapLayer)),
)
