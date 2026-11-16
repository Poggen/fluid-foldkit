// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import type { Html, HtmlBuilder } from 'foldkit/html'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { cn } from './lib/utils.js'

const actionTop = 'top-[calc((var(--row-h,32px)_-_24px)/2)]'
const iconClasses =
  '[&_svg]:size-[var(--icon-size)] [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-80 hover:[&_svg]:stroke-[2]'
const badgeOffset = (subRow: boolean) =>
  subRow
    ? 'group-has-[>[data-sidebar=menu-badge]]/menu-sub-item:right-8.5'
    : 'group-has-[>[data-sidebar=menu-badge]]/menu-item:right-8.5'

interface SidebarActionPresentation {
  readonly shape: NonNullable<Presentation['shape']>
  readonly size: NonNullable<Presentation['size']>
}

export type SidebarActionContext = SidebarActionPresentation &
  (
    | {
        readonly kind: 'menu'
        readonly placement: 'standalone' | 'cluster'
        readonly subRow: boolean
        readonly active: boolean
        readonly hasBadge: boolean
        readonly visibility?: 'always' | 'hover'
      }
    | { readonly kind: 'group'; readonly placement: 'standalone' | 'cluster' }
  )

export type SidebarMenuActionContext = Extract<SidebarActionContext, { readonly kind: 'menu' }>
export type SidebarGroupActionContext = Extract<SidebarActionContext, { readonly kind: 'group' }>

export interface SidebarActionRun {
  readonly entries: ReadonlyArray<Html>
}

export interface SidebarMenuActionRun extends SidebarActionRun {
  readonly visibility?: 'always' | 'hover'
}

export interface SidebarActionProps<Message> extends Presentation {
  readonly label: string
  readonly attributes?: Parameters<HtmlBuilder<Message>['button']>[0]
  readonly children: ReadonlyArray<Html>
  readonly actionContext?: SidebarActionContext
  readonly className?: string
  readonly render?: (
    attributes: Parameters<HtmlBuilder<Message>['button']>[0],
    children: ReadonlyArray<Html>,
  ) => Html
}

export function SidebarAction<Message>(
  props: SidebarActionProps<Message>,
  h: HtmlBuilder<Message>,
): Html {
  const inherited = resolvePresentation(props)
  const scope: SidebarActionContext = props.actionContext ?? {
    kind: 'menu',
    placement: 'standalone',
    subRow: false,
    active: false,
    hasBadge: false,
    shape: inherited.shape.variant,
    size: inherited.size.variant,
  }
  const clustered = scope.placement === 'cluster'
  const { shape, size } = resolvePresentation({
    ...props,
    shape: props.shape ?? scope.shape,
    size: props.size ?? scope.size,
  })
  const render = props.render ?? ((attributes, children) => h.button(attributes, children))
  return render(
    [
      ...(props.attributes ?? []),
      h.Type('button'),
      h.AriaLabel(props.label),
      h.DataAttribute('sidebar', scope.kind === 'group' ? 'group-action' : 'menu-action'),
      ...(!clustered && scope.kind === 'menu' && scope.visibility === 'hover'
        ? [h.DataAttribute('show-on-hover', '')]
        : []),
      h.Style({ '--icon-size': `${size.icon}px` }),
      h.Class(
        cn(
          clustered
            ? 'relative flex size-6 items-center justify-center text-muted-foreground outline-none'
            : 'absolute flex size-6 items-center justify-center text-muted-foreground outline-none',
          scope.kind === 'menu' && (clustered ? 'shrink-0' : 'right-1.5 z-10'),
          !clustered && (scope.kind === 'menu' ? actionTop : 'right-3.5 top-3'),
          !clustered && scope.kind === 'menu' && badgeOffset(scope.subRow),
          'hover:bg-hover hover:text-foreground duration-80',
          scope.kind === 'group'
            ? 'transition-colors'
            : 'transition-[color,background-color,opacity]',
          'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
          iconClasses,
          shape.item,
          !clustered &&
            scope.kind === 'menu' &&
            scope.visibility === 'hover' &&
            (scope.subRow
              ? 'opacity-0 group-hover/menu-sub-item:opacity-100 group-focus-within/menu-sub-item:opacity-100 data-[state=open]:opacity-100 data-[popup-open]:opacity-100 aria-expanded:opacity-100'
              : 'opacity-0 peer-hover/menu-button:opacity-100 peer-focus-visible/menu-button:opacity-100 hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 data-[popup-open]:opacity-100 aria-expanded:opacity-100'),
          props.className,
        ),
      ),
    ],
    props.children,
  )
}

