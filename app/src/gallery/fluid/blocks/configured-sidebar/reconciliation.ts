import { hoverModeOf as workspaceHover } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { hoverModeOf as userHover } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { NavItemConfig, hoverModeOf as navHover } from '@foldkit-visuals/fluid/nav-menu'
import { hoverModeOf as menuHover } from '@foldkit-visuals/fluid/dropdown'
import { hoverModeOf as cardHover } from '@foldkit-visuals/fluid/card'
import { SidebarHeaderActions, SidebarFooterActions } from './action-bindings'
import { sidebarActionRows } from '../../sidebar-action-data'
import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
import type { ComponentPresentation } from '../../../../settings'
import { sidebarRows, type Configuration } from '../../../../playground/configs/sidebar'
import { makeStep } from './block'
import {
  Sidebar,
  Threads,
  SidebarMenus,
  SidebarCallouts,
  SidebarWorkspace,
  SidebarUser,
} from './bindings'

const equalItems = Schema.toEquivalence(Schema.Array(NavItemConfig))

export const reconcileSidebar = (
  configuration: Configuration,
  presentation: ComponentPresentation,
  edited: ReadonlyArray<string> = ['*'],
) =>
  makeStep((model) => {
    const hover = configuration.appearance.hover ?? presentation.hover
    const rows = sidebarRows(configuration)
    const headerRows = sidebarActionRows('header', configuration.headerActions)
    const footerRows = sidebarActionRows('footer', configuration.footerActions)
    return Update.combineSteps([
      ...(workspaceHover(model.sidebarWorkspace) === hover
        ? []
        : [SidebarWorkspace.requestHoverMode({ mode: hover })]),
      ...(userHover(model.sidebarUser) === hover
        ? []
        : [SidebarUser.requestHoverMode({ mode: hover })]),
      ...(navHover(model.sidebarHeaderActions) === hover
        ? []
        : [SidebarHeaderActions.requestHoverMode({ mode: hover })]),
      ...(navHover(model.sidebarFooterActions) === hover
        ? []
        : [SidebarFooterActions.requestHoverMode({ mode: hover })]),
      ...(equalItems(model.sidebarHeaderActions.items, headerRows)
        ? []
        : [SidebarHeaderActions.requestConfigure({ items: headerRows, activeSlug: null })]),
      ...(equalItems(model.sidebarFooterActions.items, footerRows)
        ? []
        : [SidebarFooterActions.requestConfigure({ items: footerRows, activeSlug: null })]),
      ...(navHover(model.threads) === hover ? [] : [Threads.requestHoverMode({ mode: hover })]),
      ...(cardHover(model.sidebarCallouts) === hover
        ? []
        : [SidebarCallouts.requestHoverMode({ mode: hover })]),
      ...model.sidebarMenus.flatMap((item) =>
        menuHover(item.model) === hover
          ? []
          : [SidebarMenus.requestHoverMode(item.id, { mode: hover })],
      ),
      ...(model.sidebar.options.side === configuration.side &&
      model.sidebar.options.variant === configuration.variant
        ? []
        : [
            Sidebar.requestPresentation({
              side: configuration.side,
              variant: configuration.variant,
            }),
          ]),
      ...(model.sidebar.options.peek === configuration.collapsedBehavior &&
      model.sidebar.options.collapsible === 'offcanvas' &&
      model.sidebar.options.rail
        ? []
        : [
            Sidebar.requestBehavior({
              peek: configuration.collapsedBehavior,
              collapsible: 'offcanvas',
              rail: true,
            }),
          ]),
      ...(model.sidebar.width === `${configuration.width}px`
        ? []
        : [Sidebar.requestWidth({ width: `${configuration.width}px` })]),
      ...((edited.includes('*') || edited.includes('state')) &&
      model.sidebar.open !== (configuration.state !== 'closed')
        ? [Sidebar.requestOpen({ open: configuration.state !== 'closed' })]
        : []),
      ...(equalItems(model.threads.items, rows)
        ? []
        : [
            Threads.requestConfigure({
              items: rows,
              activeSlug: Option.getOrNull(model.threads.activeSlug),
            }),
          ]),
    ])
  })

export const reconcilePresentation = (presentation: ComponentPresentation) =>
  makeStep((model) => {
    const mode = presentation.hover
    return Update.combineSteps([
      ...(workspaceHover(model.sidebarWorkspace) === mode
        ? []
        : [SidebarWorkspace.requestHoverMode({ mode })]),
      ...(userHover(model.sidebarUser) === mode ? [] : [SidebarUser.requestHoverMode({ mode })]),
      ...(navHover(model.threads) === mode ? [] : [Threads.requestHoverMode({ mode })]),
      ...(navHover(model.sidebarHeaderActions) === mode
        ? []
        : [SidebarHeaderActions.requestHoverMode({ mode })]),
      ...(navHover(model.sidebarFooterActions) === mode
        ? []
        : [SidebarFooterActions.requestHoverMode({ mode })]),
      ...(cardHover(model.sidebarCallouts) === mode
        ? []
        : [SidebarCallouts.requestHoverMode({ mode })]),
      ...model.sidebarMenus.flatMap((item) =>
        menuHover(item.model) === mode ? [] : [SidebarMenus.requestHoverMode(item.id, { mode })],
      ),
    ])
  })
