import { layer as ScrollAreaLayer } from '@foldkit-visuals/fluid/scroll-area'
import { hoverModeOf as userHoverModeOf } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { hoverModeOf as workspaceHoverModeOf } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { hoverModeOf as dropdownHoverModeOf } from '@foldkit-visuals/fluid/dropdown'
import { hoverModeOf as navmenuHoverModeOf } from '@foldkit-visuals/fluid/nav-menu'
import { Layer } from 'effect'
import { Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { sidebarLayer } from '@foldkit-visuals/fluid/sidebar'
import { SidebarWorkspaceHeaderLayer } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarUserFooterLayer } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { navMenuLayer } from '@foldkit-visuals/fluid/nav-menu'
import { menuLayer } from '@foldkit-visuals/fluid/dropdown'
import { layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import type { NavItemConfig } from '@foldkit-visuals/fluid/nav-menu'
import { SidebarSceneBlock as Root } from './sidebar-scene-definition'
import {
  Composition,
  Workspace,
  User,
  Navs,
  Menus,
  Tooltips,
  configurePinned,
} from './sidebar-scene-composition'
import { ObserveScene } from './sidebar-scene-observer'
import { layer as CalloutLayer } from './sidebar-callouts'
import { AI_NAV, AI_THREADS, WIKI_PRIVATE, WIKI_SHARED, WIKI_RECENT } from './sidebar-data'
import { sidebarSceneView } from './sidebar-scene-view'
export { SidebarSceneBlock } from './sidebar-scene-definition'
const item: (label: string, level?: number, badge?: string | null) => NavItemConfig = (
  label: string,
  level = 0,
  badge: string | null = null,
) =>
  ({
    value: label,
    label,
    level,
    badge,
    href: label,
    disabled: false,
    status: null,
  }) satisfies NavItemConfig
export const wiki = [
  { label: 'Private', branches: WIKI_PRIVATE },
  { label: 'Shared', branches: WIKI_SHARED },
  { label: 'Recent', branches: WIKI_RECENT },
]
export const navConfigs: (
  kind: string,
) => ReadonlyArray<{ readonly key: string; readonly items: ReadonlyArray<NavItemConfig> }> = (
  kind: string,
) =>
  kind === 'nesting'
    ? wiki.map((group) => ({
        key: group.label,
        items: group.branches.flatMap((branch) => [
          item(branch.label),
          ...branch.children.map((child) => item(child.label, 1)),
        ]),
      }))
    : kind === 'layout'
      ? [{ key: 'Workspace', items: AI_NAV.map((row) => item(row.label)) }]
      : [
          {
            key: 'Threads',
            items: AI_THREADS.slice(
              0,
              kind === 'callouts' || kind === 'vertical' || kind === 'horizontal'
                ? 3
                : kind === 'collapse'
                  ? 5
                  : undefined,
            ).map((thread) => ({
              ...item(
                thread.label,
                0,
                kind === 'vertical' || kind === 'horizontal' ? null : thread.badge,
              ),
              status: kind === 'actions' && thread.status === 'active' ? 'unread' : thread.status,
            })),
          },
          { key: 'Header actions', items: [item('New thread')] },
          { key: 'Footer actions', items: [item('Settings'), item('What’s new')] },
        ]
export const layer = Root.makeLayer({
  init: Composition.makeInit((config) => ({
    childInitContext: config,
    model: {
      id: config.id,
      kind: config.kind,
      navs: {},
      menus: {},
      groups: { Workspace: true, Threads: true, Private: false, Shared: true, Recent: true },
      branches:
        config.kind === 'nesting'
          ? Object.fromEntries(
              wiki.flatMap((group) =>
                group.branches.map((branch) => [branch.label, group.label === 'Recent']),
              ),
            )
          : {},
      isCursorInside: false,
      isVisible: false,
      axes: [],
    },
    steps: [
      Tooltips.requestAdd({ key: `${config.id}-inset-trigger`, options: { side: 'bottom' } }),
      ...navConfigs(config.kind).map((nav) =>
        Root.makeStep((model) =>
          initAndInsert(Navs, model, {
            key: nav.key,
            args: [
              {
                id: `${config.id}-nav-${nav.key.toLowerCase().replaceAll(' ', '-')}`,
                items: nav.items,
                activeSlug: config.kind === 'layout' ? 'Chat' : null,
                itemFeedback: config.kind === 'layout' && config.variant === 'inset',
                ariaLabel: nav.key,
              },
            ],
          }),
        ),
      ),
      ...AI_THREADS.map((_thread, index) =>
        Root.makeStep((model) =>
          initAndInsert(Menus, model, {
            key: String(index),
            args: [{ id: `${config.id}-thread-${index}` }],
          }),
        ),
      ),
      ...[
        'search',
        'new',
        'filters',
        'group-new',
        'group-filters',
        'settings',
        'inbox',
        ...AI_THREADS.flatMap((_thread, index) => [
          `thread-${index}-branch`,
          `thread-${index}-share`,
        ]),
      ].map((key) =>
        Tooltips.requestAdd({
          key,
          options: { side: key.startsWith('thread') ? 'top' : 'bottom' },
        }),
      ),
    ],
  })),
  update: Composition.makeUpdate({
    UpdatedGroup: Root.makeFieldsStep.fromMessage(({ group, open }) => ({
      groups: (groups) => ({ ...groups, [group]: open }),
    })),
    UpdatedCursor: Root.makeStep((_model, { inside }) =>
      Update.combineSteps([
        Root.makeFieldsStep(() => ({ isCursorInside: () => inside })),
        configurePinned(),
      ]),
    ),
    Observed: Root.makeStep((_model, { visible, axes }) =>
      Update.combineSteps([
        Root.makeFieldsStep(() => ({ isVisible: () => visible, axes: () => axes })),
        configurePinned(),
      ]),
    ),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        Root.makeStep((current) =>
          workspaceHoverModeOf(current.workspace) === settings.hover
            ? { model: current }
            : Workspace.requestHoverMode({ mode: settings.hover }),
        ),
        Root.makeStep((current) =>
          userHoverModeOf(current.user) === settings.hover
            ? { model: current }
            : User.requestHoverMode({ mode: settings.hover }),
        ),
        ...Object.entries(model.navs).flatMap(([key, child]) =>
          navmenuHoverModeOf(child) === settings.hover
            ? []
            : [Navs.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...Object.entries(model.menus).flatMap(([key, child]) =>
          dropdownHoverModeOf(child) === settings.hover
            ? []
            : [Menus.requestHoverMode(key, { mode: settings.hover })],
        ),
      ]),
    ),
  }),
  view: sidebarSceneView(Root.Message),
  EffectsLayer: ObserveScene.layer,
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      sidebarLayer,
      ScrollAreaLayer,
      SidebarWorkspaceHeaderLayer,
      SidebarUserFooterLayer,
      navMenuLayer,
      menuLayer,
      TooltipLayer,
      CalloutLayer,
    ),
  ),
)
