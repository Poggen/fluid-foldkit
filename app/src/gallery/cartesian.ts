import { createKeyedLazy } from 'foldkit/html'
import { initAndSet } from 'foldkit/binding'
import { GaugeBlock, GaugeLayer } from '@foldkit-visuals/charts/gauge'
import { cartesianPreview } from '../playground/cartesian'
import { PreviewOptions } from '../playground/options'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { chartPages } from '../../../lib/catalogue'
import type { ResolvedSettings as Settings } from '../settings'
import { makePreviewCard, previewBody, previewAdmitted } from './card'
import {
  area,
  AreaBlock,
  AreaLayer,
  bar,
  BarBlock,
  BarLayer,
  candle,
  CandleBlock,
  CandleLayer,
  composed,
  ComposedBlock,
  ComposedLayer,
  data,
  line,
  LineBlock,
  LineLayer,
  scatter,
  ScatterBlock,
  ScatterLayer,
} from './cartesian-definitions'
const key = Symbol('CartesianGallery')
export const CartesianGalleryBlock = Block.make('CartesianGallery', {
  key,
  InitArgs: Schema.Tuple([PreviewOptions]),
  InMessage: defineInMessageUnion({
    InformedOfPreview: { preview: PreviewOptions },
    InformedOfAdmission: { hrefs: Schema.Array(Schema.String) },
  }),
  Model: Schema.Struct({
    preview: PreviewOptions,
    gauge: Schema.Option(GaugeBlock.Model),
    line: Schema.Option(LineBlock.Model),
    area: Schema.Option(AreaBlock.Model),
    bar: Schema.Option(BarBlock.Model),
    composed: Schema.Option(ComposedBlock.Model),
    scatter: Schema.Option(ScatterBlock.Model),
    candle: Schema.Option(CandleBlock.Model),
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
const Gauge = CartesianGalleryBlock.makeOptionalFieldBinding(GaugeBlock, {
  field: 'gauge',
})
const Line = CartesianGalleryBlock.makeOptionalFieldBinding(LineBlock, {
  field: 'line',
})
const Area = CartesianGalleryBlock.makeOptionalFieldBinding(AreaBlock, {
  field: 'area',
})
const Bar = CartesianGalleryBlock.makeOptionalFieldBinding(BarBlock, {
  field: 'bar',
})
const Composed = CartesianGalleryBlock.makeOptionalFieldBinding(ComposedBlock, {
  field: 'composed',
})
const Scatter = CartesianGalleryBlock.makeOptionalFieldBinding(ScatterBlock, {
  field: 'scatter',
})
const Candle = CartesianGalleryBlock.makeOptionalFieldBinding(CandleBlock, {
  field: 'candle',
})
const CartesianGalleryComposition = CartesianGalleryBlock.makeComposition({
  bindings: [Gauge, Line, Area, Bar, Composed, Scatter, Candle],
})
const admitGauge = CartesianGalleryBlock.makeStep((model) =>
  Option.isSome(model.gauge)
    ? { model }
    : initAndSet(Gauge, model, {
        args: [
          {
            value: typeof model.preview.value === 'number' ? model.preview.value : 72,
            totalNotches: 48,
            orientation: model.preview.gaugeOrientation ?? 'arc',
            labelPlacement: model.preview.labelPlacement ?? 'bottom',
            labelAlign: model.preview.labelAlign ?? 'center',
            defaultLabel: 'Capacity',
            activeFill: 'var(--fluid-accent)',
            height: 210,
          },
          'preview-gauge',
        ],
      }),
)
const admitLine = CartesianGalleryBlock.makeStep((model) =>
  Option.isSome(model.line)
    ? { model }
    : initAndSet(Line, model, {
        args: ['preview-line', data, line.configuration(cartesianPreview(model.preview).line)],
      }),
)
const admitArea = CartesianGalleryBlock.makeStep((model) =>
  Option.isSome(model.area)
    ? { model }
    : initAndSet(Area, model, {
        args: ['preview-area', data, area.configuration(cartesianPreview(model.preview).area)],
      }),
)
const admitBar = CartesianGalleryBlock.makeStep((model) =>
  Option.isSome(model.bar)
    ? { model }
    : initAndSet(Bar, model, {
        args: ['preview-bar', data, bar.configuration(cartesianPreview(model.preview).bar)],
      }),
)
const admitComposed = CartesianGalleryBlock.makeStep((model) =>
  Option.isSome(model.composed)
    ? { model }
    : initAndSet(Composed, model, {
        args: [
          'preview-composed',
          data,
          composed.configuration(cartesianPreview(model.preview).composed),
        ],
      }),
)
const admitScatter = CartesianGalleryBlock.makeStep((model) =>
  Option.isSome(model.scatter)
    ? { model }
    : initAndSet(Scatter, model, {
        args: [
          'preview-scatter',
          data,
          scatter.configuration(cartesianPreview(model.preview).scatter),
        ],
      }),
)
const admitCandle = CartesianGalleryBlock.makeStep((model) =>
  Option.isSome(model.candle)
    ? { model }
    : initAndSet(Candle, model, {
        args: [
          'preview-candle',
          data,
          candle.configuration(cartesianPreview(model.preview).candle),
        ],
      }),
)
const admissionSteps = {
  gauge: admitGauge,
  line: admitLine,
  area: admitArea,
  bar: admitBar,
  composed: admitComposed,
  scatter: admitScatter,
  candlestick: admitCandle,
}
type CartesianViewBuilder = Parameters<
  Parameters<typeof CartesianGalleryComposition.makeView.withInputs>[0]
>[2]
const renderGauge = (gaugeModel: typeof GaugeBlock.Model.Type, h: CartesianViewBuilder) => {
  return h.block(Gauge.embedView({ slotId: 'gauge', model: gaugeModel, viewInputs: {} }))
}
const renderLine = (
  lineModel: typeof LineBlock.Model.Type,
  previewModel: (typeof CartesianGalleryBlock.Model.Type)['preview'],
  h: CartesianViewBuilder,
) => {
  return h.block(
    Line.embedView({
      slotId: 'line',
      model: lineModel,
      viewInputs: line.inputs('preview-line', cartesianPreview(previewModel).line),
    }),
  )
}
const renderArea = (
  areaModel: typeof AreaBlock.Model.Type,
  previewModel: (typeof CartesianGalleryBlock.Model.Type)['preview'],
  h: CartesianViewBuilder,
) => {
  return h.block(
    Area.embedView({
      slotId: 'area',
      model: areaModel,
      viewInputs: area.inputs('preview-area', cartesianPreview(previewModel).area),
    }),
  )
}
const renderBar = (
  barModel: typeof BarBlock.Model.Type,
  previewModel: (typeof CartesianGalleryBlock.Model.Type)['preview'],
  h: CartesianViewBuilder,
) => {
  return h.block(
    Bar.embedView({
      slotId: 'bar',
      model: barModel,
      viewInputs: bar.inputs('preview-bar', cartesianPreview(previewModel).bar),
    }),
  )
}
const renderComposed = (
  composedModel: typeof ComposedBlock.Model.Type,
  previewModel: (typeof CartesianGalleryBlock.Model.Type)['preview'],
  h: CartesianViewBuilder,
) => {
  return h.block(
    Composed.embedView({
      slotId: 'composed',
      model: composedModel,
      viewInputs: composed.inputs('preview-composed', cartesianPreview(previewModel).composed),
    }),
  )
}
const renderScatter = (
  scatterModel: typeof ScatterBlock.Model.Type,
  previewModel: (typeof CartesianGalleryBlock.Model.Type)['preview'],
  h: CartesianViewBuilder,
) => {
  return h.block(
    Scatter.embedView({
      slotId: 'scatter',
      model: scatterModel,
      viewInputs: scatter.inputs('preview-scatter', cartesianPreview(previewModel).scatter),
    }),
  )
}
const renderCandlestick = (
  candleModel: typeof CandleBlock.Model.Type,
  previewModel: (typeof CartesianGalleryBlock.Model.Type)['preview'],
  h: CartesianViewBuilder,
) => {
  return h.block(
    Candle.embedView({
      slotId: 'candle',
      model: candleModel,
      viewInputs: candle.inputs('preview-candle', cartesianPreview(previewModel).candle),
    }),
  )
}
const makeView = () => {
  const previewCard = makePreviewCard()
  const body = createKeyedLazy()

  return CartesianGalleryComposition.makeView.withInputs((model, inputs, h) => {
    const cards = {
      gauge: () =>
        Option.isSome(model.gauge) ? body('gauge', renderGauge, [model.gauge.value, h]) : h.empty,
      line: () =>
        Option.isSome(model.line)
          ? body('line', renderLine, [model.line.value, model.preview, h])
          : h.empty,
      area: () =>
        Option.isSome(model.area)
          ? body('area', renderArea, [model.area.value, model.preview, h])
          : h.empty,
      bar: () =>
        Option.isSome(model.bar)
          ? body('bar', renderBar, [model.bar.value, model.preview, h])
          : h.empty,
      composed: () =>
        Option.isSome(model.composed)
          ? body('composed', renderComposed, [model.composed.value, model.preview, h])
          : h.empty,
      scatter: () =>
        Option.isSome(model.scatter)
          ? body('scatter', renderScatter, [model.scatter.value, model.preview, h])
          : h.empty,
      candlestick: () =>
        Option.isSome(model.candle)
          ? body('candlestick', renderCandlestick, [model.candle.value, model.preview, h])
          : h.empty,
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
                previewBody(page, inputs, () => h.div([h.Class('w-full min-w-0')], [render()]), h),
                h,
                !previewAdmitted(page, inputs),
                inputs.only !== undefined,
              )
        }),
    )
  })
}
const implementation = {
  inMessageUpdate: CartesianGalleryComposition.makeInMessageUpdate({
    InformedOfAdmission: CartesianGalleryBlock.makeStep((_model, { hrefs }) =>
      Update.combineSteps(
        Object.entries(admissionSteps)
          .filter(([slug]) =>
            chartPages.some((page) => page.slug === slug && hrefs.includes(page.href)),
          )
          .map(([, step]) => step),
      ),
    ),
    InformedOfPreview: CartesianGalleryBlock.makeStep((model, { preview }) =>
      Update.combineSteps([
        CartesianGalleryBlock.makeFieldsStep(() => ({ preview: () => preview })),
        Option.isSome(model.gauge)
          ? Gauge.requestConfigure({
              configuration: {
                ...model.gauge.value.configuration,
                value: typeof preview.value === 'number' ? preview.value : 72,
                orientation: preview.gaugeOrientation ?? 'arc',
                labelPlacement: preview.labelPlacement ?? 'bottom',
                labelAlign: preview.labelAlign ?? 'center',
              },
            })
          : CartesianGalleryBlock.makeNoopStep(),
        Line.requestConfigure({
          configuration: line.configuration(cartesianPreview(preview).line),
        }),
        Area.requestConfigure({
          configuration: area.configuration(cartesianPreview(preview).area),
        }),
        Bar.requestConfigure({ configuration: bar.configuration(cartesianPreview(preview).bar) }),
        Composed.requestConfigure({
          configuration: composed.configuration(cartesianPreview(preview).composed),
        }),
        Scatter.requestConfigure({
          configuration: scatter.configuration(cartesianPreview(preview).scatter),
        }),
        Candle.requestConfigure({
          configuration: candle.configuration(cartesianPreview(preview).candle),
        }),
      ]),
    ),
  }),
  init: CartesianGalleryComposition.makeInit((preview) => ({
    model: {
      preview,
      gauge: Option.none(),
      line: Option.none(),
      area: Option.none(),
      bar: Option.none(),
      composed: Option.none(),
      scatter: Option.none(),
      candle: Option.none(),
    },
  })),
  update: CartesianGalleryComposition.makeUpdate({
    Refreshed: CartesianGalleryBlock.makeNoopStep(),
  }),
}
const plans = Effect.gen(function* () {
  const children = yield* CartesianGalleryComposition.acquireChildren()
  return { ...implementation, children, view: makeView() }
})
export const layer = CartesianGalleryBlock.makeLayer(plans).pipe(
  Layer.provide(
    Layer.mergeAll(
      GaugeLayer,
      LineLayer,
      AreaLayer,
      BarLayer,
      ComposedLayer,
      ScatterLayer,
      CandleLayer,
    ),
  ),
)
