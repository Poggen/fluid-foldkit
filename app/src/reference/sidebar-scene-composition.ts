import { ScrollAreaBlock } from '@foldkit-visuals/fluid/scroll-area'
import type { SidebarConfig } from '@foldkit-visuals/fluid/sidebar'
import { Update } from 'foldkit'
import { SidebarBlock } from '@foldkit-visuals/fluid/sidebar'
import { SidebarWorkspaceHeaderBlock } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarUserFooterBlock } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { NavMenuBlock } from '@foldkit-visuals/fluid/nav-menu'
import { DropdownMenuBlock } from '@foldkit-visuals/fluid/dropdown'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { SidebarCalloutsBlock } from './sidebar-callouts'
import { SidebarSceneBlock as Root } from './sidebar-scene-definition'
import { ObserveScene } from './sidebar-scene-observer'
import { AI_WORKSPACE } from './sidebar-data'
export const Scroll = Root.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: { contextToArgs: (config) => [{ id: `${config.id}-scroll` }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(ScrollAreaBlock, { Scrolled: Root.makeNoopStep }),
})
export const Sidebar = Root.makeRequiredFieldBinding(SidebarBlock, {
  field: 'sidebar',
  init: {
    contextToArgs: (config): [SidebarConfig] => [
      {
        id: config.id,
        variant: config.variant,
        persist: false,
        mobileBreakpoint: 0,
        collapsible: config.kind === 'layout' || config.kind === 'collapse' ? 'offcanvas' : 'none',
        peek: config.click ? 'click' : 'hover',
        defaultOpen: !config.click,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(SidebarBlock, {
    OpenChanged: Root.makeNoopStep,
    WidthChanged: Root.makeNoopStep,
  }),
})
export const Workspace = Root.makeRequiredFieldBinding(SidebarWorkspaceHeaderBlock, {
  field: 'workspace',
  init: {
    contextToArgs: (config) => [
      { id: `${config.id}-workspace`, name: AI_WORKSPACE, checkedIndex: 0 },
    ],
  },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(SidebarWorkspaceHeaderBlock, { Events: Root.makeNoopStep }),
})
export const User = Root.makeRequiredFieldBinding(SidebarUserFooterBlock, {
  field: 'user',
  init: { contextToArgs: (config) => [{ id: `${config.id}-user`, name: 'Micka Touillaud' }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(SidebarUserFooterBlock, { Events: Root.makeNoopStep }),
})
export const RawNavs = Root.makeRecordBinding(NavMenuBlock, { field: 'navs' })
export const Navs = RawNavs.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(NavMenuBlock, {
      Selected: ({ value }) =>
        Root.makeStep((model) => {
          const child = model.navs[key]
          return child === undefined
            ? { model }
            : Object.hasOwn(model.branches, value)
              ? Root.makeFieldsStep(() => ({
                  branches: (branches) => ({ ...branches, [value]: !branches[value] }),
                }))
              : RawNavs.requestConfigure(key, { items: child.items, activeSlug: value })
        }),
    }),
})
export const Menus = Root.makeRecordBinding(DropdownMenuBlock, {
  field: 'menus',
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DropdownMenuBlock, { Events: Root.makeNoopStep }),
})
export const Tooltips = Root.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DocumentTooltipBlock, { Transaction: Root.makeNoopStep }),
})
export const Callouts = Root.makeRequiredFieldBinding(SidebarCalloutsBlock, {
  field: 'callouts',
  init: {
    contextToArgs: (config) => [
      { id: `${config.id}-callouts`, single: config.kind === 'horizontal' },
    ],
  },
})
export const Composition = Root.makeComposition({
  bindings: [Scroll, Sidebar, Workspace, User, Navs, Menus, Tooltips, Callouts],
  mounts: [ObserveScene],
})
export const configurePinned = () =>
  Root.makeStep((model) =>
    Update.combineSteps(
      ['thread-3-branch', 'thread-0-branch'].flatMap((name) =>
        model.tooltips.rows[name] === undefined
          ? []
          : [
              Tooltips.requestConfigure({
                key: name,
                options: {
                  side: 'top',
                  forceOpen: model.isVisible && !model.isCursorInside ? true : undefined,
                },
              }),
            ],
      ),
    ),
  )
