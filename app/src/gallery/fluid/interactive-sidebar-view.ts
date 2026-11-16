import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'

import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { SidebarContent, SidebarFooter, SidebarHeader } from '@foldkit-visuals/fluid/sidebar/parts'
import { WorkspaceTile } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarSearchField } from '@foldkit-visuals/fluid/sidebar/search-field'
import mickaPortrait from '../../../../lib/assets/micka.png'
import { highlight, motion } from '../../motion'
import type { FluidViewBuilder } from './composition'
import {
  Sidebar,
  SidebarScroll,
  Threads,
  SidebarWorkspace,
  SidebarUser,
  SidebarActions,
} from './interactive-bindings'

import type { FluidGalleryInputs, FluidGalleryModel } from './block'
import { FluidGalleryBlock } from './block'
import { demoPresentation } from './render-presentation'

export const renderSidebar = (
  sidebar: FluidGalleryModel['sidebar'],
  sidebarScroll: FluidGalleryModel['sidebarScroll'],
  sidebarWorkspace: FluidGalleryModel['sidebarWorkspace'],
  threadSearch: FluidGalleryModel['threadSearch'],
  sidebarActions: FluidGalleryModel['sidebarActions'],
  threads: FluidGalleryModel['threads'],
  sidebarUser: FluidGalleryModel['sidebarUser'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
  onSearch: typeof FluidGalleryBlock.Message.UpdatedThreadSearch,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.div(
    [
      h.Class(
        'flex h-[460px] w-full max-w-[620px] overflow-hidden border border-border bg-background',
      ),
    ],
    [
      h.block(
        Sidebar.embedView({
          slotId: 'sidebar',
          model: sidebar,
          viewInputs: {
            context,
            animate: motion.node,
            className: 'h-full min-h-0',
            sidebarClassName: 'h-full',
            panelClassName: '',
            insetClassName: 'min-h-0',
            content: (_info, context) => {
              const compact = createPresentationContext({
                context,
                shape,
                size: 'compact',
                hoverMode: hover,
              })
              return [
                SidebarHeader(
                  {
                    className: '',
                    children: [
                      h.block(
                        SidebarWorkspace.embedView({
                          slotId: 'sidebar-workspace',
                          model: sidebarWorkspace,
                          viewInputs: {
                            context: compact,
                            animate: motion.node,
                            highlight,
                            mark: () => WorkspaceTile({ context: compact, children: ['A'] }, h),
                          },
                        }),
                      ),
                      h.div(
                        [h.Class('flex flex-col'), h.OnInput((value) => onSearch({ value }))],
                        [
                          SidebarSearchField(
                            {
                              context: compact,
                              placeholder: 'Search',
                              attributes: [
                                h.Id('preview-thread-search'),
                                h.AriaLabel('Search threads'),
                                h.Value(threadSearch),
                              ],
                            },
                            h,
                          ),
                          h.block(
                            SidebarActions.embedView({
                              slotId: 'sidebar-actions',
                              model: sidebarActions,
                              viewInputs: {
                                context: compact,
                                animate: motion.node,
                                highlight,
                                kind: 'action',
                                sidebar: true,
                                icon: () => defaultIcons.plus({ size: 14, strokeWidth: 1.5 }, h),
                                rowTrailing: () => [
                                  h.span(
                                    [
                                      h.Class(
                                        'ml-auto inline-flex opacity-0 transition-opacity duration-80 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100',
                                      ),
                                    ],
                                    [
                                      h.kbd(
                                        [
                                          h.Class(
                                            'font-sans text-[11px] leading-3.5 text-muted-foreground',
                                          ),
                                        ],
                                        ['⌘N'],
                                      ),
                                    ],
                                  ),
                                ],
                              },
                            }),
                          ),
                        ],
                      ),
                    ],
                  },
                  h,
                ),
                SidebarContent(
                  {
                    context,
                    occurrence: 'desktop',
                    scroll: (viewInputs) =>
                      h.block(
                        SidebarScroll.embedView({
                          slotId: 'sidebar-scroll',
                          model: sidebarScroll,
                          viewInputs,
                        }),
                      ),
                    content: () => [
                      h.p(
                        [
                          h.Class(
                            'flex h-8 shrink-0 items-center gap-2 px-2 text-muted-foreground outline-none text-site-caption',
                          ),
                        ],
                        ['Threads'],
                      ),
                      h.block(
                        Threads.embedView({
                          slotId: 'threads',
                          model: threads,
                          viewInputs: {
                            context: compact,
                            animate: motion.node,
                            highlight,
                            kind: 'action',
                            sidebar: true,
                          },
                        }),
                      ),
                    ],
                  },
                  h,
                ),
                SidebarFooter(
                  {
                    children: [
                      h.block(
                        SidebarUser.embedView({
                          slotId: 'sidebar-user',
                          model: sidebarUser,
                          viewInputs: {
                            context: compact,
                            animate: motion.node,
                            highlight,
                            mark: () =>
                              h.img([
                                h.Src(mickaPortrait),
                                h.Alt(''),
                                h.Width('20'),
                                h.Height('20'),
                                h.Class(
                                  'size-5 shrink-0 rounded-full outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
                                ),
                              ]),
                            menu: (dropdown) =>
                              [
                                { label: 'Profile', icon: defaultIcons.user },
                                { label: 'Settings', icon: defaultIcons.settings },
                                { label: 'Log out', icon: defaultIcons['arrow-left'] },
                              ].map((item, index) =>
                                DropdownItem({ ...item, index, animate: motion.node }, dropdown, h),
                              ),
                          },
                        }),
                      ),
                    ],
                  },
                  h,
                ),
              ]
            },
            mobileContent: () => [],
            inset: () => [],
          },
        }),
      ),
    ],
  )
}
