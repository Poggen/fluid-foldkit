import type { CommandMenuItem } from '@foldkit-visuals/fluid/command-menu'
import { CommandMenuFooter } from '@foldkit-visuals/fluid/command-menu'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { CommandMenuFilters } from '@foldkit-visuals/fluid/command-menu-tabs'
import type { PresentationContext } from '@foldkit-visuals/fluid/presentation'
import { Elevated } from '@foldkit-visuals/fluid/elevated'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { createKeyedLazy } from 'foldkit/html'
import type { Configuration } from '../../playground/configs/command-menu'
import type { ResolvedSettings } from '../../settings'
import { motion, target } from '../../motion'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Commands } from './details-bindings'
import { CommandDialog, CommandTabs, CommandFilter, CommandSort } from './playground-bindings'
import { commandItems } from './command-data'
const render = (
  commands: FluidGalleryModel['commands'],
  dialog: FluidGalleryModel['commandDialog'],
  tabs: FluidGalleryModel['commandTabs'],
  filter: FluidGalleryModel['commandFilter'],
  sort: FluidGalleryModel['commandSort'],
  config: Configuration,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = createPresentationContext({
    shape,
    size,
    hoverMode: hover,
    hasShapeProvider: true,
    hasSizeProvider: true,
  })
  const dialogVisible = dialog.dialog.mounted && dialog.dialog.phase !== 'Closed'
  const filters = (ambientContext: PresentationContext, inTabsRow: boolean) =>
    CommandMenuFilters(
      {
        context: ambientContext,
        inTabsRow,
        children: (filterContext) => [
          h.block(
            CommandFilter.embedView({
              slotId: 'command-filter',
              model: filter,
              viewInputs: {
                context: filterContext,
                animate: target.node,
                variant: 'borderless',
                ariaLabel: 'Filter commands',
                placeholder: 'Filter',
              },
            }),
          ),
          h.block(
            CommandSort.embedView({
              slotId: 'command-sort',
              model: sort,
              viewInputs: {
                context: filterContext,
                animate: target.node,
                variant: 'borderless',
                ariaLabel: 'Sort commands',
                placeholder: 'Sort',
              },
            }),
          ),
        ],
      },
      h,
    )
  const header = () =>
    h.div(
      [h.Class('contents')],
      [
        config.tabs
          ? h.block(
              CommandTabs.embedView({
                slotId: 'command-tabs',
                model: tabs,
                viewInputs: {
                  context,
                  animate: motion.node,
                  ...(config.filters
                    ? { filters: (tabsContext: PresentationContext) => filters(tabsContext, true) }
                    : {}),
                },
              }),
            )
          : filters(context, false),
      ],
    )
  const common = {
    context,
    animate: motion.node,
    placeholder: config.placeholder,
    ...(config.tabs || config.filters ? { header } : {}),
    itemIconFor: (item: { readonly value: string }) =>
      defaultIcons[commandItems.find((command) => command.value === item.value)?.icon ?? 'file'],
  }
  return h.div(
    [h.Class('w-full max-w-[560px]')],
    [
      dialogVisible
        ? null
        : Elevated(
            {
              context,
              offset: 2,
              shadowLevel: 3,
              className: `flex w-full max-w-[560px] flex-col overflow-hidden ${resolvePresentation({ context }).shape.container} max-h-[440px]`,
              children: () => [
                h.block(
                  Commands.embedView({
                    slotId: 'commands',
                    model: commands,
                    viewInputs: {
                      ...common,
                      ...(config.footer
                        ? {
                            footer: (activeItem: CommandMenuItem | undefined, mac: boolean) =>
                              CommandMenuFooter(
                                {
                                  context,
                                  ...(activeItem === undefined ? {} : { activeItem }),
                                  mac,
                                  hasTabs: config.tabs,
                                },
                                h,
                              ),
                          }
                        : {}),
                    },
                  }),
                ),
              ],
            },
            h,
          ),
      h.block(
        CommandDialog.embedView({
          slotId: 'command-dialog',
          model: dialog,
          viewInputs: {
            ...common,
            title: 'Command menu',
            trigger: (attributes) =>
              Button({ context, variant: 'ghost', attributes, children: ['Open command menu'] }, h),
            ...(config.footer
              ? {
                  footer: (activeItem: CommandMenuItem | undefined, mac: boolean) =>
                    CommandMenuFooter(
                      {
                        context,
                        ...(activeItem === undefined ? {} : { activeItem }),
                        mac,
                        hasTabs: config.tabs,
                        inDialog: true,
                      },
                      h,
                    ),
                }
              : {}),
          },
        }),
      ),
    ],
  )
}
export const makeCommandMenuPlaygroundView = () => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    config: Configuration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    lazy('command-menu-playground', render, [
      model.commands,
      model.commandDialog,
      model.commandTabs,
      model.commandFilter,
      model.commandSort,
      config,
      config.appearance.shape ?? settings.shape,
      config.appearance.size ?? settings.size,
      config.appearance.hover ?? settings.hover,
      h,
    ])
}
