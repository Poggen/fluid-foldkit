import type { DocumentTooltipPopupEntry } from '@foldkit-visuals/fluid/tooltip'
import { sidebarSceneAction, sidebarSceneInset } from './sidebar-scene-actions'
import type {
  SidebarActionContext,
  SidebarGroupActionContext,
  SidebarActionRun,
  SidebarMenuActionContext,
} from '@foldkit-visuals/fluid/sidebar/parts'
import type { SidebarSceneBlock as Root } from './sidebar-scene-definition'
import type { NavItemConfig, NavMenuContent } from '@foldkit-visuals/fluid/nav-menu'

import {
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
} from '@foldkit-visuals/fluid/sidebar/parts'
import { SidebarSearchField } from '@foldkit-visuals/fluid/sidebar/search-field'
import { WorkspaceTile } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { spring, shapeMap } from '@foldkit-visuals/fluid/tokens'
import type { IconName } from '@foldkit-visuals/fluid/icons'

import {
  Composition,
  Sidebar,
  Scroll,
  Workspace,
  User,
  Navs,
  Tooltips,
  Callouts,
} from './sidebar-scene-composition'
import { ObserveScene } from './sidebar-scene-observer'
import { AI_THREADS, WIKI_PRIVATE, WIKI_SHARED, WIKI_RECENT } from './sidebar-data'
import { presentation } from '../settings'
import { motion, highlight } from '../motion'
import portrait from '../../../lib/assets/micka.png'
import {
  sidebarItemIcon,
  sidebarBranchRows,
  sidebarThreadActions,
} from './sidebar-scene-navigation'

