import { sourceChildStyleAttributes } from './lib/source-style-attributes.js'
import { fontWeights } from './lib/font-weight.js'
import { Predicate } from 'effect'
/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { cn } from './lib/utils.js'

export const BreadcrumbList: <Message>(
  props: BreadcrumbPartProps,
  h: HtmlBuilder<Message>,
) => Html = function BreadcrumbList<Message>(props: BreadcrumbPartProps, h: HtmlBuilder<Message>) {
  const { size } = resolvePresentation(props)

  return h.ol(
    [
      h.DataAttribute('slot', 'breadcrumb-list'),
      h.Class(
        cn(
          'flex min-w-0 flex-nowrap items-center text-muted-foreground',
          size.text,
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
  ) satisfies Html
}

export const BreadcrumbItem: <Message>(
  props: BreadcrumbPartProps,
  h: HtmlBuilder<Message>,
) => Html = function BreadcrumbItem<Message>(props: BreadcrumbPartProps, h: HtmlBuilder<Message>) {
  return h.li(
    [
      h.DataAttribute('slot', 'breadcrumb-item'),
      h.Class(
        cn(
          'inline-flex min-w-0 shrink-0 items-center has-[[data-slot=breadcrumb-page]]:shrink',
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    props.children ?? [],
  ) satisfies Html
}

export const BreadcrumbEllipsis: <Message>(
  props: BreadcrumbPartProps,
  h: HtmlBuilder<Message>,
) => Html = function BreadcrumbEllipsis<Message>(
  props: BreadcrumbPartProps,
  h: HtmlBuilder<Message>,
) {
  return h.span(
    [
      h.DataAttribute('slot', 'breadcrumb-ellipsis'),
      h.AriaHidden(true),
      h.Class(cn('inline-flex items-center justify-center', props.className)),
      ...(props.attributes ?? []),
    ],
    [
      resolvePresentation(props).icons['more-horizontal'](
        { size: resolvePresentation(props).size.icon },
        h,
      ),
      h.span([h.Class('sr-only')], ['More']),
    ],
  ) satisfies Html
}

const crumb: <Message>(
  kind: 'link' | 'button' | 'page',
  props: BreadcrumbCrumbProps,
  context: BreadcrumbContext,
  h: HtmlBuilder<Message>,
) => Html = function crumb<Message>(
  kind: 'link' | 'button' | 'page',
  props: BreadcrumbCrumbProps,
  context: BreadcrumbContext,
  h: HtmlBuilder<Message>,
) {
  const presentation = resolvePresentation({ ...context, ...props })
  const { size, shape, icons } = presentation
  const compact = size.variant === 'compact'

  const children = wrapLabels(props.children ?? [], h)

  if (kind !== 'page' && context.separator !== null) {
    children.push(
      h.span(
        [
          h.DataAttribute('slot', 'breadcrumb-separator'),
          h.AriaHidden(true),
          h.Class(separatorClassName(compact, context.separator === undefined)),
        ],
        [context.separator ?? icons['chevron-right']({ size: size.icon - 2 }, h)],
      ),
    )
  }

  const attributes = sourceChildStyleAttributes({}, [
    ...childAttributes([
      h.Class(
        cn(
          'relative inline-flex min-w-0 shrink-0 items-center whitespace-nowrap',
          compact
            ? "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"
            : "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          size.segmentItem,
          size.itemPx,
          compact ? 'gap-1' : 'gap-1.5',
          shape.item,
          kind === 'page'
            ? 'shrink cursor-default text-foreground'
            : cn(
                compact ? 'max-w-40' : 'max-w-48',
                'shrink-0 cursor-pointer text-muted-foreground outline-none transition-colors duration-80 data-[fluid-hover-active]:text-foreground [&[aria-haspopup][data-state=open]]:text-foreground focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] disabled:pointer-events-none disabled:opacity-50',
                props.open === true && 'text-foreground',
              ),
          compact
            ? '[li:not(:last-child)_&]:has-[>[data-slot=breadcrumb-separator]]:pr-1'
            : '[li:not(:last-child)_&]:has-[>[data-slot=breadcrumb-separator]]:pr-1.5',
          props.className,
        ),
      ),
      h.Id(props.id),
      h.DataAttribute('breadcrumb-target', ''),
      h.DataAttribute('slot', `breadcrumb-${kind}`),
      ...(kind === 'page' ? [h.Role('link'), h.AriaDisabled(true), h.AriaCurrent('page')] : []),
      ...(kind === 'button' ? [h.Type('button'), h.Disabled(props.disabled ?? false)] : []),
      ...(props.href === undefined ? [] : [h.Href(props.href)]),
      h.Style({ fontVariationSettings: fontWeights.normal }),
    ]),
    ...(props.attributes ?? []),
  ])

  const render: (element?: BreadcrumbElementRenderer) => Html = (
    element?: BreadcrumbElementRenderer,
  ) => {
    if (props.render) {
      return props.render(attributes, children, element)
    }

    if (element) {
      return element(attributes, children)
    }

    if (kind === 'link') {
      return h.a(attributes, children)
    }

    if (kind === 'button') {
      return h.button(attributes, children)
    }

    return h.span(attributes, children)
  }

  const text = textOf(props)

  return (
    context.tooltip && text
      ? context.tooltip({
          id: props.id,
          text,
          kind,
          enabled: context.truncated.includes(props.id) && props.open !== true,
          render,
        })
      : render()
  ) satisfies Html
}

export type BreadcrumbTriggerAttributes = ReadonlyArray<ChildAttribute>

export type BreadcrumbElementRenderer = (
  attributes: BreadcrumbTriggerAttributes,
  children: ReadonlyArray<Html | string>,
) => Html

export interface BreadcrumbPartProps extends Presentation {
  readonly className?: string
  readonly attributes?: BreadcrumbTriggerAttributes
  readonly children?: ReadonlyArray<Html | string>
  readonly render?: (
    attributes: BreadcrumbTriggerAttributes,
    children: ReadonlyArray<Html | string>,
    element?: BreadcrumbElementRenderer,
  ) => Html
}

export interface BreadcrumbContext extends Presentation {
  readonly separator?: Html | string | null | undefined
  readonly truncated: ReadonlyArray<string>
  readonly tooltip?:
    | ((request: {
        readonly id: string
        readonly text: string
        readonly enabled: boolean
        readonly kind: 'link' | 'button' | 'page'
        readonly render: (element?: BreadcrumbElementRenderer) => Html
      }) => Html)
    | undefined
}

export interface BreadcrumbCrumbProps extends BreadcrumbPartProps {
  readonly id: string
  readonly href?: string
  readonly disabled?: boolean
  readonly open?: boolean
  readonly label?: string
}

const wrapLabels = <Message>(children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>) =>
  children.map((child) =>
    Predicate.isString(child)
      ? h.span([h.DataAttribute('slot', 'breadcrumb-label'), h.Class('min-w-0 truncate')], [child])
      : child,
  )

const textOf = (props: BreadcrumbCrumbProps) =>
  props.label ??
  (props.children ?? [])
    .filter((child): child is string => Predicate.isString(child))
    .join('')
    .trim()

const separatorClassName = (compact: boolean, isDefault: boolean) =>
  cn(
    'inline-flex select-none items-center justify-center text-muted-foreground',
    '[li:last-child_&]:hidden',
    compact ? '[&>svg]:!size-3' : '[&>svg]:!size-3.5',
    isDefault &&
      'transition-transform duration-150 ease-out motion-reduce:transition-none [[aria-haspopup][data-state=open]>&]:rotate-90 [[aria-haspopup][data-popup-open]>&]:rotate-90 [[aria-haspopup][data-fluid-hover-active]>&]:rotate-90 [[aria-haspopup]:focus-visible>&]:rotate-90',
  )

export const BreadcrumbLink: <Message>(
  props: BreadcrumbCrumbProps,
  context: BreadcrumbContext,
  h: HtmlBuilder<Message>,
) => Html = <Message>(
  props: BreadcrumbCrumbProps,
  context: BreadcrumbContext,
  h: HtmlBuilder<Message>,
) => crumb('link', props, context, h) satisfies Html

export const BreadcrumbButton: <Message>(
  props: BreadcrumbCrumbProps,
  context: BreadcrumbContext,
  h: HtmlBuilder<Message>,
) => Html = <Message>(
  props: BreadcrumbCrumbProps,
  context: BreadcrumbContext,
  h: HtmlBuilder<Message>,
) => crumb('button', props, context, h) satisfies Html

export const BreadcrumbPage: <Message>(
  props: BreadcrumbCrumbProps,
  context: BreadcrumbContext,
  h: HtmlBuilder<Message>,
) => Html = <Message>(
  props: BreadcrumbCrumbProps,
  context: BreadcrumbContext,
  h: HtmlBuilder<Message>,
) => crumb('page', props, context, h) satisfies Html
