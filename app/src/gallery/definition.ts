import { PreviewHeights } from './geometry'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { PreviewOptions } from '../playground/options'
import { PlaygroundConfiguration } from '../playground/configuration'
import { ComponentPresentation, type ResolvedSettings as Settings } from '../settings'
import { CartesianGalleryBlock } from './cartesian'
import { CompanionGalleryBlock } from './companions'
import { GalleryFlags } from './flags'
import { FlowGalleryBlock } from './flows'
import { FluidGalleryBlock } from './fluid'
import { PolarGalleryBlock } from './polar'
import { ComposerSamplesQuery } from '../reference/message-assets-query'
const key = Symbol('Gallery')
export const Message = defineMessageUnion({
  CompletedSignalReady: {},
  MeasuredPreviewHeights: { heights: PreviewHeights, admissionRevision: Schema.Natural },
  ObservedPreviews: { hrefs: Schema.Array(Schema.String), admissionRevision: Schema.Natural },
})
export const GalleryBlock = Block.make('Gallery', {
  key,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      ...GalleryFlags.fields,
      admissionRevision: Schema.optionalKey(Schema.Natural),
    }),
  ]),
  ChildInitContext: GalleryFlags,
  InMessage: defineInMessageUnion({
    RequestedAdmissionReset: {},
    InformedOfConfiguration: {
      configuration: PlaygroundConfiguration,
      presentation: ComponentPresentation,
      edited: Schema.optionalKey(Schema.Array(Schema.String)),
      intent: Schema.optionalKey(Schema.Literals(['initialize', 'edit', 'reconcile', 'reset'])),
      source: Schema.optionalKey(Schema.Literals(['location'])),
    },
    InformedOfPreview: { preview: PreviewOptions, presentation: ComponentPresentation },
    InformedOfPresentation: { presentation: ComponentPresentation },
    InformedOfViewport: { columns: Schema.Literals([1, 2, 3]) },
  }),
  Model: Schema.Struct({
    preview: PreviewOptions,
    previewHeights: PreviewHeights,
    reservedPreviewHeights: PreviewHeights,
    composerSamples: ComposerSamplesQuery.Model,
    embeddedConfiguration: Schema.Option(PlaygroundConfiguration),
    embeddedLocationConfiguration: Schema.Option(PlaygroundConfiguration),
    columns: Schema.NullOr(Schema.Literals([1, 2, 3])),
    isReady: Schema.Boolean,
    admitted: Schema.Array(Schema.String),
    admissionRevision: Schema.Natural,
    fluid: FluidGalleryBlock.Model,
    cartesian: CartesianGalleryBlock.Model,
    polar: PolarGalleryBlock.Model,
    flows: FlowGalleryBlock.Model,
    companions: CompanionGalleryBlock.Model,
  }),
  Message,
  OutMessage: defineMessageUnion({
    UpdatedAccent: { accent: Schema.String },
    AdmittedChartPreviews: {},
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof FluidGalleryBlock>['programRequirements']
    | Block.FactsOf<typeof ComposerSamplesQuery>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: Settings
      readonly only?: string
      readonly configuration?: PlaygroundConfiguration
    }>(),
  },
})
