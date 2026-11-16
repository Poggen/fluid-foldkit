// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Update } from 'foldkit'
import { SidebarWorkspaceHeaderBlock } from './sidebar-workspace-header.js'
import { SidebarUserFooterBlock } from './sidebar-user-footer.js'
import { ScrollAreaBlock } from './scroll-area.js'
import { NavMenuBlock } from './nav-menu.js'
import { DocumentTooltipBlock } from './tooltip-native-public.js'
import { headerActions, platformItems, workspaceItems } from './sidebar-app-data.js'
import { SidebarAppPanelBlock, OutMessage, Message } from './sidebar-app-panel-definition.js'
import type { SidebarPanelConfig, InMessage } from './sidebar-app-panel-definition.js'
const Header = SidebarWorkspaceHeaderBlock

const Footer = SidebarUserFooterBlock

export const Workspace = SidebarAppPanelBlock.makeRequiredFieldBinding(Header, {
  field: 'workspace',
  init: {
    contextToArgs: (config: SidebarPanelConfig) => [
      { id: `${config.id}-workspace`, name: 'Acme Inc', checkedIndex: 0 },
    ],
  },
}).withOutMessagePolicy({
  fold: SidebarAppPanelBlock.makeOutMessageFold(Header, {
    Events: SidebarAppPanelBlock.makeNoopStep,
  }),
})

export const User = SidebarAppPanelBlock.makeRequiredFieldBinding(Footer, {
  field: 'user',
  init: {
    contextToArgs: (config: SidebarPanelConfig) => [{ id: `${config.id}-user`, name: 'Jane Doe' }],
  },
}).withOutMessagePolicy({
  fold: SidebarAppPanelBlock.makeOutMessageFold(Footer, {
    Events: SidebarAppPanelBlock.makeNoopStep,
  }),
})

export const Actions = SidebarAppPanelBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'actions',
  init: {
    contextToArgs: (config: SidebarPanelConfig) => [
      { id: `${config.id}-actions`, items: headerActions, activeSlug: null, ariaLabel: 'Actions' },
    ],
  },
}).withOutMessagePolicy({
  fold: SidebarAppPanelBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: SidebarAppPanelBlock.makeNoopStep,
  }),
})

const PlatformRaw = SidebarAppPanelBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'platform',
  init: {
    contextToArgs: (config: SidebarPanelConfig) => [
      {
        id: `${config.id}-platform`,
        items: platformItems,
        activeSlug: config.active ?? 'Home',
        ariaLabel: 'Platform',
      },
    ],
  },
})

const NavigationRaw = SidebarAppPanelBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'navigation',
  init: {
    contextToArgs: (config: SidebarPanelConfig) => [
      {
        id: `${config.id}-navigation`,
        items: workspaceItems,
        activeSlug: config.active ?? 'Home',
        ariaLabel: 'Workspace',
      },
    ],
  },
})

const selected = ({ value }: { readonly value: string }) => {
  const steps = Update.combineSteps([
    SidebarAppPanelBlock.makeFieldsStep(() => ({ active: () => value })),
    PlatformRaw.requestConfigure({ items: platformItems, activeSlug: value }),
    NavigationRaw.requestConfigure({ items: workspaceItems, activeSlug: value }),
  ])

  return SidebarAppPanelBlock.makeStep(
    () => (model: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(steps(model), OutMessage.Selected({ value })),
  )
}

export const Platform = PlatformRaw.withOutMessagePolicy({
  fold: SidebarAppPanelBlock.makeOutMessageFold(NavMenuBlock, { Selected: selected }),
})

export const Navigation = NavigationRaw.withOutMessagePolicy({
  fold: SidebarAppPanelBlock.makeOutMessageFold(NavMenuBlock, { Selected: selected }),
})

export const Scroll = SidebarAppPanelBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: {
    contextToArgs: (config: SidebarPanelConfig) => [{ id: `${config.id}-scroll` }],
  },
}).withOutMessagePolicy({
  fold: SidebarAppPanelBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: SidebarAppPanelBlock.makeNoopStep,
  }),
})

export const Tooltips = SidebarAppPanelBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: SidebarAppPanelBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: SidebarAppPanelBlock.makeNoopStep,
  }),
})

export const SidebarAppPanelComposition = SidebarAppPanelBlock.makeComposition({
  bindings: [Workspace, User, Actions, Platform, Navigation, Scroll, Tooltips],
})

export const init = SidebarAppPanelComposition.makeInit((config: SidebarPanelConfig) => ({
  childInitContext: config,
  model: {
    id: config.id,
    occurrence: config.occurrence,
    active: config.active ?? 'Home',
    platformOpen: true,
    workspaceOpen: true,
  },
  steps: [
    Tooltips.requestAdd({ key: `${config.id}-pin`, options: { side: 'bottom' } }),
    Tooltips.requestAdd({
      key: `${config.id}-platform-add`,
      options: { side: 'top' },
    }),
    Tooltips.requestAdd({
      key: `${config.id}-workspace-add`,
      options: { side: 'top' },
    }),
  ],
}))

