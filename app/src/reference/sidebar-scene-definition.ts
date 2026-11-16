import { ScrollAreaBlock } from '@foldkit-visuals/fluid/scroll-area'
import { ComponentPresentation } from '../settings'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { SidebarBlock } from '@foldkit-visuals/fluid/sidebar'
import { SidebarWorkspaceHeaderBlock } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarUserFooterBlock } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { NavMenuBlock } from '@foldkit-visuals/fluid/nav-menu'
import { DropdownMenuBlock } from '@foldkit-visuals/fluid/dropdown'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { SidebarCalloutsBlock } from './sidebar-callouts'
export const Message = defineMessageUnion({
  UpdatedGroup: { group: Schema.String, open: Schema.Boolean },
  UpdatedCursor: { inside: Schema.Boolean },
  Observed: { visible: Schema.Boolean, axes: Schema.Array(Schema.Finite) },
})
const key = Symbol('SidebarScene')
export const Config = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  variant: Schema.Literals(['sidebar', 'floating', 'inset']),
  click: Schema.Boolean,
})
export const SidebarSceneBlock = Block.make('SidebarScene', {
  key,
  InitArgs: Schema.Tuple([Config]),
  ChildInitContext: Config,
  Model: Schema.Struct({
    id: Schema.String,
    kind: Schema.String,
    sidebar: SidebarBlock.Model,
    scroll: ScrollAreaBlock.Model,
    workspace: SidebarWorkspaceHeaderBlock.Model,
    user: SidebarUserFooterBlock.Model,
    navs: Schema.Record(Schema.String, NavMenuBlock.Model),
    menus: Schema.Record(Schema.String, DropdownMenuBlock.Model),
    tooltips: DocumentTooltipBlock.Model,
    callouts: SidebarCalloutsBlock.Model,
    groups: Schema.Record(Schema.String, Schema.Boolean),
    branches: Schema.Record(Schema.String, Schema.Boolean),
    isCursorInside: Schema.Boolean,
    isVisible: Schema.Boolean,
    axes: Schema.Array(Schema.Finite),
  }),
  Message,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SidebarBlock>['programRequirements']
    | Block.FactsOf<typeof SidebarWorkspaceHeaderBlock>['programRequirements']
    | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
    | Block.FactsOf<typeof SidebarCalloutsBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: ComponentPresentation
      readonly banner: boolean
      readonly height: number
    }>(),
  },
})
