import { PreviewOptions } from '../playground/options'
import { ComponentPresentation } from '../settings'
import { Schema } from 'effect'
import { AsyncData, Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { SiteEnvironment } from '../environment'
import { PlaygroundConfiguration } from '../playground/configuration'
import type { Html } from 'foldkit/html'
import { GalleryFlags } from '../gallery/flags'
import type { ResolvedSettings as Settings } from '../settings'
import { AuthoredExamplesBlock } from './authored'
import { PropControlBlock } from './control'
import { HoverBlock } from '@foldkit-visuals/fluid/hover'
import { HoverHighlightBlock } from '@foldkit-visuals/fluid/hover-highlight'
import { TabsBlock } from '@foldkit-visuals/fluid/tabs'
import { ScrollAreaBlock } from '@foldkit-visuals/fluid/scroll-area'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { ReferenceData } from './data'
import { InspectorBlock } from '../../../components/docs/inspector'
export const Reference = AsyncData.Schema(ReferenceData, Schema.String)

export interface ReferenceInputs {
  readonly reference: typeof Reference.schema.Type
  readonly renderPreview: () => Html
  readonly previewReady: boolean
  readonly settings: Settings
  readonly part?: 'content' | 'controls'
  readonly inlineControls?: boolean
}
export const Message = defineMessageUnion({
  UpdatedProp: {
    prop: Schema.String,
    value: Schema.Union([Schema.String, Schema.Finite, Schema.Boolean]),
  },
  PickedFile: { path: Schema.String },
  ToggledSource: {},
  RequestedShuffle: {},
  CompletedShuffle: {
    path: Schema.String,
    revision: Schema.Natural,
    configuration: PlaygroundConfiguration,
  },
  RequestedReset: {},
  CompletedSynchronizeConfigurationUrl: {},
  RequestedRetry: {},
})
export const OutMessage = defineMessageUnion({
  RequestedReload: { path: Schema.String },
  RequestedPreviewConfiguration: {
    path: Schema.String,
    configuration: PlaygroundConfiguration,
    presentation: Schema.optionalKey(ComponentPresentation),
    edited: Schema.optionalKey(Schema.Array(Schema.String)),
    intent: Schema.optionalKey(Schema.Literals(['initialize', 'edit', 'reconcile', 'reset'])),
  },
})
const key = Symbol('ComponentReference')
export const ComponentReferenceBlock = Block.make('ComponentReference', {
  key,
  InitArgs: Schema.Tuple([Schema.String, GalleryFlags, ComponentPresentation]),
  Context: Schema.Tuple([ComponentPresentation]),
  ChildInitContext: Schema.Struct({
    path: Schema.String,
    presentation: ComponentPresentation,
  }),
  Model: Schema.Struct({
    previewTabs: TabsBlock.Model,
    inspector: InspectorBlock.Model,
    shuffleTooltip: DocumentTooltipBlock.Model,
    apiScrolls: Schema.Array(Schema.Struct({ key: Schema.String, model: ScrollAreaBlock.Model })),
    controlsHover: HoverBlock.Model,
    controlsHighlight: HoverHighlightBlock.Model,
    authored: AuthoredExamplesBlock.Model,
    controls: Schema.Array(Schema.Struct({ key: Schema.String, model: PropControlBlock.Model })),
    path: Schema.String,
    configuration: PlaygroundConfiguration,
    revision: Schema.Natural,
    sourceFile: Schema.String,
    isSourceOpen: Schema.Boolean,
  }),
  InMessage: defineInMessageUnion({
    InformedOfAcceptedConfiguration: {
      path: Schema.String,
      configuration: PlaygroundConfiguration,
    },
    InformedOfPage: { path: Schema.String, presentation: ComponentPresentation },
    InformedOfApiContracts: { indexes: Schema.Array(Schema.Natural) },
    InformedOfLocation: { options: PreviewOptions, presentation: ComponentPresentation },
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  Message,
  OutMessage,
  inMessageOutputs: {
    InformedOfPage: { outMessage: OutMessage.RequestedPreviewConfiguration },
    InformedOfLocation: { outMessage: OutMessage.RequestedPreviewConfiguration },
    InformedOfPresentation: { outMessage: OutMessage.RequestedPreviewConfiguration },
  },
  effects: Block.makeEffectsContract<
    never,
    | SiteEnvironment
    | Block.FactsOf<typeof PropControlBlock>['programRequirements']
    | Block.FactsOf<typeof AuthoredExamplesBlock>['programRequirements']
    | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
  >(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ReferenceInputs>() },
})
