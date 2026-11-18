/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Layer } from 'effect'
import { SidebarWorkspaceHeaderLayer as WorkspaceLayer } from './sidebar-workspace-header.js'
import { SidebarUserFooterLayer as UserLayer } from './sidebar-user-footer.js'
import { layer as ScrollLayer } from './scroll-area.js'
import { navMenuLayer } from './nav-menu.js'
import { layer as TooltipsLayer } from './tooltip-native-public.js'
import { SidebarAppPanelBlock } from './sidebar-app-panel-definition.js'
import { init, update, inMessageUpdate, view } from './sidebar-app-panel-composition.js'
export { SidebarAppPanelBlock, SidebarAppPanelKey } from './sidebar-app-panel-definition.js'
export type { SidebarPanelConfig, SidebarPanelViewInputs } from './sidebar-app-panel-definition.js'

export const SidebarAppPanelLayer = SidebarAppPanelBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(
  Layer.provide(
    Layer.mergeAll(WorkspaceLayer, UserLayer, navMenuLayer, ScrollLayer, TooltipsLayer),
  ),
)
