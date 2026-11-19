import { cn } from './lib/utils.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Option, Predicate } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ItemInfo } from '@foldkit/ui/nav'
import { hoverItemAttributes } from './hover-attributes.js'
import { SidebarMenuBadge } from './sidebar-parts.js'
import { SidebarMenuActions } from './sidebar-actions.js'
import type { SidebarMenuActionRun, SidebarMenuActionContext } from './sidebar-actions.js'
import { resolvePresentation } from './presentation.js'
import { NavItem } from './nav-item.js'
import type { NavItemProps } from './nav-item.js'
import type { NavItemConfig } from './nav-menu-state.js'
import type { HoverSnapshot } from './hover-observation.js'
import type { HoverRowLayout } from './hover-layout.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import { createPresentationContext } from './presentation.js'
import type { Presentation } from './presentation.js'
import type { MotionOptions } from './motion.js'

type NavMenuKind = NonNullable<NavItemProps<never>['kind']>

export interface NavMenuContent {
  readonly items: ReadonlyArray<NavItemConfig>
  readonly row: (
    value: string,
    options?: {
      readonly children?: ReadonlyArray<Html>
      readonly variant?: NavItemProps<never>['variant']
    },
  ) => Html
}

export interface NavMenuViewInputs extends Presentation {
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly highlight: HoverHighlightViewInputs['animate']
  readonly kind?: NavMenuKind | ((item: NavItemConfig) => NavMenuKind)
  readonly content?: (context: NavMenuContent) => ReadonlyArray<Html>
  readonly rowDisclosure?: (
    item: NavItemConfig,
  ) => { readonly expanded: boolean; readonly controls?: string } | undefined
  readonly focusRing?: boolean
  readonly sidebar?: boolean
  readonly variant?: NavItemProps<never>['variant']
  readonly className?: string
  readonly rowTrailing?: (item: NavItemConfig) => ReadonlyArray<Html>
  readonly rowBadge?: (item: NavItemConfig, active: boolean) => ReadonlyArray<Html>
  readonly rowActions?: (
    item: NavItemConfig,
    context: SidebarMenuActionContext,
  ) => SidebarMenuActionRun
  readonly icon?: (item: NavItemConfig, active: boolean) => Html | undefined
}

const sidebarRowGutter = (count: number, badge: boolean) => {
  if (count === 0 && !badge) return 8
  const actions = count === 0 ? 0 : count * 24 + (count - 1) * 4
  return (badge ? 8 + 24 : 6) + actions + (badge && count > 0 ? 4 : 0) + 4
}

const navRowAttributes = <Message>(
  props: {
    readonly config: NavItemConfig
    readonly item: ItemInfo
    readonly kind: NavMenuKind
    readonly disclosure: ReturnType<NonNullable<NavMenuViewInputs['rowDisclosure']>>
    readonly selected: Message
  },
  h: HtmlBuilder<Message>,
) => {
  const { config, item, kind, disclosure } = props

  return [
    ...(config.disabled || kind === 'button' || kind === 'action' ? [] : item.link),
    ...(config.disabled ? [] : [h.OnClick(props.selected)]),
    ...hoverItemAttributes(item.index, config.disabled),
    ...(disclosure === undefined
      ? []
      : [
          h.AriaExpanded(disclosure.expanded),
          ...(disclosure.controls === undefined ? [] : [h.AriaControls(disclosure.controls)]),
        ]),
  ]
}

const navRow: <Message>(
  props: {
    readonly config: NavItemConfig
    readonly authored: boolean
    readonly sidebar: boolean
    readonly anchor: Html
    readonly badges: ReadonlyArray<Html>
    readonly actions: SidebarMenuActionRun
    readonly actionContext: SidebarMenuActionContext
    readonly rowHeight: number
    readonly size: 'default' | 'compact'
    readonly children: ReadonlyArray<Html>
  },
  h: HtmlBuilder<Message>,
) => Html = <Message>(
  props: {
    readonly config: NavItemConfig
    readonly authored: boolean
    readonly sidebar: boolean
    readonly anchor: Html
    readonly badges: ReadonlyArray<Html>
    readonly actions: SidebarMenuActionRun
    readonly actionContext: SidebarMenuActionContext
    readonly rowHeight: number
    readonly size: 'default' | 'compact'
    readonly children: ReadonlyArray<Html>
  },
  h: HtmlBuilder<Message>,
) => {
  const wrapper = props.authored ? h.keyed('li') : h.keyed('div')
  const rowContent = [
    props.anchor,
    ...(props.sidebar && props.badges.length > 0
      ? props.badges
      : props.sidebar && props.config.badge !== null
        ? [
            SidebarMenuBadge(
              {
                children: [props.config.badge],
                active: props.actionContext.active,
                size: props.size,
              },
              h,
            ),
          ]
        : []),
    ...(props.actions.entries.length
      ? [
          SidebarMenuActions(
            { actionContext: props.actionContext, actions: () => props.actions },
            h,
          ),
        ]
      : []),
  ]

  return wrapper(
    props.config.value,
    [
      h.Class(
        cn(props.config.level > 0 ? 'group/menu-sub-item relative' : 'group/menu-item relative'),
      ),
      h.Style({
        '--row-h': `${props.rowHeight}px`,
        ...(!props.authored && props.sidebar && props.config.level > 0
          ? { marginInlineStart: `${props.config.level * 24}px` }
          : {}),
      }),
      h.DataAttribute('sidebar', props.config.level > 0 ? 'menu-sub-item' : 'menu-item'),
    ],
    [
      ...(!props.authored && props.sidebar && props.config.level > 0
        ? [
            h.span([
              h.Class('pointer-events-none absolute inset-y-0 border-l border-border start-[-9px]'),
              h.AriaHidden(true),
            ]),
          ]
        : []),
      ...(props.authored ? [h.div([h.Class('relative')], rowContent)] : rowContent),
      ...props.children,
    ],
  ) satisfies Html
}

