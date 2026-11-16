import { layer as ScrollAreaLayer } from '@foldkit-visuals/fluid/scroll-area'
import { layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import { layer as CardLayer } from '@foldkit-visuals/fluid/card'
import { menuLayer as DropdownMenuLayer } from '@foldkit-visuals/fluid/dropdown'
import { navMenuLayer } from '@foldkit-visuals/fluid/nav-menu'
import { layer as PresenceLayer } from '@foldkit-visuals/fluid/presence'
import { sidebarLayer } from '@foldkit-visuals/fluid/sidebar'
import { SidebarWorkspaceHeaderLayer } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarUserFooterLayer } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { Layer } from 'effect'
import { ConfiguredSidebarBlock } from './block'
import { makeView } from './composition'
import { MeasureSidebarCallout } from './callout-measure'
import { init } from './init'
import { update, inMessageUpdate } from './update'

export const layer = Layer.suspend(() =>
  ConfiguredSidebarBlock.makeLayer({
    init,
    update,
    inMessageUpdate,
    view: makeView(),
    EffectsLayer: MeasureSidebarCallout.layer,
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      ScrollAreaLayer,
      TooltipLayer,
      CardLayer,
      DropdownMenuLayer,
      navMenuLayer,
      PresenceLayer,
      sidebarLayer,
      SidebarWorkspaceHeaderLayer,
      SidebarUserFooterLayer,
    ),
  ),
)
