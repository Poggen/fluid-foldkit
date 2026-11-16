import { Button } from '@foldkit/ui'
import { homeRouter } from './selection-family-routes.js'
import { examplePresentation } from './example-presentation.js'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/nav-menu'
import {
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarTrigger,
  SidebarToggleTooltipContent,
} from '@foldkit-visuals/fluid/sidebar/parts'
import type {
  SidebarDesktopRenderInfo,
  SidebarMobileRenderInfo,
} from '@foldkit-visuals/fluid/sidebar'
import type { PresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { ScrollAreaProps } from '@foldkit-visuals/fluid/scroll-area'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import {
  FluidSidebarShowcaseComposition,
  Sidebar,
  Menu,
  MobileMenu,
  Nav,
  Scroll,
  Tooltips,
  Message,
  sourcePreset,
  motion,
  presentation,
} from './sidebar-example-state.js'

export const view = FluidSidebarShowcaseComposition.makeView((model, h) => {
  const renderContent = (
    info: SidebarDesktopRenderInfo | SidebarMobileRenderInfo,
    context: PresentationContext,
  ) => {
    const mobile = info.occurrence === 'mobile'
    const contentScroll =
      info.occurrence === 'desktop'
        ? {
            occurrence: 'desktop' as const,
            scroll: (viewInputs: ScrollAreaProps) =>
              h.block(Scroll.embedView({ slotId: 'scroll', model: model.scroll, viewInputs })),
          }
        : { occurrence: 'mobile' as const }
    const menuBinding = mobile ? MobileMenu : Menu
    const menuModel = mobile ? model.mobileMenu : model.menu

    return sourcePreset
      ? [
          SidebarHeader({ children: ['Workspace'] }, h),
          SidebarContent(
            {
              context,
              ...contentScroll,
              content: () => [
                h.block(
                  menuBinding.embedView({
                    slotId: mobile ? 'mobile-menu' : 'desktop-menu',
                    model: menuModel,
                    viewInputs: {
                      animate: motion.node,
                      highlight: hoverHighlightAnimation(motion),
                      context,
                      ...examplePresentation,
                    },
                  }),
                ),
              ],
            },
            h,
          ),
        ]
      : [
          SidebarHeader(
            {
              children: [
                h.a(
                  [
                    h.Href(homeRouter()),
                    h.Class(
                      'flex items-center gap-2.5 p-[14px_10px] text-[18px] font-[550] [&_span]:text-[13px]',
                    ),
                  ],
                  ['◈', h.span([], ['Acme workspace'])],
                ),
              ],
            },
            h,
          ),
          SidebarContent(
            {
              context,
              ...contentScroll,
              content: () => [
                SidebarGroup(
                  {
                    context,
                    id: `${info.idPrefix}-workspace-group`,
                    animate: motion.node,
                    label: 'Workspace',
                    open: model.isGroupOpen,
                    onToggle: (open) => Message.ToggledGroup({ open }),
                    children: [
                      h.block(
                        menuBinding.embedView({
                          slotId: mobile ? 'mobile-menu' : 'desktop-menu',
                          model: menuModel,
                          viewInputs: {
                            animate: motion.node,
                            highlight: hoverHighlightAnimation(motion),
                            sidebar: true,
                            context,
                            icon: (item, active) => {
                              let icon = defaultIcons.home

                              if (item.value === 'inbox') {
                                icon = defaultIcons.inbox
                              } else if (item.value === 'projects' || item.level > 0) {
                                icon = defaultIcons.folder
                              } else if (item.value === 'locked') {
                                icon = defaultIcons.lock
                              }

                              return icon(
                                {
                                  size: 16,
                                  strokeWidth: active ? 2 : 1.5,
                                  className: active
                                    ? 'shrink-0 text-foreground transition-[color,stroke-width] duration-80'
                                    : 'shrink-0 text-muted-foreground transition-[color,stroke-width] duration-80',
                                },
                                h,
                              )
                            },
                            ...examplePresentation,
                          },
                        }),
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          SidebarFooter(
            {
              children: [
                h.div(
                  [
                    h.Class(
                      'flex items-center gap-2.5 p-[12px_10px] [&_small]:block [&_small]:[color:var(--muted-foreground)] [&_small]:text-[11px]',
                    ),
                  ],
                  [
                    h.span(
                      [
                        h.Class(
                          'grid place-items-center w-7.5 h-7.5 rounded-[50%] [background:var(--muted)] text-[11px]',
                        ),
                      ],
                      ['MT'],
                    ),
                    h.div([], ['Micka Touillaud', h.small([], ['Personal account'])]),
                  ],
                ),
              ],
            },
            h,
          ),
        ]
  }

  return {
    title: 'Sidebar & Navigation · Fluid',
    body: h.block(
      Sidebar.embedView({
        slotId: 'sidebar',
        model: model.sidebar,
        viewInputs: {
          animate: motion.node,
          title: 'Acme workspace',
          context: presentation,
          content: renderContent,
          mobileContent: renderContent,
          inset: (info, context) =>
            sourcePreset
              ? [
                  h.block(
                    Tooltips.embedView({
                      slotId: 'inset-popups',
                      model: model.tooltips,
                      viewInputs: {
                        part: 'popups',
                        animate: motion.node,
                        renderContent: () =>
                          SidebarToggleTooltipContent(info.open, info.shortcutKey, h),
                        entries: [
                          {
                            key: 'showcase-sidebar-inset-trigger',
                            shapeClass: resolvePresentation({ context }).shape.item,
                            reducedMotion: resolvePresentation({ context }).reducedMotion,
                          },
                        ],
                        renderPopups: (popups) =>
                          h.header(
                            [h.Class('flex h-12 items-center gap-2 px-3')],
                            [
                              h.block(
                                Tooltips.embedView({
                                  slotId: 'inset-trigger',
                                  model: model.tooltips,
                                  viewInputs: {
                                    part: 'triggers',
                                    renderTrigger: (_key, { button }) =>
                                      SidebarTrigger(
                                        {
                                          context,
                                          button,
                                          side: info.side,
                                          attributes: info.trigger,
                                          className:
                                            'sidebar-toggle [border:1px_solid_var(--border)] rounded-[7px] p-[4px_8px] cursor-pointer',
                                        },
                                        h,
                                      ),
                                    render: ({ tooltip }) =>
                                      tooltip('showcase-sidebar-inset-trigger'),
                                  },
                                }),
                              ),
                              h.span([], ['Workspace']),
                              ...popups,
                            ],
                          ),
                      },
                    }),
                  ),
                  h.div(
                    [h.Class('p-6')],
                    [
                      Button.view(
                        {
                          onClick: Message.ClickedClearRoute(),
                          type: 'button',
                          toView: (attributes) => h.button([...attributes.button], ['Clear route']),
                        },
                        h,
                      ),
                    ],
                  ),
                ]
              : [
                  h.block(
                    Tooltips.embedView({
                      slotId: 'inset-popups',
                      model: model.tooltips,
                      viewInputs: {
                        part: 'popups',
                        animate: motion.node,
                        renderContent: () =>
                          SidebarToggleTooltipContent(info.open, info.shortcutKey, h),
                        entries: [
                          {
                            key: 'showcase-sidebar-inset-trigger',
                            shapeClass: resolvePresentation({ context }).shape.item,
                            reducedMotion: resolvePresentation({ context }).reducedMotion,
                          },
                        ],
                        renderPopups: (popups) =>
                          h.header(
                            [
                              h.Class(
                                'flex items-center gap-4.5 h-16 p-[0_28px] [border-bottom:1px_solid_var(--border)] [&_>_a]:ml-auto [&_>_a]:[color:var(--muted-foreground)]',
                              ),
                            ],
                            [
                              h.block(
                                Tooltips.embedView({
                                  slotId: 'inset-trigger',
                                  model: model.tooltips,
                                  viewInputs: {
                                    part: 'triggers',
                                    renderTrigger: (_key, { button }) =>
                                      SidebarTrigger(
                                        {
                                          context,
                                          button,
                                          side: info.side,
                                          attributes: info.trigger,
                                          className:
                                            'sidebar-toggle [border:1px_solid_var(--border)] rounded-[7px] p-[4px_8px] cursor-pointer',
                                        },
                                        h,
                                      ),
                                    render: ({ tooltip }) =>
                                      tooltip('showcase-sidebar-inset-trigger'),
                                  },
                                }),
                              ),
                              h.span([], ['Workspace', ' / ', model.page]),
                              h.a([h.Href(homeRouter())], ['All examples']),
                              ...popups,
                            ],
                          ),
                      },
                    }),
                  ),
                  h.div(
                    [
                      h.Class(
                        'max-w-262.5 p-[60px_40px] [&_h1]:text-[34px] [&_h1]:leading-[42px] [&_h1]:tracking-[-0.04em] [&_h1]:font-[550] [&_h1]:mb-3.5 [&_p]:max-w-150 [&_p]:[color:var(--muted-foreground)] [@media_(max-width:_900px)]:p-[32px_24px]',
                      ),
                    ],
                    [
                      h.h1([], ['A place for your work.']),
                      h.p(
                        [],
                        [
                          'Resize the rail, press [ to collapse, and hover the edge to peek. On a narrow screen the same sidebar becomes a focus-managed drawer.',
                        ],
                      ),
                      h.div(
                        [
                          h.Class(
                            'grid grid-cols-[1fr_1.5fr] gap-6 mt-10 [&_>_section]:[border:1px_solid_var(--border)] [&_>_section]:rounded-[14px] [&_>_section]:p-6 [&_h2]:font-[550] [&_h2]:mb-2 [&_p]:text-[12px] [&_p]:mb-5 [@media_(max-width:_900px)]:grid-cols-[1fr]',
                          ),
                        ],
                        [
                          h.section(
                            [],
                            [
                              h.h2([], ['Navigation menu']),
                              h.p([], ['Tab into the menu, then use arrows, Home, or End.']),
                              h.block(
                                Nav.embedView({
                                  slotId: 'nav',
                                  model: model.nav,
                                  viewInputs: {
                                    animate: motion.node,
                                    highlight: hoverHighlightAnimation(motion),
                                    context,
                                    ...examplePresentation,
                                  },
                                }),
                              ),
                            ],
                          ),
                          h.section(
                            [],
                            [
                              h.h2([], ['Your workspace']),
                              h.p(
                                [],
                                [
                                  'The active route, unread markers, nested rows, disabled items, and badges share one navigation model.',
                                ],
                              ),
                              h.div(
                                [
                                  h.Class(
                                    'grid place-items-center min-h-37.5 [border:1px_dashed_var(--border)] rounded-[8px] [color:var(--muted-foreground)]',
                                  ),
                                ],
                                ['Select a section from the sidebar.'],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
          ...examplePresentation,
        },
      }),
    ),
  }
})
