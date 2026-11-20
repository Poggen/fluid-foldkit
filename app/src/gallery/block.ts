import {
  RamkaExampleBlock,
  layer as RamkaExampleLayer,
} from '../../../registry/ramka/examples/src/lightbox-example'
import { previewCard } from './card'
import { ramkaPages } from '../../../lib/catalogue'
import { PreviewHeights, previewLayoutKey } from './geometry'
import { reconcileEmbeddedLocation } from './embedded-configuration'
import { acceptConfiguration } from '../playground/configuration-acceptance'
import { observePreviews } from './preview-observer'
import { Effect, Layer, Schema, Stream, Option } from 'effect'
import { Update } from 'foldkit'
import { Query } from 'foldkit/experimental'
import { ComposerSamplesQuery } from '../reference/message-assets-query'
import { Result } from 'effect'
import { createLazy } from 'foldkit/html'
import { PreviewOptions } from '../playground/options'
import type { ResolvedSettings as Settings } from '../settings'
import {
  decodeConfiguration,
  legacyOptions,
  configurationForPage,
  type PlaygroundConfiguration,
} from '../playground/configuration'
import { chartPages, fluidPages } from '../../../lib/catalogue'
import { CartesianGalleryBlock, layer as CartesianLayer } from './cartesian'
import { CompanionGalleryBlock, layer as CompanionsLayer } from './companions'
import { GalleryBlock, Message } from './definition'
import { FlowGalleryBlock, layer as FlowsLayer } from './flows'
import { FluidGalleryBlock, layer as FluidLayer } from './fluid'
import { PolarGalleryBlock, layer as PolarLayer } from './polar'
export { GalleryBlock } from './definition'
const SignalReady = GalleryBlock.makeCommand('SignalReady', {
  messages: [Message.CompletedSignalReady],
  *handler() {
    return () => Effect.succeed(Message.CompletedSignalReady())
  },
})
const Fluid = GalleryBlock.makeRequiredFieldBinding(FluidGalleryBlock, {
  field: 'fluid',
  init: { contextToArgs: (flags) => [flags] },
}).withOutMessagePolicy({
  fold: GalleryBlock.makeOutMessageFold(FluidGalleryBlock, {
    UpdatedAccent: ({ accent }) =>
      GalleryBlock.makeStep((model) =>
        Update.withOutMessage({ model }, GalleryBlock.OutMessage.UpdatedAccent({ accent })),
      ),
  }),
})
const ComposerSamples = GalleryBlock.makeRequiredFieldBinding(ComposerSamplesQuery, {
  field: 'composerSamples',
}).withOutMessagePolicy({
  fold: GalleryBlock.makeOutMessageFold(ComposerSamplesQuery, {
    CompletedFetch: ({ result }) =>
      Result.isSuccess(result)
        ? Fluid.informOfComposerSamples({ files: result.success })
        : GalleryBlock.makeNoopStep(),
  }),
})
const Cartesian = GalleryBlock.makeRequiredFieldBinding(CartesianGalleryBlock, {
  field: 'cartesian',
  init: { contextToArgs: (flags) => [flags.preview ?? {}] },
})
const Polar = GalleryBlock.makeRequiredFieldBinding(PolarGalleryBlock, {
  field: 'polar',
  init: { contextToArgs: (flags) => [flags.preview ?? {}] },
})
const Flows = GalleryBlock.makeRequiredFieldBinding(FlowGalleryBlock, {
  field: 'flows',
  init: { contextToArgs: (flags) => [flags.preview ?? {}] },
})
const Companions = GalleryBlock.makeRequiredFieldBinding(CompanionGalleryBlock, {
  field: 'companions',
  init: { contextToArgs: (flags) => [flags.preview ?? {}] },
})
const ObservePreviews = GalleryBlock.makeMountStream('ObservePreviews', {
  args: { admissionRevision: Schema.Natural, heights: PreviewHeights, layout: Schema.String },
  messages: [Message.ObservedPreviews, Message.MeasuredPreviewHeights],
  *handler() {
    return ({ element, viewStateChanges, admissionRevision, heights, layout }) => {
      const root = element.parentElement
      if (root === null) throw new Error('Preview admission requires a live gallery root')
      return viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Paused'
            ? Stream.never
            : observePreviews(root, admissionRevision, heights, layout),
        ),
      )
    }
  },
})
const Ramka = GalleryBlock.makeRequiredFieldBinding(RamkaExampleBlock, { field: 'ramka' })
const GalleryComposition = GalleryBlock.makeComposition({
  bindings: [Fluid, Cartesian, Polar, Flows, Companions, ComposerSamples, Ramka],
  mounts: [ObservePreviews],
})
type GalleryHtml = Parameters<Parameters<typeof GalleryComposition.makeView.withInputs>[0]>[2]
const viewFluid = (
  model: typeof FluidGalleryBlock.Model.Type,
  settings: Settings,
  configuration: PlaygroundConfiguration | undefined,
  only: string | undefined,
  ready: boolean,
  admitted: ReadonlyArray<string>,
  h: GalleryHtml,
) =>
  h.block(
    Fluid.embedView({
      slotId: 'fluid-gallery',
      model,
      viewInputs: {
        settings,
        ...(configuration === undefined ? {} : { configuration }),
        ...(only === undefined ? {} : { only }),
        ready,
        admitted,
      },
    }),
  )