export const update = SidebarAppPanelComposition.makeUpdate({
  GroupChanged: (model, { group, open }) => ({
    model: modifyFields(
      model,
      group === 'platform' ? { platformOpen: () => open } : { workspaceOpen: () => open },
    ),
  }),
})

export const inMessageUpdate = SidebarAppPanelComposition.makeInMessageUpdate({
  RequestedActive: SidebarAppPanelBlock.makeStep.fromMessage(
    ({ value }: typeof InMessage.RequestedActive.Type) =>
      Update.combineSteps([
        SidebarAppPanelBlock.makeFieldsStep(() => ({ active: () => value })),
        PlatformRaw.requestConfigure({ items: platformItems, activeSlug: value }),
        NavigationRaw.requestConfigure({ items: workspaceItems, activeSlug: value }),
      ]),
  ),
})

import type { ScrollAreaProps } from './scroll-area.js'
import { Match } from 'effect'
import { childAttributes } from 'foldkit/html'
import {
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarContent,
  SidebarTrigger,
  SidebarToggleTooltipContent,
} from './sidebar-parts.js'
import { SidebarSearchField } from './sidebar-search-field.js'
import { DropdownItem } from './dropdown-item.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { SidebarPanelViewInputs } from './sidebar-app-panel-definition.js'

