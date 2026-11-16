import { ScrollAreaBlock } from '@foldkit-visuals/fluid/scroll-area'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { CardGroupBlock } from '@foldkit-visuals/fluid/card'
import { DropdownMenuBlock } from '@foldkit-visuals/fluid/dropdown'
import { NavMenuBlock } from '@foldkit-visuals/fluid/nav-menu'
import { PresenceBlock } from '@foldkit-visuals/fluid/presence'
import { SidebarBlock } from '@foldkit-visuals/fluid/sidebar'
import { SidebarWorkspaceHeaderBlock } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarUserFooterBlock } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { Configuration } from '../../../../playground/configs/sidebar'
import { ComponentPresentation } from '../../../../settings'

export interface ConfiguredSidebarInputs {
  readonly configuration: Configuration
  readonly presentation: ComponentPresentation
}
const Model = Schema.Struct({
  sidebarSections: Schema.Record(Schema.String, Schema.Boolean),
  sidebarExpanded: Schema.Record(Schema.String, Schema.Boolean),
  sidebarMenus: Schema.Array(Schema.Struct({ id: Schema.String, model: DropdownMenuBlock.Model })),
  sidebarCallouts: CardGroupBlock.Model,
  sidebarCalloutPresence: Schema.Array(
    Schema.Struct({ id: Schema.String, model: PresenceBlock.Model }),
  ),
  sidebarDismissedCallouts: Schema.Array(Schema.String),
  sidebarCalloutsHovered: Schema.Boolean,
  sidebarCalloutHeight: Schema.Finite,
  sidebarAction: Schema.String,
  sidebar: SidebarBlock.Model,
  sidebarScroll: ScrollAreaBlock.Model,
  sidebarTooltips: DocumentTooltipBlock.Model,
  threads: NavMenuBlock.Model,
  sidebarWorkspace: SidebarWorkspaceHeaderBlock.Model,
  sidebarUser: SidebarUserFooterBlock.Model,
  sidebarHeaderActions: NavMenuBlock.Model,
  sidebarFooterActions: NavMenuBlock.Model,
  threadSearch: Schema.String,
})
type Model = typeof Model.Type

const key = Symbol('ConfiguredSidebar')
export const ConfiguredSidebarBlock = Block.make('ConfiguredSidebar', {
  key,
  InitArgs: Schema.Tuple([]),
  Model,
  Message: defineMessageUnion({
    ToggledSidebarSection: { id: Schema.String, open: Schema.Boolean },
    UpdatedSidebarAction: { action: Schema.String },
    DismissedSidebarCallout: { id: Schema.String },
    MeasuredSidebarCallout: { height: Schema.Finite },
    HoveredSidebarCallouts: { hovered: Schema.Boolean },
    UpdatedThreadSearch: { value: Schema.String },
  }),
  InMessage: defineInMessageUnion({
    InformedOfConfiguration: {
      configuration: Configuration,
      presentation: ComponentPresentation,
      edited: Schema.optionalKey(Schema.Array(Schema.String)),
      intent: Schema.optionalKey(Schema.Literals(['initialize', 'edit', 'reconcile', 'reset'])),
    },
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SidebarBlock>['programRequirements']
    | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
    | Block.FactsOf<typeof DropdownMenuBlock>['programRequirements']
    | Block.FactsOf<typeof CardGroupBlock>['programRequirements']
  >(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ConfiguredSidebarInputs>() },
})
export type ConfiguredSidebarModel = typeof ConfiguredSidebarBlock.Model.Type
export const {
  makeStep,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeKeyedArrayBinding,
} = ConfiguredSidebarBlock
