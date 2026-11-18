/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Data, Option, Schema } from 'effect'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { cn } from './lib/utils.js'
import { typeClass } from './lib/type-scale.js'
import { SURFACE_BG } from './lib/surface-classes.js'

const part: <Message>(
  props: DropdownPartProps,
  attributes: ReadonlyArray<Attribute<Message>>,
  h: HtmlBuilder<Message>,
) => Html = function part<Message>(
  props: DropdownPartProps,
  attributes: ReadonlyArray<Attribute<Message>>,
  h: HtmlBuilder<Message>,
) {
  const combined = [
    ...attributes.flatMap((attribute) =>
      '_tag' in attribute ? childAttributes([attribute]) : [attribute],
    ),
    ...(props.attributes ?? []),
  ]

  return (
    props.render
      ? props.render(combined, props.children ?? [])
      : h.div(combined, props.children ?? [])
  ) satisfies Html
}

export const DropdownLabel: <Message>(props: DropdownPartProps, h: HtmlBuilder<Message>) => Html =
  function DropdownLabel<Message>(props: DropdownPartProps, h: HtmlBuilder<Message>) {
    const { size } = resolvePresentation(props)

    return part(
      props,
      [
        h.Class(
          cn(
            'px-2 py-1.5 shrink-0 text-muted-foreground',
            typeClass('caption', size.variant),
            props.className,
          ),
        ),
      ],
      h,
    ) satisfies Html
  }

export const DropdownSeparator: <Message>(
  props: DropdownPartProps,
  h: HtmlBuilder<Message>,
) => Html = function DropdownSeparator<Message>(props: DropdownPartProps, h: HtmlBuilder<Message>) {
  return part(
    props,
    [h.Role('separator'), h.Class(cn('my-1 -mx-1 h-px shrink-0 bg-border/60', props.className))],
    h,
  ) satisfies Html
}

export const DropdownEmpty: <Message>(props: DropdownPartProps, h: HtmlBuilder<Message>) => Html =
  function DropdownEmpty<Message>(props: DropdownPartProps, h: HtmlBuilder<Message>) {
    const { size } = resolvePresentation(props)

    return part(
      props,
      [
        h.Class(
          cn(
            'min-h-(--fluid-results-height,64px)',
            'my-auto px-2 py-6 text-center text-muted-foreground',
            size.text,
            props.className,
          ),
        ),
        h.Role('status'),
        h.AriaLive('polite'),
        h.DataAttribute('fluid-empty-results', ''),
      ],
      h,
    ) satisfies Html
  }

export const DropdownSearch: <Message>(
  props: DropdownSearchProps<Message>,
  h: HtmlBuilder<Message>,
) => Html = function DropdownSearch<Message>(
  props: DropdownSearchProps<Message>,
  h: HtmlBuilder<Message>,
) {
  const { size, surface, icons } = resolvePresentation(props)

  const compact = size.variant === 'compact'

  const Events = Data.taggedEnum<Extract<Attribute<Message>, { readonly _tag: 'OnCustomEvent' }>>()

  const attributes = [
    ...childAttributes([
      h.Type('text'),
      h.Role('searchbox'),
      h.Autocomplete('off'),
      h.Attribute('autocorrect', 'off'),
      h.Spellcheck(false),
      h.Value(props.value),
      h.OnInput(props.onValueChange),
      Events.OnCustomEvent({
        name: DROPDOWN_SEARCH_CHANGE,
        f: (event: CustomEvent<unknown>) =>
          Schema.is(Schema.String)(event.detail)
            ? Option.some(props.onValueChange(event.detail))
            : Option.none(),
      }),
      h.Placeholder(props.placeholder ?? 'Search…'),
      h.DataAttribute('fluid-dropdown-search', ''),
      h.DataAttribute('clear-on-close', String(props.clearOnClose ?? true)),
      h.DataAttribute('auto-focus', String(props.autoFocus ?? true)),
      h.Class(
        cn(
          'min-w-0 flex-1 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
          size.field,
          compact ? 'leading-5' : 'leading-6',
        ),
      ),
    ]),
    ...(props.inputAttributes ?? []),
  ]

  return h.div(
    [
      h.Class(
        cn(
          'group/search sticky top-0 z-20 -mx-1 -mt-1 mb-0.5 flex shrink-0 items-center border-b border-border/60',
          SURFACE_BG[surface],
          size.control,
          size.gap,
          compact ? 'px-2.5' : 'px-3',
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    [
      icons.search(
        {
          size: size.icon,
          strokeWidth: 1.5,
          className:
            'shrink-0 text-muted-foreground transition-[color,stroke-width] duration-80 group-focus-within/search:text-foreground group-focus-within/search:stroke-[2]',
        },
        h,
      ),
      props.inputRender ? props.inputRender(attributes) : h.input(attributes),
    ],
  ) satisfies Html
}

export interface DropdownPartProps extends Presentation {
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly children?: ReadonlyArray<Html | string>
  readonly render?: (
    attributes: ReadonlyArray<ChildAttribute>,
    children: ReadonlyArray<Html | string>,
  ) => Html
}

export const DROPDOWN_SEARCH_CHANGE = 'fluid-dropdown-search-change'

export interface DropdownSearchProps<Message> extends Omit<
  DropdownPartProps,
  'children' | 'render'
> {
  readonly value: string
  readonly onValueChange: (value: string) => Message
  readonly placeholder?: string
  readonly clearOnClose?: boolean
  readonly autoFocus?: boolean
  readonly inputAttributes?: ReadonlyArray<ChildAttribute>
  readonly inputRender?: (attributes: ReadonlyArray<ChildAttribute>) => Html
}
