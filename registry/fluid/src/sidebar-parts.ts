/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import type { SidebarActionRun, SidebarGroupActionContext } from './sidebar-actions.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { typeClass } from './lib/type-scale.js'
import { fontWeights } from './lib/font-weight.js'
import { cn } from './lib/utils.js'
import type { MotionOptions } from './motion.js'
import { spring } from './lib/springs.js'
import { sidebarGroupMotion, sidebarMenuSubMotion } from './sidebar-group-motion.js'
import { hoverSubtreeAttributes } from './hover.js'

export const SidebarMenuBadge: <Message>(
  props: SidebarPartProps & Presentation & { readonly active?: boolean },
  h: HtmlBuilder<Message>,
) => Html = function SidebarMenuBadge<Message>(
  props: SidebarPartProps & Presentation & { readonly active?: boolean },
  h: HtmlBuilder<Message>,
) {
  const { size } = resolvePresentation(props)
  return h.div(
    [
      h.Class(
        cn(
          'pointer-events-none absolute right-2 z-10 flex h-5 min-w-5 items-center justify-center px-1 tabular-nums',
          'top-[calc((var(--row-h,32px)_-_20px)/2)]',
          typeClass('micro', size.variant),
          'transition-[color,font-variation-settings] duration-80',
          props.active ? 'text-foreground' : 'text-muted-foreground',
          props.className,
        ),
      ),
      h.DataAttribute('sidebar', 'menu-badge'),
      h.Style({
        fontVariationSettings: props.active ? fontWeights.semibold : fontWeights.normal,
      }),
    ],
    props.children,
  ) satisfies Html
}

export const SidebarMenuItem: <Message>(
  props: SidebarMenuItemProps,
  h: HtmlBuilder<Message>,
) => Html = function SidebarMenuItem<Message>(
  props: SidebarMenuItemProps,
  h: HtmlBuilder<Message>,
) {
  const { size } = resolvePresentation(props)
  return h.li(
    [
      ...(props.attributes ?? []),
      h.DataAttribute('sidebar', 'menu-item'),
      h.Class(
        cn(
          'group/menu-item relative',
          size.variant === 'compact' ? '[--row-h:28px]' : '[--row-h:32px]',
          'has-[>[data-size=sm]]:[--row-h:28px] has-[>[data-size=lg]]:[--row-h:48px]',
          props.className,
        ),
      ),
    ],
    props.children,
  ) satisfies Html
}

export const SidebarMenuSubItem: <Message>(
  props: SidebarMenuItemProps,
  h: HtmlBuilder<Message>,
) => Html = function SidebarMenuSubItem<Message>(
  props: SidebarMenuItemProps,
  h: HtmlBuilder<Message>,
) {
  const { size } = resolvePresentation(props)
  return h.li(
    [
      ...(props.attributes ?? []),
      h.DataAttribute('sidebar', 'menu-sub-item'),
      h.Class(
        cn(
          'group/menu-sub-item relative',
          size.variant === 'compact' ? '[--row-h:24px]' : '[--row-h:28px]',
          'has-[>[data-size=sm]]:[--row-h:24px]',
          props.className,
        ),
      ),
    ],
    props.children,
  ) satisfies Html
}

export const SidebarMenuSub: <Message>(
  props: SidebarMenuSubProps<Message>,
  h: HtmlBuilder<Message>,
) => Html = function SidebarMenuSub<Message>(
  props: SidebarMenuSubProps<Message>,
  h: HtmlBuilder<Message>,
) {
  const open = props.open ?? true

  return props.animate(
    h.div(
      [
        h.DataAttribute('slot', 'sidebar-menu-sub-wrapper'),
        h.DataAttribute('sidebar-sub-open', String(open)),
        h.Class(cn('overflow-hidden', !open && 'h-0')),
      ],
      [
        h.ul(
          [
            ...(props.attributes ?? []),
            ...hoverSubtreeAttributes(!open),
            h.DataAttribute('sidebar', 'menu-sub'),
            h.DataAttribute('state', open ? 'open' : 'closed'),
            ...(open ? [] : [h.AriaHidden(true)]),
            h.Class(
              cn(
                'relative ml-[15px] flex min-w-0 flex-col border-l border-border pl-2 select-none',
                props.className,
              ),
            ),
          ],
          props.children,
        ),
      ],
    ),
    { initial: false, animate: {}, resource: sidebarMenuSubMotion },
  ) satisfies Html
}

export const SidebarSeparator: <Message>(h: HtmlBuilder<Message>) => Html =
  function SidebarSeparator<Message>(h: HtmlBuilder<Message>) {
    return h.div([
      h.DataAttribute('sidebar', 'separator'),
      h.Role('separator'),
      h.AriaOrientation('horizontal'),
      h.Class('mx-2 h-px shrink-0 bg-border'),
    ]) satisfies Html
  }

