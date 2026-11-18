import type { Snapshot, Events } from './contracts'
import { sidebarInsetTrigger } from './inset'
import {
  createPresentationContext,
  type PresentationContext,
} from '@foldkit-visuals/fluid/presentation'
import { sidebarActionRowsView } from './actions'
import { sidebarWorkspaceMenu } from './workspace'
import { Button } from '@foldkit-visuals/fluid/button'
import type {
  SidebarActionContext,
  SidebarGroupActionContext,
} from '@foldkit-visuals/fluid/sidebar/parts'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarAction,
  SidebarGroupActions,
  SidebarMenuSkeleton,
} from '@foldkit-visuals/fluid/sidebar/parts'
import { SidebarSearchField } from '@foldkit-visuals/fluid/sidebar/search-field'
import { WorkspaceTile } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { createKeyedLazy } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import {
  menuRows,
  sidebarSectionIds,
  sidebarMenuCapabilities,
  type Configuration,
} from '../../../../../playground/configs/sidebar'
import type { ComponentPresentation } from '../../../../../settings'
import { motion, highlight, target } from '../../../../../motion'
import type { ConfiguredSidebarModel } from '../block'
import type { ConfiguredSidebarViewBuilder } from '../composition'
import {
  Sidebar,
  SidebarScroll,
  Threads,
  SidebarWorkspace,
  SidebarUser,
  SidebarMenus,
} from '../bindings'
import { demoPresentation } from '../../../render-presentation'
import { renderSidebarCallouts } from './callouts'