const viewCartesian = (
  model: typeof CartesianGalleryBlock.Model.Type,
  shape: Settings['shape'],
  size: Settings['size'],
  hover: Settings['hover'],
  only: string | undefined,
  ready: boolean,
  admitted: ReadonlyArray<string>,
  h: GalleryHtml,
) =>
  h.block(
    Cartesian.embedView({
      slotId: 'gallery-cartesian',
      model,
      viewInputs: {
        settings: { shape, size, hover },
        ...(only === undefined ? {} : { only }),
        ready,
        admitted,
      },
    }),
  )
const viewPolar = (
  model: typeof PolarGalleryBlock.Model.Type,
  shape: Settings['shape'],
  size: Settings['size'],
  hover: Settings['hover'],
  only: string | undefined,
  ready: boolean,
  admitted: ReadonlyArray<string>,
  h: GalleryHtml,
) =>
  h.block(
    Polar.embedView({
      slotId: 'gallery-polar',
      model,
      viewInputs: {
        settings: { shape, size, hover },
        ...(only === undefined ? {} : { only }),
        ready,
        admitted,
      },
    }),
  )
const viewFlows = (
  model: typeof FlowGalleryBlock.Model.Type,
  shape: Settings['shape'],
  size: Settings['size'],
  hover: Settings['hover'],
  only: string | undefined,
  ready: boolean,
  admitted: ReadonlyArray<string>,
  h: GalleryHtml,
) =>
  h.block(
    Flows.embedView({
      slotId: 'gallery-flows',
      model,
      viewInputs: {
        settings: { shape, size, hover },
        ...(only === undefined ? {} : { only }),
        ready,
        admitted,
      },
    }),
  )
const viewCompanions = (
  model: typeof CompanionGalleryBlock.Model.Type,
  shape: Settings['shape'],
  size: Settings['size'],
  hover: Settings['hover'],
  only: string | undefined,
  ready: boolean,
  admitted: ReadonlyArray<string>,
  h: GalleryHtml,
) =>
  h.block(
    Companions.embedView({
      slotId: 'gallery-companions',
      model,
      viewInputs: {
        settings: { shape, size, hover },
        ...(only === undefined ? {} : { only }),
        ready,
        admitted,
      },
    }),
  )