const wiki = [
  { label: 'Private', branches: WIKI_PRIVATE },
  { label: 'Shared', branches: WIKI_SHARED },
  { label: 'Recent', branches: WIKI_RECENT },
]
export const sidebarSceneView = (Message: typeof Root.Message) =>
  Composition.makeView.withInputs((model, { settings, banner, height }, h) => {
    const context = presentation(settings),
      shape = shapeMap[settings.shape]

    return h.div(
      [
        h.Id(`${model.id}-frame`),
        h.Class('relative flex w-full overflow-hidden bg-background'),
        h.Style({ height: `${height}px` }),
        h.OnMount(ObserveScene()),
        h.OnMouseEnter(Message.UpdatedCursor({ inside: true })),
        h.OnMouseLeave(Message.UpdatedCursor({ inside: false })),
      ],
      [
        h.block(
          Tooltips.embedView({
            slotId: `${model.id}-tooltips`,
            model: model.tooltips,
            viewInputs: {
              part: 'popups',
              animate: motion.node,
              entries: [
                ...(model.kind === 'horizontal' || model.kind === 'alignment'
                  ? [
                      'search',
                      'new',
                      'settings',
                      ...(model.kind === 'alignment' ? ['filters', 'inbox'] : []),
                    ]
                  : []),
                ...(model.kind === 'actions' || model.kind === 'alignment'
                  ? [
                      'group-new',
                      'group-filters',
                      ...AI_THREADS.flatMap((_thread, index) => [
                        `thread-${index}-branch`,
                        `thread-${index}-share`,
                      ]),
                    ]
                  : []),
              ].map(
                (key) =>
                  ({
                    key,
                    shapeClass: shape.item,
                    portalContainerId: `${model.id}-frame`,
                    reducedMotion: 'user',
                  }) satisfies DocumentTooltipPopupEntry,
              ),
              renderContent: (key) =>
                h.span(
                  [],
                  [
                    key.startsWith('thread-')
                      ? key.endsWith('-branch')
                        ? 'Branch thread'
                        : 'Share thread'
                      : key === 'search'
                        ? 'Search'
                        : key === 'new' || key === 'group-new'
                          ? 'New thread'
                          : key === 'filters'
                            ? 'Filters'
                            : key === 'group-filters'
                              ? 'Filter threads'
                              : key === 'settings'
                                ? 'Settings'
                                : 'Inbox',
                  ],
                ),
              renderPopups: (popups) =>
                h.div(
                  [h.Class('flex h-full w-full min-h-0')],
                  [
                    h.block(
                      Sidebar.embedView({
                        slotId: model.id,
                        model: model.sidebar,
                        viewInputs: {
                          context,
                          animate: motion.node,
                          className: 'h-full min-h-0',
                          panelClassName: 'h-full',
                          sidebarClassName: 'h-full',
                          insetClassName: 'min-h-0',
                          content: (_info, context) => {
                            const tip = (
                              key: string,
                              label: string,
                              icon: IconName,
                              moreClass = '',
                              actionContext?: SidebarActionContext,
                            ) =>
                              sidebarSceneAction(
                                model,
                                context,
                                h,
                                key,
                                label,
                                icon,
                                moreClass,
                                actionContext,
                              )
                            const nav = (key: string) => {
                              const child = model.navs[key]
                              if (child === undefined) return h.empty
                              const branches = wiki.find((group) => group.label === key)?.branches
                              return h.block(
                                Navs.embedView({
                                  key,
                                  slotId: child.id,
                                  model: child,
                                  viewInputs: {
                                    context,
                                    sidebar: true,
                                    kind: (item) =>
                                      Object.hasOwn(model.branches, item.value)
                                        ? 'action'
                                        : 'button',
                                    animate: motion.node,
                                    highlight,
                                    icon: (item) => {
                                      const icon = sidebarItemIcon(item.label, branches)
                                      return icon === undefined
                                        ? undefined
                                        : defaultIcons[icon]({ size: 16, strokeWidth: 1.5 }, h)
                                    },
                                    ...(branches === undefined
                                      ? {}
                                      : {
                                          rowDisclosure: (item: NavItemConfig) =>
                                            Object.hasOwn(model.branches, item.value)
                                              ? {
                                                  expanded: model.branches[item.value] ?? false,
                                                  controls: `${model.id}-branch-${item.value.replaceAll(' ', '-')}`,
                                                }
                                              : undefined,
                                          content: (rows: NavMenuContent) =>
                                            sidebarBranchRows(
                                              branches,
                                              model.branches,
                                              model.id,
                                              context,
                                              rows,
                                              h,
                                            ),
                                        }),
                                    rowTrailing: (item) =>
                                      Object.hasOwn(model.branches, item.value)
                                        ? [
                                            h.span(
                                              [
                                                h.Class(
                                                  'ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center',
                                                ),
                                              ],
                                              [
                                                motion.node(
                                                  defaultIcons['chevron-right'](
                                                    {
                                                      size: 16,
                                                      className: model.branches[item.value]
                                                        ? 'text-muted-foreground transition-opacity duration-80 opacity-0 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100'
                                                        : 'text-muted-foreground',
                                                    },
                                                    h,
                                                  ),
                                                  {
                                                    initial: false,
                                                    animate: {
                                                      rotate: model.branches[item.value] ? 90 : 0,
                                                    },
                                                    transition: spring.fast,
                                                  },
                                                ),
                                              ],
                                            ),
                                          ]
                                        : [],
                                    ...(model.kind === 'actions' || model.kind === 'alignment'
                                      ? {
                                          rowActions: (
                                            item: NavItemConfig,
                                            actionContext: SidebarMenuActionContext,
                                          ) => {
                                            const index = AI_THREADS.findIndex(
                                              (thread) => thread.label === item.label,
                                            )
                                            const menu = model.menus[String(index)]
                                            if (index < 0 || menu === undefined)
                                              return { entries: [] }
                                            return sidebarThreadActions(
                                              index,
                                              menu,
                                              model.isVisible &&
                                                !model.isCursorInside &&
                                                index === (model.kind === 'actions' ? 3 : 0),
                                              actionContext,
                                              context,
                                              (key, label, icon) =>
                                                tip(key, label, icon, '', actionContext),
                                              h,
                                            )
                                          },
                                        }
                                      : {}),
                                  },
                                }),
                              )
                            }
                            const group = (
                              key: string,
                              actions?: (context: SidebarGroupActionContext) => SidebarActionRun,
                            ) =>
                              SidebarGroup(
                                {
                                  context,
                                  id: `${model.id}-group-${key.toLowerCase()}`,
                                  label: key,
                                  open: model.groups[key] ?? true,
                                  onToggle: (open) => Message.UpdatedGroup({ group: key, open }),
                                  ...(actions === undefined ? {} : { actions }),
                                  animate: motion.node,
                                  children: [nav(key)],
                                },
                                h,
                              )
                            const workspace = () =>
                              h.block(
                                Workspace.embedView({
                                  slotId: `${model.id}-workspace`,
                                  model: model.workspace,
                                  viewInputs: {
                                    context,
                                    animate: motion.node,
                                    highlight,
                                    mark: () => WorkspaceTile({ context, children: ['A'] }, h),
                                    menu: (dropdown) =>
                                      ['Aurora AI', 'Acme Inc', 'Personal'].map((label, index) =>
                                        DropdownItem(
                                          {
                                            index,
                                            label,
                                            checked: index === 0,
                                            animate: motion.node,
                                          },
                                          dropdown,
                                          h,
                                        ),
                                      ),
                                  },
                                }),
                              )
                            const user = () =>
                              h.block(
                                User.embedView({
                                  slotId: `${model.id}-user`,
                                  model: model.user,
                                  viewInputs: {
                                    context,
                                    animate: motion.node,
                                    highlight,
                                    mark: () =>
                                      h.img([
                                        h.Src(portrait),
                                        h.Alt(''),
                                        h.Width('20'),
                                        h.Height('20'),
                                        h.Class(
                                          '-ml-0.5 -mr-0.5 size-5 shrink-0 rounded-full outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
                                        ),
                                        h.DataAttribute('guide-img', ''),
                                      ]),
                                    menu: (dropdown) =>
                                      [
                                        ['Profile', 'user'],
                                        ['Settings', 'settings'],
                                        ['Log out', 'arrow-left'],
                                      ].map(([label, icon], index) =>
                                        DropdownItem(
                                          {
                                            index,
                                            label: label ?? '',
                                            icon: defaultIcons[
                                              icon === 'user'
                                                ? 'user'
                                                : icon === 'settings'
                                                  ? 'settings'
                                                  : 'arrow-left'
                                            ],
                                            animate: motion.node,
                                          },
                                          dropdown,
                                          h,
                                        ),
                                      ),
                                  },
                                }),
                              )
                            const horizontal =
                              model.kind === 'horizontal' || model.kind === 'alignment'
                            const header = SidebarHeader(
                              {
                                children: horizontal
                                  ? [
                                      h.div(
                                        [h.Class('flex items-center gap-1 pr-1.5')],
                                        [
                                          h.div([h.Class('min-w-0 flex-1')], [workspace()]),
                                          tip('search', 'Search', 'search'),
                                          tip('new', 'New thread', 'plus'),
                                          ...(model.kind === 'alignment'
                                            ? [tip('filters', 'Filters', 'sliders-horizontal')]
                                            : []),
                                        ],
                                      ),
                                    ]
                                  : [
                                      workspace(),
                                      SidebarSearchField({ context }, h),
                                      ...(model.kind === 'vertical' ? [nav('Header actions')] : []),
                                    ],
                              },
                              h,
                            )
                            const footer = SidebarFooter(
                              {
                                children: [
                                  ...(model.kind === 'callouts' || model.kind === 'horizontal'
                                    ? [
                                        h.block(
                                          Callouts.embedView({
                                            slotId: `${model.id}-callouts`,
                                            model: model.callouts,
                                            viewInputs: { context, settings, banner },
                                          }),
                                        ),
                                      ]
                                    : []),
                                  ...(model.kind === 'vertical' ? [nav('Footer actions')] : []),
                                  horizontal
                                    ? h.div(
                                        [h.Class('flex items-center gap-1 pr-1.5')],
                                        [
                                          h.div([h.Class('min-w-0 flex-1')], [user()]),
                                          tip('settings', 'Settings', 'settings'),
                                          ...(model.kind === 'alignment'
                                            ? [tip('inbox', 'Inbox', 'inbox')]
                                            : []),
                                        ],
                                      )
                                    : user(),
                                ],
                              },
                              h,
                            )
                            return [
                              header,
                              SidebarContent(
                                {
                                  context,
                                  occurrence: 'desktop',
                                  scroll: (viewInputs) =>
                                    h.block(
                                      Scroll.embedView({
                                        slotId: 'scroll',
                                        model: model.scroll,
                                        viewInputs,
                                      }),
                                    ),
                                  content: () => [
                                    h.div(
                                      [h.DataAttribute('guide-rows', '')],
                                      model.kind === 'nesting'
                                        ? wiki.map((groupSpec) => group(groupSpec.label))
                                        : [
                                            group(
                                              model.kind === 'layout' ? 'Workspace' : 'Threads',
                                              model.kind === 'actions' || model.kind === 'alignment'
                                                ? (actionContext) => ({
                                                    entries: [
                                                      tip(
                                                        'group-new',
                                                        'New thread',
                                                        'plus',
                                                        '',
                                                        actionContext,
                                                      ),
                                                      tip(
                                                        'group-filters',
                                                        'Filter threads',
                                                        'sliders-horizontal',
                                                        '',
                                                        actionContext,
                                                      ),
                                                    ],
                                                  })
                                                : undefined,
                                            ),
                                          ],
                                    ),
                                  ],
                                },
                                h,
                              ),
                              ...(model.kind === 'collapse' || model.kind === 'nesting'
                                ? []
                                : [footer]),
                            ]
                          },
                          mobileContent: () => [],
                          inset: (sidebar, context) => [
                            sidebarSceneInset(model, sidebar, context, h),
                          ],
                        },
                      }),
                    ),
                    ...popups,
                  ],
                ),
            },
          }),
        ),
        ...(model.kind === 'alignment'
          ? model.axes.map((x) =>
              motion.node(
                h.div([
                  h.AriaHidden(true),
                  h.Class('pointer-events-none absolute z-[60] w-px opacity-40'),
                  h.Style({
                    left: `${x}px`,
                    top: '0',
                    height: '100%',
                    backgroundColor: 'var(--focus-ring, #6B97FF)',
                  }),
                ]),
                {
                  initial: false,
                  animate: { opacity: model.isVisible && !model.isCursorInside ? 1 : 0 },
                  transition: { duration: 0.15 },
                },
              ),
            )
          : []),
      ],
    )
  })
