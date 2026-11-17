import { ScrollAreaBlock } from '@foldkit-visuals/fluid/scroll-area'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { CardGroupBlock } from '@foldkit-visuals/fluid/card'
import { DropdownMenuBlock } from '@foldkit-visuals/fluid/dropdown'
import { NavMenuBlock } from '@foldkit-visuals/fluid/nav-menu'
import { PresenceBlock } from '@foldkit-visuals/fluid/presence'
import { SidebarBlock } from '@foldkit-visuals/fluid/sidebar'
import { SidebarWorkspaceHeaderBlock } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarUserFooterBlock } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { Update } from 'foldkit'
import { eligibleSidebarMenuIds, type Configuration } from '../../../../playground/configs/sidebar'
import { SIDEBAR_THREADS } from '../../demo-data'
import {
  makeStep,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeKeyedArrayBinding,
} from './block'

export const SidebarScroll = makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'sidebarScroll',
  init: { contextToArgs: () => [{ id: 'preview-sidebar-scroll' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ScrollAreaBlock, { Scrolled: makeNoopStep }),
})
export const SidebarTooltips = makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'sidebarTooltips',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DocumentTooltipBlock, { Transaction: makeNoopStep }),
})
export const SidebarRequests = makeRequiredFieldBinding(SidebarBlock, {
  field: 'sidebar',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-sidebar',
        variant: 'inset' as const,
        side: 'left' as const,
        defaultOpen: true,
        persist: false,
        shortcut: null,
        mobileBreakpoint: 0,
        width: '224px',
        collapsible: 'none' as const,
        rail: false,
      },
    ],
  },
})
export const Sidebar = SidebarRequests.withOutMessagePolicy({
  fold: makeOutMessageFold(SidebarBlock, {
    OpenChanged: makeNoopStep,
    WidthChanged: makeNoopStep,
  }),
})
export const SidebarWorkspace = makeRequiredFieldBinding(SidebarWorkspaceHeaderBlock, {
  field: 'sidebarWorkspace',
  init: {
    contextToArgs: () => [{ id: 'preview-sidebar-workspace', name: 'Acme Inc', checkedIndex: 0 }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(SidebarWorkspaceHeaderBlock, {
    Events: makeNoopStep,
  }),
})
export const SidebarUser = makeRequiredFieldBinding(SidebarUserFooterBlock, {
  field: 'sidebarUser',
  init: { contextToArgs: () => [{ id: 'preview-sidebar-user', name: 'Micka Touillaud' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(SidebarUserFooterBlock, {
    Events: makeNoopStep,
  }),
})
export const ThreadsRequests = makeRequiredFieldBinding(NavMenuBlock, {
  field: 'threads',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-threads',
        ariaLabel: 'Threads',
        activeSlug: null,
        items: SIDEBAR_THREADS.filter((_, index) => index !== 1).map((thread, index) => ({
          value: String(index),
          href: '#',
          label: thread.label,
          disabled: false,
          status: thread.status,
          badge: thread.badge ?? null,
          level: 0,
        })),
      },
    ],
  },
})
export const Threads = ThreadsRequests.withOutMessagePolicy({
  fold: makeOutMessageFold(NavMenuBlock, {
    Selected: ({ value, href }) =>
      makeStep((model) => {
        const parent = model.threads.items.find((item) => item.value === value)
        const hasChildren =
          parent !== undefined &&
          model.threads.items.some((item) => item.value.startsWith(value + '-child-'))
        return hasChildren
          ? makeFieldsStep(() => ({
              sidebarExpanded: () => ({
                ...model.sidebarExpanded,
                [value]: !model.sidebarExpanded[value],
              }),
            }))
          : ThreadsRequests.requestConfigure({ items: model.threads.items, activeSlug: href })
      }),
  }),
})
export const SidebarMenus = makeKeyedArrayBinding(DropdownMenuBlock, {
  field: 'sidebarMenus',
  placement: 'sidebarMenus',
  key: 'id',
  childField: 'model',
  init: { instances: () => [], toItem: (occurrence, model) => ({ id: occurrence.key, model }) },
}).withOutMessagePolicy({
  fold: (_key, out) =>
    makeStep(() =>
      Update.combineSteps(
        out.events.flatMap((event) =>
          event._tag === 'Selected'
            ? [
                makeFieldsStep(() => ({
                  sidebarAction: () => `Menu item ${event.index + 1}`,
                })),
              ]
            : [],
        ),
      ),
    ),
})
export const SidebarCallouts = makeRequiredFieldBinding(CardGroupBlock, {
  field: 'sidebarCallouts',
  init: { contextToArgs: () => [{ id: 'preview-sidebar-callouts', fluidHover: false }] },
})
export const SidebarCalloutPresence = makeKeyedArrayBinding(PresenceBlock, {
  field: 'sidebarCalloutPresence',
  placement: 'sidebarCalloutPresence',
  key: 'id',
  childField: 'model',
  init: {
    instances: () =>
      ['sidebar', 'stars', 'motion'].map((id) => ({
        key: id,
        args: [{ id: `sidebar-callout-${id}`, open: true }] as const,
      })),
    toItem: (occurrence, model) => ({ id: occurrence.key, model }),
  },
}).withOutMessagePolicy({ fold: () => makeNoopStep() })
export const admitSidebarMenus = (configuration: Configuration) =>
  makeStep((model) =>
    Update.combineSteps(
      eligibleSidebarMenuIds(configuration)
        .filter((id) => !model.sidebarMenus.some((item) => item.id === id))
        .map((id) =>
          makeStep((parent) =>
            SidebarMenus.init({
              key: id,
              args: [{ id }],
              toParentModel: (child) => ({
                ...parent,
                sidebarMenus: [...parent.sidebarMenus, { id, model: child }],
              }),
            }),
          ),
        ),
    ),
  )
