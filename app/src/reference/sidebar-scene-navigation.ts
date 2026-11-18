import type { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import type {
  SidebarMenuActionContext,
  SidebarMenuActionRun,
} from '@foldkit-visuals/fluid/nav-menu'
import type { NavMenuContent } from '@foldkit-visuals/fluid/nav-menu'
import { SidebarMenuSub, SidebarMenuAction } from '@foldkit-visuals/fluid/sidebar/parts'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import type { IconName } from '@foldkit-visuals/fluid/icons'
import type { SidebarSceneBlock } from './sidebar-scene-definition'
import { Composition, Menus } from './sidebar-scene-composition'
import { AI_NAV, WIKI_PRIVATE } from './sidebar-data'
import { presentation } from '../settings'
import { motion } from '../motion'

type SceneViewBuilder = Block.ViewBuilderFor<typeof Composition>
type SceneMenu = (typeof SidebarSceneBlock.Model.Type)['menus'][string]
type Branches = typeof WIKI_PRIVATE
type ScenePresentation = ReturnType<typeof presentation>

export const sidebarItemIcon = (label: string, branches: Branches | undefined) =>
  AI_NAV.find((row) => row.label === label)?.icon ??
  branches?.find((branch) => branch.label === label)?.icon ??
  branches?.flatMap((branch) => branch.children).find((row) => row.label === label)?.icon ??
  (label === 'New thread'
    ? 'plus'
    : label === 'Settings'
      ? 'settings'
      : label === 'What’s new'
        ? 'lightbulb'
        : undefined)

export const sidebarBranchRows = (
  branches: Branches,
  expanded: Readonly<Record<string, boolean>>,
  frameId: string,
  context: ScenePresentation,
  rows: NavMenuContent,
  h: SceneViewBuilder,
) =>
  branches.map((branch) =>
    rows.row(branch.label, {
      children: [
        SidebarMenuSub(
          {
            context,
            open: expanded[branch.label] ?? false,
            animate: motion.node,
            attributes: [h.Id(`${frameId}-branch-${branch.label.replaceAll(' ', '-')}`)],
            children: branch.children.map((item) => rows.row(item.label)),
          },
          h,
        ),
      ],
    }),
  )

export const sidebarThreadActions: (
  index: number,
  menu: SceneMenu,
  isRevealed: boolean,
  actionContext: SidebarMenuActionContext,
  context: ScenePresentation,
  tip: (key: string, label: string, icon: IconName) => Html,
  h: SceneViewBuilder,
) => SidebarMenuActionRun = (
  index: number,
  menu: SceneMenu,
  isRevealed: boolean,
  actionContext: SidebarMenuActionContext,
  context: ScenePresentation,
  tip: (key: string, label: string, icon: IconName) => Html,
  h: SceneViewBuilder,
) => ({
  visibility: isRevealed ? 'always' : 'hover',
  entries: [
    tip(`thread-${index}-branch`, 'Branch thread', 'corner-down-right'),
    tip(`thread-${index}-share`, 'Share thread', 'link'),
    h.block(
      Menus.embedView({
        key: String(index),
        slotId: menu.controller.id,
        model: menu,
        viewInputs: {
          context,
          animate: motion.node,
          contentClassName: 'min-w-[240px] w-[240px]',
          trigger: (trigger) =>
            SidebarMenuAction(
              {
                actionContext,
                label: 'More options',
                children: [defaultIcons['more-vertical']({ size: 16 }, h)],
                attributes: trigger,
              },
              h,
            ),
          content: (dropdown) => [
            DropdownItem(
              { index: 0, label: 'Rename', icon: defaultIcons.pencil, animate: motion.node },
              dropdown,
              h,
            ),
            DropdownItem(
              { index: 1, label: 'Delete', icon: defaultIcons.x, animate: motion.node },
              dropdown,
              h,
            ),
          ],
        },
      }),
    ),
  ],
})
