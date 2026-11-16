import {
  BreadcrumbButton,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from '@foldkit-visuals/fluid/breadcrumb'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { childAttributes } from 'foldkit/html'
import * as BreadcrumbConfiguration from '../../playground/configs/breadcrumb'
import { motion, target } from '../../motion'
import type { FluidGalleryInputs, FluidGalleryModel, FluidGalleryBlock } from './block'
import type { FluidViewBuilder } from './composition'
import { Breadcrumb, CrumbHidden, CrumbMenu } from './details-bindings'
import { demoPresentation } from './render-presentation'

const sections = BreadcrumbConfiguration.breadcrumbChoices
export const renderBreadcrumb = (
  breadcrumb: FluidGalleryModel['breadcrumb'],
  crumbHidden: FluidGalleryModel['crumbHidden'],
  crumbMenu: FluidGalleryModel['crumbMenu'],
  crumbSection: FluidGalleryModel['crumbSection'],
  configuration: BreadcrumbConfiguration.Configuration,
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
  stay: typeof FluidGalleryBlock.Message.Refreshed,
) => {
  const context = demoPresentation(shape, size, hover)
  const items = BreadcrumbConfiguration.visibleItems(configuration)
  const dropdownIndex = BreadcrumbConfiguration.dropdownIndex(configuration)
  return h.block(
    Breadcrumb.embedView({
      slotId: 'breadcrumb',
      model: breadcrumb,
      viewInputs: {
        context,
        className: 'w-full max-w-md min-w-0',
        animate: target.node,
        ...(configuration.separator === 'slash' ? { separator: '/' } : {}),
        content: (crumbs) => [
          BreadcrumbList(
            {
              context,
              className: 'justify-center',
              children: items.flatMap((item, index) => {
                if (index > 0 && index <= crumbs.hiddenCount) return []
                const icon = configuration.icons ? [defaultIcons[item.icon]({}, h)] : []
                const id = `preview-crumb-${item.id}`
                const content =
                  index === items.length - 1
                    ? BreadcrumbPage({ id, children: [...icon, item.label] }, crumbs, h)
                    : index === dropdownIndex
                      ? h.block(
                          CrumbMenu.embedView({
                            slotId: 'crumb-menu',
                            model: crumbMenu,
                            viewInputs: {
                              context,
                              animate: motion.node,
                              openOnHover: configuration.openOnHover,
                              trigger: (attributes) =>
                                BreadcrumbButton(
                                  {
                                    id,
                                    attributes,
                                    children: [
                                      ...icon,
                                      crumbSection === null
                                        ? item.label
                                        : (sections[crumbSection] ?? item.label),
                                    ],
                                  },
                                  crumbs,
                                  h,
                                ),
                              content: (menu) =>
                                sections.map((label, menuIndex) =>
                                  DropdownItem(
                                    {
                                      index: menuIndex,
                                      label,
                                      checked: crumbSection === menuIndex,
                                      animate: target.node,
                                    },
                                    menu,
                                    h,
                                  ),
                                ),
                            },
                          }),
                        )
                      : BreadcrumbLink(
                          {
                            id,
                            href: '#',
                            attributes: childAttributes([
                              h.OnClick(stay(), { defaultAction: 'Prevent' }),
                            ]),
                            children: [...icon, item.label],
                          },
                          crumbs,
                          h,
                        )
                const hidden =
                  index === 0 && crumbs.hiddenCount > 0
                    ? BreadcrumbItem(
                        {
                          children: [
                            configuration.reveal === 'expand'
                              ? crumbs.toggle()
                              : h.block(
                                  CrumbHidden.embedView({
                                    slotId: 'crumb-hidden',
                                    model: crumbHidden,
                                    viewInputs: {
                                      context,
                                      animate: motion.node,
                                      openOnHover: configuration.openOnHover,
                                      trigger: (attributes) =>
                                        BreadcrumbButton(
                                          {
                                            id: 'preview-crumb-hidden-trigger',
                                            attributes: [
                                              ...attributes,
                                              ...childAttributes([
                                                h.AriaLabel(
                                                  `Show ${crumbs.hiddenCount} hidden steps`,
                                                ),
                                              ]),
                                            ],
                                            children: [BreadcrumbEllipsis({}, h)],
                                          },
                                          crumbs,
                                          h,
                                        ),
                                      content: (menu) =>
                                        items
                                          .slice(1, 1 + crumbs.hiddenCount)
                                          .map((hiddenItem, menuIndex) =>
                                            DropdownItem(
                                              {
                                                index: menuIndex,
                                                label: hiddenItem.label,
                                                animate: target.node,
                                              },
                                              menu,
                                              h,
                                            ),
                                          ),
                                    },
                                  }),
                                ),
                          ],
                        },
                        h,
                      )
                    : undefined
                return [
                  BreadcrumbItem({ children: [content] }, h),
                  ...(hidden === undefined ? [] : [hidden]),
                ]
              }),
            },
            h,
          ),
        ],
      },
    }),
  )
}
