/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { DropdownResources } from './dropdown-resources.js'
import type { TooltipDom } from './tooltip-native-public.js'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { SidebarRenderInfo } from './sidebar/definition.js'
import type { Presentation } from './presentation.js'
import type { MotionOptions } from './motion.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import { NavMenuBlock } from './nav-menu.js'
import { DocumentTooltipBlock } from './tooltip-native-public.js'
import { SidebarWorkspaceHeaderBlock } from './sidebar-workspace-header.js'
import { SidebarUserFooterBlock } from './sidebar-user-footer.js'
import { ScrollAreaBlock } from './scroll-area.js'

export interface SidebarPanelConfig {
  readonly id: string
  readonly active?: string
  readonly occurrence: 'desktop' | 'mobile'
}

export interface SidebarPanelViewInputs extends Presentation {
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly highlight: HoverHighlightViewInputs['animate']
  readonly sidebar: SidebarRenderInfo
}

export const Model = Schema.Struct({
  tooltips: DocumentTooltipBlock.Model,
  id: Schema.String,
  occurrence: Schema.Literals(['desktop', 'mobile']),
  workspace: SidebarWorkspaceHeaderBlock.Model,
  user: SidebarUserFooterBlock.Model,
  actions: NavMenuBlock.Model,
  platform: NavMenuBlock.Model,
  navigation: NavMenuBlock.Model,
  scroll: ScrollAreaBlock.Model,
  active: Schema.String,
  platformOpen: Schema.Boolean,
  workspaceOpen: Schema.Boolean,
})

export const Message = defineMessageUnion({
  GroupChanged: { group: Schema.Literals(['platform', 'workspace']), open: Schema.Boolean },
})

export const OutMessage = defineMessageUnion({ Selected: { value: Schema.String } })

export const InMessage = defineInMessageUnion({ RequestedActive: { value: Schema.String } })

const Config = Schema.Struct({
  id: Schema.String,
  active: Schema.optionalKey(Schema.String),
  occurrence: Schema.Literals(['desktop', 'mobile']),
})

const effects = Block.makeEffectsContract<never, DropdownResources | TooltipDom>()

export const SidebarAppPanelKey = Symbol('SidebarAppPanel')

export const SidebarAppPanelBlock = Block.make('SidebarAppPanel', {
  key: SidebarAppPanelKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<SidebarPanelViewInputs>() },
  effects,
})
