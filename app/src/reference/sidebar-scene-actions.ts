import type { SidebarRenderInfo } from '@foldkit-visuals/fluid/sidebar'
import { SidebarTrigger, SidebarToggleTooltipContent } from '@foldkit-visuals/fluid/sidebar/parts'
import { SidebarInsetTopbar } from '@foldkit-visuals/fluid/sidebar/inset-topbar'
import { motion } from '../motion'
import type { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { Button } from '@foldkit-visuals/fluid/button'
import { SidebarAction } from '@foldkit-visuals/fluid/sidebar/parts'
import type { SidebarActionContext } from '@foldkit-visuals/fluid/sidebar/parts'
import { resolvePresentation, type PresentationContext } from '@foldkit-visuals/fluid/presentation'
import { defaultIcons, type IconName } from '@foldkit-visuals/fluid/icons'
import type { SidebarSceneBlock } from './sidebar-scene-definition'
import { Composition, Tooltips } from './sidebar-scene-composition'

export const sidebarSceneAction = (
  model: typeof SidebarSceneBlock.Model.Type,
  context: PresentationContext,
  h: Block.ViewBuilderFor<typeof Composition>,
  key: string,
  label: string,
  icon: IconName,
  moreClass = '',
  actionContext?: SidebarActionContext,
) => {
  return h.block(
    Tooltips.embedView({
      slotId: `${model.id}-${key}-trigger`,
      model: model.tooltips,
      viewInputs: {
        part: 'triggers',
        renderTrigger: (_key, { button }) => {
          const attributes = [h.DataAttribute('guide', '')]
          const children = [defaultIcons[icon]({ size: 16 }, h)]
          if (actionContext !== undefined) {
            return SidebarAction(
              {
                label,
                actionContext,
                attributes,
                children,
                render: (attributes, children) =>
                  button(
                    attributes.flatMap((attribute) =>
                      '__childAttribute' in attribute ? [attribute] : childAttributes([attribute]),
                    ),
                    children,
                  ),
              },
              h,
            )
          }
          return Button(
            {
              context,
              variant: 'ghost',
              buttonSize: 'icon-compact',
              className: `shrink-0 ${moreClass}`,
              attributes: [...attributes, h.AriaLabel(label)],
              children,
              render: (attributes, children) =>
                button(
                  attributes.flatMap((attribute) =>
                    '__childAttribute' in attribute ? [attribute] : childAttributes([attribute]),
                  ),
                  children,
                ),
            },
            h,
          )
        },
        render: ({ tooltip }) => tooltip(key),
      },
    }),
  )
}

export const sidebarSceneInset = (
  model: typeof SidebarSceneBlock.Model.Type,
  sidebar: SidebarRenderInfo,
  context: PresentationContext,
  h: Block.ViewBuilderFor<typeof Composition>,
) =>
  h.block(
    Tooltips.embedView({
      slotId: `${model.id}-inset-trigger`,
      model: model.tooltips,
      viewInputs: {
        renderTrigger: (_key, { button }) =>
          SidebarTrigger(
            {
              context,
              button,
              side: sidebar.side,
              attributes: sidebar.trigger,
              className: `transition-opacity delay-200 duration-160 ${sidebar.peeking ? 'opacity-0' : 'opacity-100'}`,
            },
            h,
          ),
        renderContent: () => SidebarToggleTooltipContent(sidebar.open, sidebar.shortcutKey, h),
        render: ({ tooltip }) =>
          tooltip(`${model.id}-inset-trigger`, {
            shapeClass: resolvePresentation({ context }).shape.item,
            animate: motion.node,
            portalContainerId: `${model.id}-frame`,
            reducedMotion: 'user',
          }),
        renderDocument: (trigger, popups) => SidebarInsetTopbar({ trigger, children: popups }, h),
      },
    }),
  )