export const view = SidebarAppPanelComposition.makeView.withInputs<SidebarPanelViewInputs>(
  (model, inputs, h) => {
    const info = inputs.sidebar
    const { icons, size, shape, reducedMotion } = resolvePresentation(inputs)

    const navInputs = {
      context: createPresentationContext(inputs),
      animate: inputs.animate,
      highlight: inputs.highlight,
      sidebar: true,
    }

    const iconFor = (value: string) =>
      Match.value(value).pipe(
        Match.when('Home', () => icons.star),
        Match.when('Inbox', () => icons.mail),
        Match.when('Calendar', () => icons.clock),
        Match.when('Notifications', () => icons.bell),
        Match.when('Members', () => icons.users),
        Match.orElse(() => icons.settings),
      )

    return h.block(
      Tooltips.embedView({
        slotId: 'popups',
        model: model.tooltips,
        viewInputs: {
          part: 'popups',
          animate: inputs.animate,
          renderContent: () => SidebarToggleTooltipContent(info.open, info.shortcutKey, h),
          entries: [
            { key: `${model.id}-pin`, shapeClass: shape.item, reducedMotion },
            ...['platform', 'workspace'].map((group) => ({
              key: `${model.id}-${group}-add`,
              content: 'Add item',
              shapeClass: shape.item,
              reducedMotion,
            })),
          ],
          renderPopups: (popups) =>
            h.block(
              Tooltips.embedView({
                slotId: 'body-triggers',
                model: model.tooltips,
                viewInputs: {
                  part: 'triggers',
                  renderTrigger: (_key, { button }) =>
                    button(
                      childAttributes([
                        h.Type('button'),
                        h.AriaLabel('Add item'),
                        h.DataAttribute('sidebar', 'group-action'),
                        h.Class(
                          `relative flex size-6 items-center justify-center text-muted-foreground outline-none hover:bg-hover hover:text-foreground transition-colors duration-80 focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] ${shape.item}`,
                        ),
                      ]),
                      [icons.plus({ size: size.icon, strokeWidth: 1.5 }, h)],
                    ),
                  render: ({ tooltip }) =>
                    h.div(
                      [h.Class('flex min-h-0 flex-1 flex-col')],
                      [
                        SidebarHeader(
                          {
                            children: [
                              h.block(
                                Workspace.embedView({
                                  slotId: 'workspace',
                                  model: model.workspace,
                                  viewInputs: {
                                    ...inputs,
                                    pin: (slot) =>
                                      h.block(
                                        Tooltips.embedView({
                                          slotId: 'pin-trigger',
                                          model: model.tooltips,
                                          viewInputs: {
                                            part: 'triggers',
                                            renderTrigger: (_key, { button }) =>
                                              SidebarTrigger(
                                                {
                                                  ...inputs,
                                                  attributes: [...info.trigger, ...slot.attributes],
                                                  button,
                                                  side: info.side,
                                                  compact: slot.compact,
                                                  className: slot.className,
                                                },
                                                h,
                                              ),
                                            render: ({ tooltip }) => tooltip(`${model.id}-pin`),
                                          },
                                        }),
                                      ),
                                    peeking: info.peeking,

                                    menu: (context) => [
                                      DropdownItem(
                                        {
                                          index: 0,
                                          label: 'Acme Inc',
                                          checked: true,
                                          animate: inputs.animate,
                                        },
                                        context,
                                        h,
                                      ),
                                      DropdownItem(
                                        { index: 1, label: 'Personal', animate: inputs.animate },
                                        context,
                                        h,
                                      ),
                                      DropdownItem(
                                        {
                                          index: 2,
                                          label: 'New workspace',
                                          icon: icons.plus,
                                          animate: inputs.animate,
                                        },
                                        context,
                                        h,
                                      ),
                                    ],
                                  },
                                }),
                              ),
                              h.div(
                                [h.Class('flex flex-col')],
                                [
                                  SidebarSearchField(inputs, h),
                                  h.block(
                                    Actions.embedView({
                                      slotId: 'actions',
                                      model: model.actions,
                                      viewInputs: {
                                        ...navInputs,
                                        kind: 'action',
                                        icon: (_item, lit) =>
                                          icons.plus(
                                            {
                                              size: size.icon,
                                              strokeWidth: lit ? 2 : 1.5,
                                              className: `transition-[color,stroke-width] duration-80 ${lit ? 'text-foreground' : 'text-muted-foreground'}`,
                                            },
                                            h,
                                          ),
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
                                                    'font-sans text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)] text-muted-foreground',
                                                  ),
                                                ],
                                                ['⇧⌘O'],
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
                            ...inputs,
                            ...(model.occurrence === 'desktop'
                              ? {
                                  occurrence: 'desktop' as const,
                                  scroll: (viewInputs: ScrollAreaProps) =>
                                    h.block(
                                      Scroll.embedView({
                                        slotId: 'scroll',
                                        model: model.scroll,
                                        viewInputs,
                                      }),
                                    ),
                                }
                              : { occurrence: 'mobile' as const }),
                            content: () => [
                              SidebarGroup(
                                {
                                  ...inputs,
                                  id: `${model.id}-platform-group`,
                                  label: 'Platform',
                                  animate: inputs.animate,
                                  actions: () => ({
                                    entries: [tooltip(`${model.id}-platform-add`)],
                                  }),
                                  open: model.platformOpen,
                                  onToggle: (open) =>
                                    Message.GroupChanged({ group: 'platform', open }),
                                  children: [
                                    h.block(
                                      Platform.embedView({
                                        slotId: 'platform',
                                        model: model.platform,
                                        viewInputs: {
                                          ...navInputs,
                                          kind: 'button',
                                          icon: (item, active) =>
                                            iconFor(item.value)(
                                              {
                                                size: size.icon,
                                                strokeWidth: active ? 2 : 1.5,
                                                className: active
                                                  ? 'text-foreground'
                                                  : 'text-muted-foreground',
                                              },
                                              h,
                                            ),
                                        },
                                      }),
                                    ),
                                  ],
                                },
                                h,
                              ),
                              SidebarGroup(
                                {
                                  ...inputs,
                                  id: `${model.id}-workspace-group`,
                                  label: 'Workspace',
                                  animate: inputs.animate,
                                  actions: () => ({
                                    entries: [tooltip(`${model.id}-workspace-add`)],
                                  }),
                                  open: model.workspaceOpen,
                                  onToggle: (open) =>
                                    Message.GroupChanged({ group: 'workspace', open }),
                                  children: [
                                    h.block(
                                      Navigation.embedView({
                                        slotId: 'navigation',
                                        model: model.navigation,
                                        viewInputs: {
                                          ...navInputs,
                                          kind: 'button',
                                          icon: (item, active) =>
                                            iconFor(item.value)(
                                              {
                                                size: size.icon,
                                                strokeWidth: active ? 2 : 1.5,
                                                className: active
                                                  ? 'text-foreground'
                                                  : 'text-muted-foreground',
                                              },
                                              h,
                                            ),
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
                              h.block(
                                User.embedView({
                                  slotId: 'user',
                                  model: model.user,
                                  viewInputs: {
                                    ...inputs,

                                    menu: (context) => [
                                      DropdownItem(
                                        {
                                          index: 0,
                                          label: 'Profile',
                                          icon: icons.user,
                                          animate: inputs.animate,
                                        },
                                        context,
                                        h,
                                      ),
                                      DropdownItem(
                                        {
                                          index: 1,
                                          label: 'Settings',
                                          icon: icons.settings,
                                          animate: inputs.animate,
                                        },
                                        context,
                                        h,
                                      ),
                                      DropdownItem(
                                        {
                                          index: 2,
                                          label: 'Log out',
                                          icon: icons['arrow-left'],
                                          animate: inputs.animate,
                                        },
                                        context,
                                        h,
                                      ),
                                    ],
                                  },
                                }),
                              ),
                            ],
                          },
                          h,
                        ),
                        ...popups,
                      ],
                    ),
                },
              }),
            ),
        },
      }),
    )
  },
)
