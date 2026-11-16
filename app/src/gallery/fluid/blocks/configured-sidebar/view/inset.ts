import type { SidebarRenderInfo } from '@foldkit-visuals/fluid/sidebar'
import { SidebarTrigger, SidebarToggleTooltipContent } from '@foldkit-visuals/fluid/sidebar/parts'
import { resolvePresentation, type PresentationContext } from '@foldkit-visuals/fluid/presentation'
import { SidebarTooltips } from '../bindings'
import type { ConfiguredSidebarModel } from '../block'
import type { ConfiguredSidebarViewBuilder } from '../composition'
import { motion } from '../../../../../motion'

export const sidebarInsetTrigger = (
  info: SidebarRenderInfo,
  context: PresentationContext,
  sidebarTooltips: ConfiguredSidebarModel['sidebarTooltips'],
  action: string,
  h: ConfiguredSidebarViewBuilder,
) =>
  h.block(
    SidebarTooltips.embedView({
      slotId: 'sidebar-inset-trigger',
      model: sidebarTooltips,
      viewInputs: {
        renderTrigger: (_key, { button }) =>
          SidebarTrigger(
            {
              context,
              button,
              side: info.side,
              attributes: info.trigger,
              className: `transition-opacity delay-200 duration-160 ${info.peeking ? 'opacity-0' : 'opacity-100'}`,
            },
            h,
          ),
        renderContent: () => SidebarToggleTooltipContent(info.open, info.shortcutKey, h),
        render: ({ tooltip }) =>
          tooltip('preview-sidebar-inset-trigger', {
            shapeClass: resolvePresentation({ context }).shape.item,
            animate: motion.node,
            reducedMotion: 'user',
          }),
        renderDocument: (trigger, popups) =>
          h.div(
            [h.Class('flex h-12 shrink-0 items-center gap-2 px-1.5')],
            [trigger, h.span([h.AriaLive('polite')], [action]), ...popups],
          ),
      },
    }),
  )
