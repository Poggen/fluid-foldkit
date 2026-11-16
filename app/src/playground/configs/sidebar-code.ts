import {
  callouts,
  sidebarSectionIds,
  menuRows,
  threadRows,
  childRows,
  defaults as sidebarDefaults,
  type Configuration,
} from './sidebar'
import { sidebarActionItems } from '../../gallery/fluid/sidebar-action-data'
import {
  sidebarCompositionSource,
  sidebarFeatureContractSource,
  sidebarFeatureBindingsSource,
  sidebarFeatureCompletionSource,
  sidebarRowsSource,
} from './sidebar-code-template'

export const sidebarCode = (
  configuration: Configuration,
) => `// configured-sidebar.ts — local application feature, using public native components.
import { Effect, Layer, Option, Queue, Schema, Stream } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { childAttributes, createKeyedLazy } from 'foldkit/html'
import { ScrollAreaBlock, layer as ScrollAreaLayer } from '@foldkit-visuals/fluid/scroll-area'
import { DocumentTooltipBlock, layer as TooltipLayer, makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import { DialogResources } from '@foldkit-visuals/fluid/dialog'
import { DialogResourcesLayer } from '@foldkit-visuals/fluid/dialog/environment'
import { DropdownResourcesLayer } from '@foldkit-visuals/fluid/dropdown/environment'
import { SidebarBlock, sidebarLayer } from '@foldkit-visuals/fluid/sidebar'
import { NavMenuBlock, navMenuLayer, hoverModeOf as navHover, NavItemConfig } from '@foldkit-visuals/fluid/nav-menu'
import { CardGroupBlock, CardGroupRefsDefaultLayer, Card, CardHeader, CardTitle, CardDescription, CardMedia, CardImage, layer as CardLayer, hoverModeOf as cardHover } from '@foldkit-visuals/fluid/card'
import { DropdownMenuBlock, menuLayer as DropdownMenuLayer, hoverModeOf as menuHover } from '@foldkit-visuals/fluid/dropdown'
import { PresenceBlock, layer as PresenceLayer } from '@foldkit-visuals/fluid/presence'
import { SidebarWorkspaceHeaderBlock, SidebarWorkspaceHeaderLayer, WorkspaceTile, hoverModeOf as workspaceHover } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarUserFooterBlock, SidebarUserFooterLayer, hoverModeOf as userHover } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { SidebarContent, SidebarFooter, SidebarHeader, SidebarGroup, SidebarGroupLabel, SidebarMenuSub, SidebarMenuSkeleton, SidebarTrigger, SidebarToggleTooltipContent } from '@foldkit-visuals/fluid/sidebar/parts'
import { SidebarSearchField } from '@foldkit-visuals/fluid/sidebar/search-field'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import type { Html } from 'foldkit/html'
import type { NavMenuViewInputs } from '@foldkit-visuals/fluid/nav-menu'
import type { CardGroupContext } from '@foldkit-visuals/fluid/card'
import type { PresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { SidebarActionContext, SidebarGroupActionContext } from '@foldkit-visuals/fluid/sidebar/parts'

const motion = createMotionScope('configured-sidebar')
const target = createTargetMotionScope('configured-sidebar-target')
const highlight = hoverHighlightAnimation(target)
const configuration = ${JSON.stringify(configuration, null, 2)} as const
const defaults = ${JSON.stringify(sidebarDefaults, null, 2)} as const
const presentation = { theme: 'light', accent: 'blue', shape: 'rounded', size: 'default', hover: 'fluid' } as const
const callouts = ${JSON.stringify(callouts, null, 2)} as const
const menuRows = ${JSON.stringify(menuRows)} as const
const threadRows = ${JSON.stringify(threadRows)} as const
const childRows = ${JSON.stringify(childRows)} as const
const SIDEBAR_THREADS = threadRows
const sidebarSectionIds = ${JSON.stringify(sidebarSectionIds)} as const
const sidebarActionItems = ${JSON.stringify(sidebarActionItems, null, 2)} as const
const sidebarActionRows = (position: 'header' | 'footer', count: number): ReadonlyArray<NavItemConfig> =>
  sidebarActionItems[position].slice(0, count).map(({ label }) => ({
    value: label, label, href: '#', disabled: false, status: null, badge: null, level: 0,
  }))
${sidebarFeatureContractSource}
${sidebarRowsSource}
${sidebarFeatureBindingsSource}
${sidebarCompositionSource}
${sidebarFeatureCompletionSource}
`