const makeView = () => {
  const lazyFluid = createLazy()
  const lazyCartesian = createLazy()
  const lazyPolar = createLazy()
  const lazyFlows = createLazy()
  const lazyCompanions = createLazy()
  return GalleryComposition.makeView.withInputs((model, inputs, h) => {
    const grid = h.keyed('div')(
      inputs.only ?? 'showcase',
      [
        h.Class(
          inputs.only === undefined
            ? `showcase-grid grid gap-3 bento-grid ${model.columns === null ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : ''}`
            : 'contents',
        ),
        h.DataAttribute('columns', String(model.columns ?? 'server')),
        ...(model.columns === null || inputs.only !== undefined
          ? []
          : [h.Style({ gridTemplateColumns: `repeat(${model.columns}, minmax(0, 1fr))` })]),

        h.DataAttribute('live-previews', String(model.isReady)),
      ],
      [
        h.keyed('span')(
          `${model.admissionRevision}:${previewLayoutKey(inputs.settings)}:${model.columns}`,
          [
            h.Class(['contents'].join(' ')),
            h.OnMount(
              ObservePreviews({
                admissionRevision: model.admissionRevision,
                heights: model.reservedPreviewHeights,
                layout: previewLayoutKey(inputs.settings),
              }),
            ),
          ],
        ),
        lazyFluid(viewFluid, [
          model.fluid,
          inputs.settings,
          inputs.configuration ?? Option.getOrUndefined(model.embeddedConfiguration),
          inputs.only,
          model.isReady,
          model.admitted,
          h,
        ]),
        lazyCartesian(viewCartesian, [
          model.cartesian,
          inputs.settings.shape,
          inputs.settings.size,
          inputs.settings.hover,
          inputs.only,
          model.isReady,
          model.admitted,
          h,
        ]),
        lazyPolar(viewPolar, [
          model.polar,
          inputs.settings.shape,
          inputs.settings.size,
          inputs.settings.hover,
          inputs.only,
          model.isReady,
          model.admitted,
          h,
        ]),
        lazyFlows(viewFlows, [
          model.flows,
          inputs.settings.shape,
          inputs.settings.size,
          inputs.settings.hover,
          inputs.only,
          model.isReady,
          model.admitted,
          h,
        ]),
        lazyCompanions(viewCompanions, [
          model.companions,
          inputs.settings.shape,
          inputs.settings.size,
          inputs.settings.hover,
          inputs.only,
          model.isReady,
          model.admitted,
          h,
        ]),
        ...ramkaPages
          .filter((page) => inputs.only === undefined || inputs.only === page.slug)
          .map((page) =>
            previewCard(
              page,
              inputs.settings,
              h.block(Ramka.embedView({ slotId: 'ramka-example', model: model.ramka })),
              h,
              false,
              inputs.only !== undefined,
            ),
          ),
      ],
    )
    return inputs.only === undefined
      ? h.div([h.Class('w-full max-w-[1200px] mx-auto px-6 pb-16')], [grid])
      : grid
  })
}
const previewEqual = Schema.toEquivalence(PreviewOptions)
const implementation = {
  inMessageUpdate: GalleryComposition.makeInMessageUpdate({
    RequestedAdmissionReset: GalleryBlock.makeFieldsStep((model) => ({
      admitted: () => [],
      admissionRevision: () => model.admissionRevision + 1,
    })),
    InformedOfConfiguration: GalleryBlock.makeStep((model, message) => {
      const location =
        message.source === 'location'
          ? reconcileEmbeddedLocation(
              model.embeddedLocationConfiguration,
              message.configuration,
              model.embeddedConfiguration,
            )
          : undefined
      const configuration = location?.configuration ?? message.configuration
      const edited = location === undefined ? message.edited : location.edited
      const intent = location?.intent ?? message.intent
      return Update.combineSteps([
        ...(location === undefined
          ? []
          : [
              GalleryBlock.makeFieldsStep(() => ({
                embeddedLocationConfiguration: () => Option.some(message.configuration),
                embeddedConfiguration: () => Option.some(configuration),
              })),
            ]),
        ...(configuration._tag === 'chart'
          ? [
              GalleryBlock.makeFieldsStep(() => ({ preview: () => configuration.options })),
              Cartesian.informOfPreview({ preview: configuration.options }),
              Polar.informOfPreview({ preview: configuration.options }),
              Flows.informOfPreview({ preview: configuration.options }),
              Companions.informOfPreview({ preview: configuration.options }),
              Cartesian.informOfAdmission({
                hrefs: chartPages
                  .filter((page) => page.slug === configuration.slug)
                  .map((page) => page.href),
              }),
            ]
          : [
              ...(configuration._tag === 'input-message' &&
              (edited === undefined || edited.includes('attachments'))
                ? [
                    configuration.attachments
                      ? ComposerSamples.requestRevalidationOrLoad()
                      : ComposerSamples.requestReset(),
                  ]
                : []),
              Fluid.informOfConfiguration({
                configuration,
                presentation: message.presentation,
                ...(edited === undefined ? {} : { edited }),
                ...(intent === undefined ? {} : { intent }),
              }),
            ]),
      ])
    }),
    InformedOfPreview: GalleryBlock.makeStep((model, { preview, presentation }) =>
      previewEqual(model.preview, preview)
        ? Fluid.informOfPresentation({ presentation })
        : Update.combineSteps([
            GalleryBlock.makeFieldsStep(() => ({ preview: () => preview })),

            Cartesian.informOfPreview({ preview }),
            Polar.informOfPreview({ preview }),
            Flows.informOfPreview({ preview }),
            Companions.informOfPreview({ preview }),
          ]),
    ),
    InformedOfPresentation: GalleryBlock.makeStep((model, { presentation }) =>
      Option.isSome(model.embeddedConfiguration) &&
      model.embeddedConfiguration.value._tag !== 'chart'
        ? Fluid.informOfConfiguration({
            configuration: model.embeddedConfiguration.value,
            presentation,
            edited: [],
            intent: 'reconcile',
          })
        : Fluid.informOfPresentation({ presentation }),
    ),
    InformedOfViewport: GalleryBlock.makeStep((model, { columns }) =>
      model.columns === columns
        ? { model }
        : Update.combineSteps([
            GalleryBlock.makeFieldsStep(() => ({ columns: () => columns })),
            Fluid.informOfViewport({ narrow: columns === 1 }),
          ]),
    ),
  }),
  EffectsLayer: Layer.mergeAll(SignalReady.layer, ObservePreviews.layer),
  init: GalleryComposition.makeInit((flags) => {
    const legacyPage = fluidPages.find((page) => page.slug === flags.componentSlug)
    const embeddedConfiguration =
      flags.preview?.configuration === undefined
        ? legacyPage === undefined
          ? Option.none()
          : Option.some(configurationForPage(legacyPage, flags.preview ?? {}))
        : decodeConfiguration(flags.preview.configuration)
    const preview = Option.isSome(embeddedConfiguration)
      ? legacyOptions(embeddedConfiguration.value)
      : (flags.preview ?? {})
    return {
      model: {
        isReady: false,
        previewHeights: flags.previewHeights ?? {},
        reservedPreviewHeights: flags.previewHeights ?? {},
        preview,
        embeddedConfiguration,
        embeddedLocationConfiguration: Option.none(),
        columns: null,
        admitted: fluidPages.slice(0, 5).map((page) => page.href),
        admissionRevision: flags.admissionRevision ?? 0,
      },
      childInitContext: { ...flags, preview: {} },
      steps: [Cartesian.informOfPreview({ preview })],
      commands: [SignalReady()],
    }
  }),
  update: GalleryComposition.makeUpdate.compose(
    GalleryComposition.makeUpdate({
      MeasuredPreviewHeights: GalleryBlock.makeStep((model, { heights, admissionRevision }) => {
        if (
          admissionRevision !== model.admissionRevision ||
          Object.entries(heights).every(
            ([key, height]) =>
              model.previewHeights[key]?.width === height.width &&
              model.previewHeights[key]?.layout === height.layout &&
              model.previewHeights[key]?.height === height.height,
          )
        )
          return { model }
        return GalleryBlock.makeFieldsStep(() => ({
          previewHeights: () => ({ ...model.previewHeights, ...heights }),
        }))
      }),
      ObservedPreviews: GalleryBlock.makeStep((model, { hrefs, admissionRevision }) => {
        if (admissionRevision !== model.admissionRevision) return { model }
        const admitted = [...new Set([...model.admitted, ...hrefs])]
        if (admitted.length === model.admitted.length) return { model }
        const admittedChart = chartPages.some(
          (page) => admitted.includes(page.href) && !model.admitted.includes(page.href),
        )
        const steps = Update.combineSteps([
          GalleryBlock.makeFieldsStep(() => ({ admitted: () => admitted })),
          Cartesian.informOfAdmission({ hrefs }),
        ])
        return (registered: Parameters<typeof steps>[0]) =>
          Update.withOutMessage(
            steps(registered),
            admittedChart ? GalleryBlock.OutMessage.AdmittedChartPreviews() : undefined,
          )
      }),
      CompletedSignalReady: GalleryBlock.makeFieldsStep(() => ({ isReady: () => true })),
    }),
    GalleryComposition.makeUpdate.each((model, _message, { before }) => {
      const embedded = model.embeddedConfiguration
      if (Option.isNone(embedded) || before.fluid === model.fluid) return { model }
      const configuration = acceptConfiguration(embedded.value, before.fluid, model.fluid)
      return configuration === embedded.value
        ? { model }
        : { model: { ...model, embeddedConfiguration: Option.some(configuration) } }
    }),
  ),
}
const plans = Effect.gen(function* () {
  const children = yield* GalleryComposition.acquireChildren()
  return { ...implementation, children, view: makeView() }
})
export const layer = GalleryBlock.makeLayer(plans).pipe(
  Layer.provide(
    Layer.mergeAll(
      Query.layer,
      FluidLayer,
      CartesianLayer,
      PolarLayer,
      FlowsLayer,
      CompanionsLayer,
      RamkaExampleLayer,
    ),
  ),
)

export { configurationForEmbeddedPage } from './embedded-configuration'

export const test = { Fluid, ComposerSamples }