export const SidebarInput: <Message>(
  props: Presentation & {
    readonly attributes?: ReadonlyArray<Attribute<Message>>
    readonly placeholder?: string
    readonly className?: string
  },
  h: HtmlBuilder<Message>,
) => Html = function SidebarInput<Message>(
  props: Presentation & {
    readonly attributes?: ReadonlyArray<Attribute<Message>>
    readonly placeholder?: string
    readonly className?: string
  },
  h: HtmlBuilder<Message>,
) {
  const { shape, size } = resolvePresentation(props)

  return h.input([
    ...(props.attributes ?? []),
    h.DataAttribute('sidebar', 'input'),
    h.Placeholder(props.placeholder ?? 'Search…'),
    h.Class(
      `w-full bg-transparent px-3 text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-transparent transition-[background-color,box-shadow] duration-80 hover:bg-muted/50 hover:ring-border focus:bg-card focus:ring-border focus-visible:ring-[color:var(--focus-ring,#6B97FF)] ${size.variant === 'compact' ? 'h-7' : 'h-8'} ${size.field} ${shape.input} ${props.className ?? ''}`,
    ),
  ]) satisfies Html
}

export const SidebarGroup: <Message>(
  props: SidebarPartProps &
    Presentation &
    (
      | { readonly label?: never }
      | {
          readonly id: string
          readonly label: string
          readonly open: boolean
          readonly actions?: (context: SidebarGroupActionContext) => SidebarActionRun
          readonly animate: (node: Html, options: MotionOptions) => Html
          readonly onToggle: (open: boolean) => Message
        }
    ),
  h: HtmlBuilder<Message>,
) => Html = function SidebarGroup<Message>(
  props: SidebarPartProps &
    Presentation &
    (
      | { readonly label?: never }
      | {
          readonly id: string
          readonly label: string
          readonly open: boolean
          readonly actions?: (context: SidebarGroupActionContext) => SidebarActionRun
          readonly animate: (node: Html, options: MotionOptions) => Html
          readonly onToggle: (open: boolean) => Message
        }
    ),
  h: HtmlBuilder<Message>,
) {
  if (props.label === undefined) {
    return h.div(
      [
        h.DataAttribute('sidebar', 'group'),
        h.Class(cn('relative flex w-full min-w-0 flex-col p-2', props.className)),
      ],
      props.children,
    ) satisfies Html
  }

  const { shape, size, icons } = resolvePresentation(props)
  const actions =
    props.actions?.({
      kind: 'group',
      placement: 'cluster',
      shape: shape.variant,
      size: size.variant,
    }).entries ?? []
  const panelId = `${props.id}-panel`

  const button = [
    h.Id(`${props.id}-button`),
    h.Type('button'),
    h.AriaExpanded(props.open),
    h.AriaControls(panelId),
    h.OnClick(props.onToggle(!props.open)),
  ]

  const panel = [h.Id(panelId)]

  return h.div(
    [
      h.DataAttribute('sidebar', 'group'),
      h.Class(cn('relative flex w-full min-w-0 flex-col p-2', props.className)),
    ],
    [
      h.div(
        [h.Class('group/group-header w-full relative')],
        [
          h.button(
            [
              h.Class(
                `flex h-8 w-full shrink-0 cursor-pointer select-none items-center gap-2 ${shape.item} px-2 text-left ${typeClass('caption', size.variant)} text-muted-foreground outline-none transition-colors duration-80 hover:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]`,
              ),
              ...button,
              h.DataAttribute('sidebar', 'group-label'),
              ...(actions.length > 0
                ? [h.Style({ paddingRight: `${actions.length * 28 + 6}px` })]
                : []),
            ],
            [
              h.span([h.Class('min-w-0 truncate')], [props.label]),
              h.span(
                [
                  h.Class(
                    cn(
                      'ml-auto flex h-6 shrink-0 items-center justify-center overflow-hidden',
                      props.open
                        ? 'w-0 opacity-0 group-hover/group-header:w-6 group-hover/group-header:opacity-100 group-focus-within/group-header:w-6 group-focus-within/group-header:opacity-100 group-has-[[data-sidebar=group-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/group-header:w-6 group-has-[[data-sidebar=group-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/group-header:opacity-100 pointer-coarse:w-6 pointer-coarse:opacity-100'
                        : 'w-6 opacity-100',
                    ),
                  ),
                ],
                [
                  props.animate(
                    h.span(
                      [h.Class('inline-flex')],
                      [icons['chevron-right']({ size: size.icon, strokeWidth: 1.5 }, h)],
                    ),
                    {
                      initial: false,
                      animate: { rotate: props.open ? 90 : 0 },
                      transition: spring.fast,
                    },
                  ),
                ],
              ),
            ],
          ),
          ...(actions.length > 0
            ? [
                h.div(
                  [
                    h.DataAttribute('sidebar', 'group-actions'),
                    h.Class('absolute right-1.5 top-0 z-10 flex h-8 items-center gap-1'),
                  ],
                  actions,
                ),
              ]
            : []),
        ],
      ),
      props.animate(
        h.div(
          [
            ...panel,
            h.DataAttribute('sidebar-group-open', String(props.open)),
            h.Class(props.open ? 'overflow-visible' : 'h-0 overflow-hidden'),
            h.AriaHidden(!props.open),
          ],
          [h.div([h.Class('flex w-full min-w-0 flex-col')], props.children)],
        ),
        { initial: false, animate: {}, resource: sidebarGroupMotion },
      ),
    ],
  ) satisfies Html
}

