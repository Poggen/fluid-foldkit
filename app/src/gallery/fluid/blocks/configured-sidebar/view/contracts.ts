import type { ConfiguredSidebarBlock, ConfiguredSidebarModel } from '../block'
import type { SidebarCalloutEvents } from './callouts'

export type Snapshot = Pick<
  ConfiguredSidebarModel,
  | 'sidebar'
  | 'sidebarScroll'
  | 'sidebarTooltips'
  | 'sidebarHeaderActions'
  | 'sidebarFooterActions'
  | 'threads'
  | 'sidebarWorkspace'
  | 'sidebarUser'
  | 'sidebarMenus'
  | 'sidebarCalloutPresence'
  | 'sidebarCallouts'
  | 'sidebarSections'
  | 'sidebarExpanded'
  | 'sidebarDismissedCallouts'
  | 'sidebarCalloutsHovered'
  | 'sidebarCalloutHeight'
  | 'sidebarAction'
  | 'threadSearch'
>
export type Events = SidebarCalloutEvents &
  Pick<
    typeof ConfiguredSidebarBlock.Message,
    'ToggledSidebarSection' | 'UpdatedSidebarAction' | 'UpdatedThreadSearch'
  >