const render: (
  events: Events,
  sidebar: Snapshot['sidebar'],
  sidebarScroll: Snapshot['sidebarScroll'],
  sidebarTooltips: Snapshot['sidebarTooltips'],
  headerRows: Snapshot['sidebarHeaderActions'],
  footerRows: Snapshot['sidebarFooterActions'],
  threads: Snapshot['threads'],
  workspace: Snapshot['sidebarWorkspace'],
  user: Snapshot['sidebarUser'],
  menus: Snapshot['sidebarMenus'],
  calloutGroup: Snapshot['sidebarCallouts'],
  calloutPresence: Snapshot['sidebarCalloutPresence'],
  sections: Snapshot['sidebarSections'],
  expanded: Snapshot['sidebarExpanded'],
  dismissed: Snapshot['sidebarDismissedCallouts'],
  calloutsHovered: boolean,
  calloutHeight: number,
  action: string,
  search: string,
  configuration: Configuration,
  shape: ComponentPresentation['shape'],
  size: ComponentPresentation['size'],
  hover: ComponentPresentation['hover'],
  h: ConfiguredSidebarViewBuilder,
) => Html = (
  events: Events,
  sidebar: Snapshot['sidebar'],
  sidebarScroll: Snapshot['sidebarScroll'],
  sidebarTooltips: Snapshot['sidebarTooltips'],
  headerRows: Snapshot['sidebarHeaderActions'],
  footerRows: Snapshot['sidebarFooterActions'],
  threads: Snapshot['threads'],
  workspace: Snapshot['sidebarWorkspace'],
  user: Snapshot['sidebarUser'],
  menus: Snapshot['sidebarMenus'],
  calloutGroup: Snapshot['sidebarCallouts'],
  calloutPresence: Snapshot['sidebarCalloutPresence'],
  sections: Snapshot['sidebarSections'],
  expanded: Snapshot['sidebarExpanded'],
  dismissed: Snapshot['sidebarDismissedCallouts'],
  calloutsHovered: boolean,
  calloutHeight: number,
  action: string,
  search: string,
  configuration: Configuration,
  shape: ComponentPresentation['shape'],
  size: ComponentPresentation['size'],
  hover: ComponentPresentation['hover'],
  h: ConfiguredSidebarViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  const content = (context: PresentationContext) => {
    const compact = createPresentationContext({ context, size: 'compact' })
    const emitAction = (label: string) => events.UpdatedSidebarAction({ action: label })
    const iconAction = (label: string, icon: keyof typeof defaultIcons) =>
      Button(
        {
          context: compact,
          variant: 'ghost',
          buttonSize: 'icon-toolbar',
          attributes: [h.AriaLabel(label), h.OnClick(emitAction(label), { propagation: 'Stop' })],
          children: [defaultIcons[icon]({ size: 14 }, h)],
        },
        h,
      )
    const scopedAction = (
      actionContext: SidebarActionContext,
      label: string,
      icon: keyof typeof defaultIcons,
    ) =>
      SidebarAction(
        {
          actionContext,
          context: compact,
          label,
          attributes: [h.OnClick(emitAction(label), { propagation: 'Stop' })],
          children: [defaultIcons[icon]({ size: 14 }, h)],
        },
        h,
      )
    const menu: (id: string, actionContext: SidebarActionContext) => Html = (
      id: string,
      actionContext: SidebarActionContext,
    ) => {
      const model = menus.find((item) => item.id === id)?.model
      if (model === undefined) throw new Error(`Missing sidebar menu ${id}`)
      return h.block(
        SidebarMenus.embedView({
          key: id,
          slotId: `sidebar-menu-${id}`,
          model,
          viewInputs: {
            context: compact,
            animate: motion.node,
            trigger: (attributes) =>
              SidebarAction(
                {
                  actionContext,
                  label: 'More options',
                  attributes,
                  children: [defaultIcons['more-vertical']({ size: 14 }, h)],
                },
                h,
              ),
            content: (dropdown) =>
              ['Rename', 'Duplicate', 'Archive'].map((label, index) =>
                DropdownItem({ index, label, animate: motion.node }, dropdown, h),
              ),
          },
        }),
      )
    }
    const menuCapabilities = sidebarMenuCapabilities(configuration)
    const rowActions = (
      id: string,
      count: number,
      hasMenu: boolean,
      actionContext: SidebarActionContext,
    ) => ({
      entries: [
        ...(count >= 3 ? [scopedAction(actionContext, 'Add', 'plus')] : []),
        ...(count >= 2 ? [scopedAction(actionContext, 'Rename', 'pencil')] : []),
        ...(hasMenu ? [menu(id, actionContext)] : []),
      ],
    })
    const sectionActions = (id: string, actionContext: SidebarGroupActionContext) => ({
      entries: [
        ...(configuration.sectionActions >= 1
          ? [scopedAction(actionContext, 'Add item', 'plus')]
          : []),
        ...(configuration.sectionActions >= 2
          ? [scopedAction(actionContext, 'Section settings', 'sliders-horizontal')]
          : []),
        ...(menuCapabilities.section ? [menu(`${id}-section`, actionContext)] : []),
      ],
    })
    const headerActions = () => [
      ...(configuration.headerActions >= 1 ? [iconAction('New', 'plus')] : []),
      ...(configuration.headerActions >= 2 ? [iconAction('Invite', 'users')] : []),
    ]
    const header = () =>
      SidebarHeader(
        {
          children: [
            h.div(
              [
                h.Class(
                  configuration.headerStack === 'horizontal'
                    ? 'flex items-center gap-1'
                    : 'flex flex-col gap-2',
                ),
              ],
              [
                ...(configuration.headerPrimary === 'dropdown'
                  ? [
                      h.block(
                        SidebarWorkspace.embedView({
                          slotId: 'sidebar-workspace',
                          model: workspace,
                          viewInputs: {
                            context: compact,
                            animate: motion.node,
                            highlight,
                            mark: () => WorkspaceTile({ context: compact, children: ['A'] }, h),
                            menu: (dropdown) => sidebarWorkspaceMenu(compact, dropdown, h),
                          },
                        }),
                      ),
                    ]
                  : configuration.headerPrimary === 'logo'
                    ? [
                        h.div(
                          [h.Class('relative flex h-8 items-center pl-8 pr-2')],
                          [
                            WorkspaceTile(
                              {
                                context: compact,
                                className:
                                  'pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2',
                                children: ['A'],
                              },
                              h,
                            ),
                            h.span(
                              [h.Class('min-w-0 truncate text-[13px] text-foreground')],
                              ['Acme Inc'],
                            ),
                          ],
                        ),
                      ]
                    : []),
                ...(configuration.headerStack === 'horizontal'
                  ? [iconAction('Search', 'search'), ...headerActions()]
                  : [
                      h.div(
                        [
                          h.Class('flex flex-col'),
                          h.OnInput((value) => events.UpdatedThreadSearch({ value })),
                        ],
                        [
                          SidebarSearchField(
                            {
                              context: compact,
                              placeholder: 'Search',
                              attributes: [h.Value(search), h.AriaLabel('Search threads')],
                            },
                            h,
                          ),
                          sidebarActionRowsView('header', headerRows, compact, h),
                        ],
                      ),
                    ]),
              ],
            ),
          ],
        },
        h,
      )
    const rows = () =>
      h.block(
        Threads.embedView({
          slotId: 'threads',
          model: threads,
          viewInputs: {
            context: compact,
            animate: motion.node,
            highlight,
            kind: 'button',
            sidebar: true,
            icon: (item) => {
              if (configuration.l1Primary === 'threads') return undefined
              const index = Number(item.value.split('-')[1])
              return item.level === 0
                ? defaultIcons[menuRows[index]?.icon ?? 'folder']({ size: 14 }, h)
                : configuration.l2Icon
                  ? defaultIcons.folder({ size: 14 }, h)
                  : undefined
            },
            rowDisclosure: (item) =>
              item.level === 0 && configuration.l1Primary === 'menu' && configuration.l1Children
                ? { expanded: expanded[item.value] ?? false, controls: `sidebar-sub-${item.value}` }
                : undefined,
            rowTrailing: (item) =>
              item.level === 0 && configuration.l1Primary === 'menu' && configuration.l1Children
                ? [
                    target.node(
                      h.span(
                        [h.Class('ml-auto')],
                        [defaultIcons['chevron-right']({ size: 14 }, h)],
                      ),
                      { initial: false, animate: { rotate: expanded[item.value] ? 90 : 0 } },
                    ),
                  ]
                : [],
            rowActions: (item, actionContext) =>
              item.level === 0 && configuration.l1Primary === 'menu' && configuration.l1Children
                ? { entries: [] }
                : rowActions(
                    item.value,
                    item.level === 0 ? configuration.l1Actions : configuration.l2Actions,
                    item.level === 0 ? menuCapabilities.parent : menuCapabilities.child,
                    actionContext,
                  ),
            content: (content) =>
              sidebarSectionIds.map((id, sectionIndex) => {
                const children =
                  configuration.state === 'loading'
                    ? [0, 1, 2, 3].map((index) => SidebarMenuSkeleton({ index, showIcon: true }, h))
                    : content.items
                        .filter(
                          (item) =>
                            item.level === 0 &&
                            item.value.startsWith(id) &&
                            item.label.toLowerCase().includes(search.toLowerCase()),
                        )
                        .map((item) =>
                          content.row(item.value, {
                            children:
                              configuration.l1Primary === 'menu' && configuration.l1Children
                                ? [
                                    SidebarMenuSub(
                                      {
                                        context: compact,
                                        open: expanded[item.value] ?? false,
                                        attributes: [h.Id(`sidebar-sub-${item.value}`)],
                                        animate: motion.node,
                                        children: content.items
                                          .filter(
                                            (child) =>
                                              child.level === 1 &&
                                              child.value.startsWith(`${item.value}-child-`),
                                          )
                                          .map((child) => content.row(child.value)),
                                      },
                                      h,
                                    ),
                                  ]
                                : [],
                          }),
                        )
                const label =
                  configuration.l1Primary === 'threads'
                    ? (['fluid-functionalism', 'portfolio-site'][sectionIndex] ?? '')
                    : (['Platform', 'Workspace'][sectionIndex] ?? '')
                return configuration.sectionsCollapsible
                  ? SidebarGroup(
                      {
                        id: `sidebar-${id}`,
                        label,
                        open: sections[id] ?? true,
                        actions: (actionContext) => sectionActions(id, actionContext),
                        context: compact,
                        animate: motion.node,
                        onToggle: (open) => events.ToggledSidebarSection({ id, open }),
                        children,
                      },
                      h,
                    )
                  : h.div(
                      [h.Class('relative flex w-full min-w-0 flex-col p-2')],
                      [
                        h.div(
                          [h.Class('flex items-center')],
                          [
                            SidebarGroupLabel({ children: [label] }, h),
                            SidebarGroupActions(
                              {
                                context: compact,
                                actions: (actionContext) => sectionActions(id, actionContext),
                              },
                              h,
                            ),
                          ],
                        ),
                        ...children,
                      ],
                    )
              }),
          },
        }),
      )
    const footer = () =>
      SidebarFooter(
        {
          children: [
            ...renderSidebarCallouts(
              events,
              calloutGroup,
              calloutPresence,
              dismissed,
              calloutsHovered,
              calloutHeight,
              configuration,
              compact,
              h,
            ),
            h.div(
              [
                h.Class(
                  configuration.footerStack === 'horizontal'
                    ? 'flex items-center gap-1'
                    : 'flex flex-col gap-1',
                ),
              ],
              [
                ...(configuration.footerPrimary === 'dropdown'
                  ? [
                      h.block(
                        SidebarUser.embedView({
                          slotId: 'sidebar-user',
                          model: user,
                          viewInputs: {
                            context: compact,
                            animate: motion.node,
                            highlight,
                            menu: (dropdown) =>
                              ['Profile', 'Settings', 'Log out'].map((label, index) =>
                                DropdownItem({ index, label, animate: motion.node }, dropdown, h),
                              ),
                          },
                        }),
                      ),
                    ]
                  : []),
                ...(configuration.footerStack === 'vertical'
                  ? [sidebarActionRowsView('footer', footerRows, compact, h)]
                  : [
                      ...(configuration.footerActions >= 1
                        ? [iconAction('Settings', 'settings')]
                        : []),
                      ...(configuration.footerActions >= 2 ? [iconAction('Theme', 'moon')] : []),
                    ]),
              ],
            ),
          ],
        },
        h,
      )
    return [
      header(),
      SidebarContent(
        {
          context,
          occurrence: 'desktop',
          content: () => [rows()],
          scroll: (viewInputs) =>
            h.block(
              SidebarScroll.embedView({
                slotId: 'sidebar-scroll',
                model: sidebarScroll,
                viewInputs,
              }),
            ),
        },
        h,
      ),
      footer(),
    ]
  }
  return h.div(
    [h.Class('relative flex w-full overflow-hidden bg-background h-full self-stretch')],
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
            insetClassName: configuration.variant === 'floating' ? 'min-h-0 pt-2' : 'min-h-0',
            content: (_info, context) => content(context),
            mobileContent: () => [],
            inset: (info, context) => [
              sidebarInsetTrigger(info, context, sidebarTooltips, action, h),
            ],
          },
        }),
      ),
    ],
  )
}
export const makeSidebarPlaygroundView = (events: Events) => {
  const lazy = createKeyedLazy()
  return (
    model: ConfiguredSidebarModel,
    configuration: Configuration,
    settings: ComponentPresentation,
    h: ConfiguredSidebarViewBuilder,
  ) =>
    lazy('sidebar-playground', render, [
      events,
      model.sidebar,
      model.sidebarScroll,
      model.sidebarTooltips,
      model.sidebarHeaderActions,
      model.sidebarFooterActions,
      model.threads,
      model.sidebarWorkspace,
      model.sidebarUser,
      model.sidebarMenus,
      model.sidebarCallouts,
      model.sidebarCalloutPresence,
      model.sidebarSections,
      model.sidebarExpanded,
      model.sidebarDismissedCallouts,
      model.sidebarCalloutsHovered,
      model.sidebarCalloutHeight,
      model.sidebarAction,
      model.threadSearch,
      configuration,
      configuration.appearance.shape ?? settings.shape,
      configuration.appearance.size ?? settings.size,
      configuration.appearance.hover ?? settings.hover,
      h,
    ])
}
