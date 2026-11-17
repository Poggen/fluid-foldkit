import { sourceStyleAttributes } from './lib/source-style-attributes.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
import { childAttributes } from 'foldkit/html'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import type { HoverViewState } from './hover.js'
import { fontWeights } from './lib/font-weight.js'
import { sizeMap } from './lib/size.js'
import type { SizeVariant } from './lib/size.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation, PresentationContext } from './presentation.js'

export interface TableContext extends HoverViewState {
  readonly size: SizeVariant
  readonly presentation?: PresentationContext
  readonly selectedIndices?: ReadonlyArray<number>
  readonly headItemAttributes?: (
    index: number,
  ) => ReadonlyArray<Extract<Attribute<never>, { readonly _tag: 'DataAttribute' }>>
  readonly renderHeader?: (props: {
    readonly children: ReadonlyArray<Html | string>
    readonly className?: string
    readonly attributes?: ReadonlyArray<ChildAttribute>
  }) => Html
}

export interface TablePartProps<Message> {
  readonly children: ReadonlyArray<Html | string>
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
}

export interface TableRowProps<Message> extends TablePartProps<Message> {
  readonly keepRule?: boolean
  readonly index?: number
  readonly context?: TableContext
  readonly style?: Readonly<Record<string, string>>
}

export interface TableCellProps<Message> extends TablePartProps<Message>, Presentation {}
export interface TableHeadProps<Message> extends Omit<TableCellProps<Message>, 'context'> {
  readonly context?: PresentationContext | TableContext
  readonly hoverIndex?: number
}
export interface TableHeaderProps<Message> extends TablePartProps<Message> {
  readonly context?: TableContext
}

export function TableHeader<Message>(
  props: TableHeaderProps<Message>,
  h: HtmlBuilder<Message>,
): Html {
  if (props.context?.renderHeader !== undefined)
    return props.context.renderHeader({
      ...props,
      children: props.children,
      attributes: (props.attributes ?? []).flatMap((attribute) =>
        '_tag' in attribute ? childAttributes([attribute]) : [attribute],
      ),
    })
  return h.thead([h.Class(cn(props.className)), ...(props.attributes ?? [])], props.children)
}

export function TableBody<Message>(props: TablePartProps<Message>, h: HtmlBuilder<Message>): Html {
  return h.tbody([h.Class(cn(props.className)), ...(props.attributes ?? [])], props.children)
}

export function TableRow<Message>(props: TableRowProps<Message>, h: HtmlBuilder<Message>): Html {
  const { index, context } = props
  const isBodyRow = index !== undefined
  const activeIndex = context?.activeIndex ?? null

  const selected = context?.selectedIndices ?? []
  const hideBorder =
    (isBodyRow ? selected.includes(index) || selected.includes(index + 1) : selected.includes(0)) &&
    !(props.keepRule && !isBodyRow)

  return h.tr(
    sourceStyleAttributes(
      {
        fontVariationSettings: isBodyRow ? fontWeights.normal : fontWeights.semibold,
        ...props.style,
      },
      [
        h.Class(
          cn(
            'group/row relative z-10 *:border-b *:transition-[border-color] *:duration-80',
            'group-data-snap-rules/table:*:duration-0',
            hideBorder
              ? '*:border-transparent'
              : '*:border-accent/40 data-[under-highlight]:*:border-transparent data-[under-highlight]:*:duration-0',
            isBodyRow && activeIndex === index && 'is-active',
            props.className,
          ),
        ),
        ...(index === undefined
          ? []
          : [
              h.DataAttribute('fluid-hover-index', String(index)),
              ...(context?.itemAttributes(index) ?? []),
            ]),
        ...(props.attributes ?? []),
      ],
    ),
    props.children,
  )
}

export function TableHead<Message>(props: TableHeadProps<Message>, h: HtmlBuilder<Message>): Html {
  return h.th(
    [
      ...(props.hoverIndex === undefined
        ? []
        : [
            h.DataAttribute('head-hover', ''),
            ...((typeof props.context === 'function'
              ? undefined
              : props.context?.headItemAttributes?.(props.hoverIndex)) ?? []),
          ]),
      h.Class(
        cn(
          'text-left text-foreground',
          'py-(--table-cell-py)',
          (props.size ??
            (typeof props.context === 'function' ? props.context().size : props.context?.size) ??
            'default') === 'compact'
            ? 'px-2.5'
            : 'px-3',
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    props.children,
  )
}

export function TableCell<Message>(props: TableCellProps<Message>, h: HtmlBuilder<Message>): Html {
  return h.td(
    [
      h.Class(
        cn(
          'text-muted-foreground transition-colors duration-80 group-[.is-active]/row:text-foreground',
          'py-(--table-cell-py)',
          resolvePresentation(props).size.variant === 'compact' ? 'px-2.5' : 'px-3',
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    props.children,
  )
}

export const tableClassName = (size: SizeVariant, className?: string) =>
  cn(
    'w-full border-separate border-spacing-0',
    size === 'compact' ? '[--table-cell-py:5px]' : '[--table-cell-py:--spacing(2)]',
    sizeMap[size].text,
    className,
  )

export interface TableEmptyProps<Message> {
  readonly columns: number
  readonly title?: Html | string
  readonly description?: Html | string
  readonly action?: Html
  readonly children?: ReadonlyArray<Html | string>
  readonly rows?: number
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
}

/** Holds the same line boxes and shared vertical padding as populated body rows. */
export function TableEmpty<Message>(
  props: TableEmptyProps<Message>,
  h: HtmlBuilder<Message>,
): Html {
  return h.tr(
    [
      h.DataAttribute('slot', 'table-empty'),
      h.Class(cn(props.className)),
      ...(props.attributes ?? []),
    ],
    [
      h.td(
        [h.Colspan(props.columns), h.Class('p-0')],
        [
          h.div(
            [
              h.Class(
                'sticky left-0 flex w-(--table-view-w,100%) min-h-[calc(var(--table-empty-rows)*(1lh+2*var(--table-cell-py)+1px))] flex-col items-center justify-center gap-1 px-3 py-4 text-center',
              ),
              h.Style({ '--table-empty-rows': String(props.rows ?? 3) }),
            ],
            [
              ...(props.title === undefined || props.title === ''
                ? []
                : [
                    h.span(
                      [
                        h.Class('text-foreground'),
                        h.Style({ fontVariationSettings: fontWeights.semibold }),
                      ],
                      [props.title],
                    ),
                  ]),
              ...(props.description === undefined || props.description === ''
                ? []
                : [h.span([h.Class('text-muted-foreground')], [props.description])]),
              ...(props.children ?? []),
              ...(props.action === undefined || props.action === null
                ? []
                : [h.div([h.Class('mt-2')], [props.action])]),
            ],
          ),
        ],
      ),
    ],
  )
}
