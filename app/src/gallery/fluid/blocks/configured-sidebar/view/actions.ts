import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import type { NavMenuViewInputs } from '@foldkit-visuals/fluid/nav-menu'
import { motion, highlight } from '../../../../../motion'
import type { ConfiguredSidebarModel } from '../block'
import type { ConfiguredSidebarViewBuilder } from '../composition'
import { SidebarHeaderActions, SidebarFooterActions } from '../action-bindings'
import { sidebarActionItems } from '../../../sidebar-action-data'
import { demoPresentation } from '../../../render-presentation'

export function sidebarActionRowsView(
  position: 'header' | 'footer',
  model: ConfiguredSidebarModel['sidebarHeaderActions'],
  context: ReturnType<typeof demoPresentation>,
  h: ConfiguredSidebarViewBuilder,
) {
  const definitions = sidebarActionItems[position]
  const viewInputs: NavMenuViewInputs = {
    context,
    animate: motion.node,
    highlight,
    kind: 'action',
    sidebar: true,
    icon: (item) => {
      const definition = definitions.find(({ label }) => label === item.value)
      return definition
        ? defaultIcons[definition.icon]({ size: 14, strokeWidth: 1.5 }, h)
        : undefined
    },
    rowTrailing: (item) => {
      const shortcut = definitions.find(({ label }) => label === item.value)?.shortcut
      return shortcut
        ? [
            h.span(
              [
                h.Class(
                  'ml-auto inline-flex opacity-0 transition-opacity duration-80 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100',
                ),
              ],
              [
                h.kbd(
                  [h.Class('font-sans text-[11px] leading-3.5 text-muted-foreground')],
                  [shortcut],
                ),
              ],
            ),
          ]
        : []
    },
    content: (menu) => menu.items.map((item) => menu.row(item.value)),
  }
  return h.block(
    position === 'header'
      ? SidebarHeaderActions.embedView({ slotId: 'sidebar-header-actions', model, viewInputs })
      : SidebarFooterActions.embedView({ slotId: 'sidebar-footer-actions', model, viewInputs }),
  )
}