export function SidebarMenuAction<Message>(
  props: Omit<SidebarActionProps<Message>, 'actionContext'> & {
    readonly actionContext?: SidebarMenuActionContext
    readonly showOnHover?: boolean
  },
  h: HtmlBuilder<Message>,
): Html {
  const { shape, size } = resolvePresentation(props)
  return SidebarAction(
    {
      ...props,
      actionContext: props.actionContext ?? {
        kind: 'menu',
        placement: 'standalone',
        subRow: false,
        active: false,
        hasBadge: false,
        shape: shape.variant,
        size: size.variant,
        visibility: props.showOnHover ? 'hover' : 'always',
      },
    },
    h,
  )
}

export function SidebarGroupAction<Message>(
  props: Omit<SidebarActionProps<Message>, 'actionContext'> & {
    readonly actionContext?: SidebarGroupActionContext
  },
  h: HtmlBuilder<Message>,
): Html {
  const { shape, size } = resolvePresentation(props)
  return SidebarAction(
    {
      ...props,
      actionContext: props.actionContext ?? {
        kind: 'group',
        placement: 'standalone',
        shape: shape.variant,
        size: size.variant,
      },
    },
    h,
  )
}

export function SidebarMenuActions<Message>(
  props: {
    readonly actionContext: SidebarMenuActionContext
    readonly actions: (context: SidebarMenuActionContext) => SidebarMenuActionRun
    readonly className?: string
  },
  h: HtmlBuilder<Message>,
): Html {
  const context: SidebarMenuActionContext = {
    kind: 'menu',
    placement: 'cluster',
    subRow: props.actionContext.subRow,
    active: props.actionContext.active,
    hasBadge: props.actionContext.hasBadge,
    shape: props.actionContext.shape,
    size: props.actionContext.size,
  }
  const run = props.actions(context)
  return h.div(
    [
      h.DataAttribute('sidebar', 'menu-actions'),
      h.Class(
        cn(
          'absolute right-1.5 z-10 flex items-center gap-1',
          actionTop,
          props.actionContext.hasBadge && 'right-8.5',
          run.visibility === 'hover' &&
            (props.actionContext.subRow
              ? 'opacity-0 transition-opacity duration-80 group-hover/menu-sub-item:opacity-100 group-focus-within/menu-sub-item:opacity-100 has-[[data-state=open]]:opacity-100 has-[[data-popup-open]]:opacity-100'
              : 'opacity-0 transition-opacity duration-80 peer-hover/menu-button:opacity-100 peer-focus-visible/menu-button:opacity-100 hover:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100 has-[[data-popup-open]]:opacity-100'),
          props.className,
        ),
      ),
    ],
    run.entries,
  )
}

export function SidebarGroupActions<Message>(
  props: Presentation & {
    readonly actions: (context: SidebarGroupActionContext) => SidebarActionRun
    readonly className?: string
  },
  h: HtmlBuilder<Message>,
): Html {
  const { shape, size } = resolvePresentation(props)
  const run = props.actions({
    kind: 'group',
    placement: 'cluster',
    shape: shape.variant,
    size: size.variant,
  })
  return h.div(
    [
      h.DataAttribute('sidebar', 'group-actions'),
      h.Class(cn('absolute right-3.5 top-2 z-10 flex h-8 items-center gap-1', props.className)),
    ],
    run.entries,
  )
}