export const navMenuRows: <Message>(
  props: {
    readonly items: ReadonlyArray<NavItemConfig>
    readonly nativeItems: ReadonlyArray<ItemInfo>
    readonly itemFeedback: boolean
    readonly inputs: NavMenuViewInputs
    readonly snapshot: HoverSnapshot
    readonly layout: Option.Option<HoverRowLayout>
    readonly selected: (item: NavItemConfig) => Message
  },
  h: HtmlBuilder<Message>,
) => ReadonlyArray<Html> = <Message>(
  props: {
    readonly items: ReadonlyArray<NavItemConfig>
    readonly nativeItems: ReadonlyArray<ItemInfo>
    readonly itemFeedback: boolean
    readonly inputs: NavMenuViewInputs
    readonly snapshot: HoverSnapshot
    readonly layout: Option.Option<HoverRowLayout>
    readonly selected: (item: NavItemConfig) => Message
  },
  h: HtmlBuilder<Message>,
) => {
  const { inputs, snapshot } = props

  const presentation = { context: createPresentationContext(inputs) }

  const byValue = new Map(props.nativeItems.map((item) => [item.value, item]))

  if (byValue.size !== props.nativeItems.length) {
    throw new Error('NavMenu requires unique item values')
  }

  const visible = Option.isSome(props.layout)
    ? props.layout.value.filter((row) => row.visible && !row.disabled).map((row) => row.index)
    : props.items.flatMap((item, index) => (item.disabled ? [] : [index]))

  const current = props.nativeItems.find(
    (item) => item.isCurrent && props.items[item.index]?.disabled === false,
  )

  const visibleCurrent = props.nativeItems.some(
    (item) => item.isCurrent && visible.includes(item.index),
  )

  const context: NavMenuContent = {
    items: props.items,
    row: (value, options = {}) => {
      const item = byValue.get(value)
      const config = item === undefined ? undefined : props.items[item.index]

      if (item === undefined || config === undefined) {
        throw new Error(`Unknown NavMenu row: ${value}`)
      }

      const resolved = resolvePresentation(inputs)
      const badges = inputs.sidebar ? (inputs.rowBadge?.(config, item.isCurrent) ?? []) : []
      const actionContext: SidebarMenuActionContext = {
        kind: 'menu',
        placement: 'cluster',
        subRow: config.level > 0,
        active: item.isCurrent,
        hasBadge: inputs.sidebar === true && (badges.length > 0 || config.badge !== null),
        shape: resolved.shape.variant,
        size: resolved.size.variant,
      }
      const actions: SidebarMenuActionRun = inputs.rowActions?.(config, actionContext) ?? {
        entries: [],
      }
      const compact = resolved.size.variant === 'compact'
      const kind = Predicate.isFunction(inputs.kind) ? inputs.kind(config) : (inputs.kind ?? 'link')
      const disclosure = inputs.rowDisclosure?.(config)
      const authored = inputs.content !== undefined

      const tabbable = authored
        ? visible.includes(item.index) &&
          (item.isCurrent || (!visibleCurrent && item.index === visible[0]))
        : item.index === (current?.index ?? visible[0])

      const anchor = NavItem(
        {
          ...presentation,
          kind,
          sidebar: inputs.sidebar,
          variant: options.variant ?? inputs.variant ?? 'default',
          item: config,
          index: item.index,
          current: item.isCurrent,
          hovered: !props.itemFeedback && snapshot.activeIndex === item.index,
          itemFeedback: props.itemFeedback,
          focusRing: inputs.focusRing !== false,
          tabbable,
          actionCount: actions.entries.length,
          ...(inputs.sidebar
            ? {
                sidebarGutter: {
                  rest: sidebarRowGutter(
                    actions.visibility === 'hover' ? 0 : actions.entries.length,
                    actionContext.hasBadge,
                  ),
                  hover: sidebarRowGutter(actions.entries.length, actionContext.hasBadge),
                },
              }
            : {}),
          trailing: inputs.rowTrailing?.(config),
          icon: inputs.icon?.(config, item.isCurrent || snapshot.activeIndex === item.index),
          attributes: navRowAttributes(
            { config, item, kind, disclosure, selected: props.selected(config) },
            h,
          ),
        },
        h,
      )

      return navRow(
        {
          config,
          authored,
          sidebar: inputs.sidebar === true,
          anchor,
          badges,
          actions,
          actionContext,
          size: compact ? 'compact' : 'default',
          rowHeight: inputs.sidebar && config.level > 0 ? (compact ? 24 : 28) : compact ? 28 : 32,
          children: options.children ?? [],
        },
        h,
      )
    },
  }

  return (
    inputs.content === undefined
      ? props.items.map((item) => context.row(item.value))
      : [
          h.ul(
            [h.Class('relative flex w-full min-w-0 flex-col select-none')],
            inputs.content(context),
          ),
        ]
  ) satisfies ReadonlyArray<Html>
}
