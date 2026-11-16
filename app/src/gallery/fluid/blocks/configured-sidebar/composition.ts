import { Block } from 'foldkit'
import { ConfiguredSidebarBlock } from './block'
import {
  Sidebar,
  SidebarScroll,
  SidebarTooltips,
  Threads,
  SidebarWorkspace,
  SidebarUser,
  SidebarMenus,
  SidebarCallouts,
  SidebarCalloutPresence,
} from './bindings'
import { SidebarHeaderActions, SidebarFooterActions } from './action-bindings'
import { MeasureSidebarCallout } from './callout-measure'
import { makeSidebarPlaygroundView } from './view'

export const ConfiguredSidebarComposition = ConfiguredSidebarBlock.makeComposition({
  mounts: [MeasureSidebarCallout],
  bindings: [
    Sidebar,
    SidebarScroll,
    SidebarTooltips,
    Threads,
    SidebarWorkspace,
    SidebarUser,
    SidebarHeaderActions,
    SidebarFooterActions,
    SidebarMenus,
    SidebarCallouts,
    SidebarCalloutPresence,
  ],
})
export type ConfiguredSidebarViewBuilder = Block.ViewBuilderFor<typeof ConfiguredSidebarComposition>
export const makeView = () => {
  const sidebar = makeSidebarPlaygroundView(ConfiguredSidebarBlock.Message)
  return ConfiguredSidebarComposition.makeView.withInputs((model, inputs, h) =>
    sidebar(model, inputs.configuration, inputs.presentation, h),
  )
}