export const SidebarInset: <Message>(props: SidebarPartProps, h: HtmlBuilder<Message>) => Html =
  function SidebarInset<Message>(props: SidebarPartProps, h: HtmlBuilder<Message>) {
    return h.main(
      [
        h.DataAttribute('slot', 'sidebar-inset'),
        h.Class(
          cn(
            'relative flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background',
            'peer-data-[variant=inset]:m-2 peer-data-[variant=inset]:peer-data-[side=left]:ml-0 peer-data-[variant=inset]:peer-data-[side=right]:mr-0',
            'peer-data-[variant=inset]:peer-data-[state=collapsed]:peer-data-[side=left]:ml-2 peer-data-[variant=inset]:peer-data-[state=collapsed]:peer-data-[side=right]:mr-2',
            'transition-[margin] duration-80',
            'peer-data-[variant=inset]:rounded-xl',
            'peer-data-[variant=inset]:bg-surface-2 peer-data-[variant=inset]:shadow-surface-2',
            props.className,
          ),
        ),
      ],
      props.children,
    ) satisfies Html
  }

export const SidebarGroupLabel: <Message>(
  props: SidebarPartProps & Presentation,
  h: HtmlBuilder<Message>,
) => Html = function SidebarGroupLabel<Message>(
  props: SidebarPartProps & Presentation,
  h: HtmlBuilder<Message>,
) {
  const { size } = resolvePresentation(props)
  return h.div(
    [
      h.DataAttribute('sidebar', 'group-label'),
      h.Class(
        cn(
          'flex h-8 shrink-0 items-center gap-2 px-2 text-muted-foreground outline-none',
          typeClass('caption', size.variant),
          props.className,
        ),
      ),
    ],
    props.children,
  ) satisfies Html
}

export const SidebarMenuSkeleton: <Message>(
  props: Presentation & {
    readonly index?: number
    readonly showIcon?: boolean
    readonly className?: string
  },
  h: HtmlBuilder<Message>,
) => Html = function SidebarMenuSkeleton<Message>(
  props: Presentation & {
    readonly index?: number
    readonly showIcon?: boolean
    readonly className?: string
  },
  h: HtmlBuilder<Message>,
) {
  const { size } = resolvePresentation(props)
  const widths = ['62%', '74%', '55%', '82%', '68%']

  return h.div(
    [
      h.DataAttribute('sidebar', 'menu-skeleton'),
      h.AriaHidden(true),
      h.Class(
        cn(
          'flex items-center gap-2 px-2',
          size.variant === 'compact' ? 'h-7' : 'h-8',
          props.className,
        ),
      ),
    ],
    [
      ...(props.showIcon === true
        ? [
            h.div([
              h.DataAttribute('sidebar', 'menu-skeleton-icon'),
              h.Class('size-4 shrink-0 animate-pulse rounded-md bg-hover'),
            ]),
          ]
        : []),
      h.div([
        h.Class('h-4 flex-1 animate-pulse rounded-md bg-hover'),
        h.DataAttribute('sidebar', 'menu-skeleton-text'),
        h.Style({ maxWidth: widths[(props.index ?? 0) % widths.length] ?? '62%' }),
      ]),
    ],
  ) satisfies Html
}

export interface SidebarPartProps {
  readonly children: ReadonlyArray<Html | string>
  readonly className?: string
}

const part =
  (name: string, base: string) =>
  <Message>(props: SidebarPartProps, h: HtmlBuilder<Message>) =>
    h.div(
      [h.DataAttribute('sidebar', name), h.Class(cn(base, props.className))],
      props.children,
    ) satisfies Html

export const SidebarHeader = part('header', 'flex shrink-0 flex-col gap-2 p-2')

export const SidebarFooter = part('footer', 'mt-auto flex shrink-0 flex-col gap-2 p-2')

export { SidebarContent } from './sidebar-content.js'
export type { SidebarContentProps } from './sidebar-content.js'
export { SidebarTrigger } from './sidebar-trigger.js'
export type { SidebarTriggerProps, SidebarTriggerButton } from './sidebar-trigger.js'
export { SidebarToggleTooltipContent } from './sidebar-tooltip-content.js'

export const SidebarGroupContent = part('group-content', 'w-full')

export {
  SidebarAction,
  SidebarGroupActions,
  SidebarMenuActions,
  SidebarMenuAction,
  SidebarGroupAction,
} from './sidebar-actions.js'

export type {
  SidebarActionContext,
  SidebarMenuActionContext,
  SidebarGroupActionContext,
  SidebarActionRun,
  SidebarMenuActionRun,
} from './sidebar-actions.js'

export interface SidebarMenuItemProps extends SidebarPartProps, Presentation {
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

export interface SidebarMenuSubProps<Message = never> extends SidebarPartProps, Presentation {
  readonly open?: boolean
  readonly attributes?: ReadonlyArray<Attribute<Message>>
  readonly animate: (node: Html, options: MotionOptions) => Html
}
