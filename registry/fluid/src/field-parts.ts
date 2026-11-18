import { sourceStyleAttributes } from './lib/source-style-attributes.js'
/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { fontWeights } from './lib/font-weight.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'

export const Field: <Message, Requirements>(
  props: FieldProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function Field<Message, Requirements>(
  props: FieldProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const { size } = resolvePresentation(props)
  const orientation = props.orientation ?? 'vertical'

  return h.div(
    [
      ...attrs(
        'field',
        cn(
          'group/field flex w-full',
          orientations[orientation],
          orientation === 'horizontal' && size.gap,
          orientation === 'responsive' &&
            (size.variant === 'compact' ? '@md/field-group:gap-1' : '@md/field-group:gap-2'),
        ),
        props,
        h,
      ),
      h.DataAttribute('orientation', orientation),
      ...(props.invalid === true ? [h.DataAttribute('invalid', 'true')] : []),
      ...((props.label ?? '') !== '' || (props.labelledBy ?? '') !== '' ? [h.Role('group')] : []),
      ...(props.label !== undefined && props.label !== '' ? [h.AriaLabel(props.label)] : []),
      ...(props.labelledBy !== undefined && props.labelledBy !== ''
        ? [h.AriaLabelledBy(props.labelledBy)]
        : []),
    ],
    props.children ?? [],
  ) satisfies Html
}

export const FieldSet: <Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function FieldSet<Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.fieldset(
    attrs('field-set', 'm-0 flex min-w-0 flex-col gap-3 border-0 p-0', props, h),
    props.children ?? [],
  ) satisfies Html
}

export const FieldGroup: <Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function FieldGroup<Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.div(
    attrs('field-group', '@container/field-group flex w-full flex-col gap-3', props, h),
    props.children ?? [],
  ) satisfies Html
}

export const FieldContent: <Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function FieldContent<Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.div(
    attrs('field-content', 'flex min-w-0 flex-1 flex-col gap-1', props, h),
    props.children ?? [],
  ) satisfies Html
}

export const FieldLegend: <Message, Requirements>(
  props: FieldLegendProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function FieldLegend<Message, Requirements>(
  props: FieldLegendProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const { size } = resolvePresentation(props)
  const legend = props.variant !== 'label'

  return h.legend(
    sourceStyleAttributes(
      {
        fontVariationSettings: legend ? fontWeights.semibold : fontWeights.normal,
      },
      [
        ...attrs(
          'field-legend',
          cn(
            'mb-1 p-0',
            legend
              ? cn(size.type.subtitle, 'text-foreground')
              : cn(size.type.body, 'text-muted-foreground'),
          ),
          props,
          h,
        ),
        h.DataAttribute('variant', props.variant ?? 'legend'),
      ],
    ),
    props.children ?? [],
  ) satisfies Html
}

export const FieldLabel: <Message, Requirements>(
  props: FieldLabelProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function FieldLabel<Message, Requirements>(
  props: FieldLabelProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const { size, shape } = resolvePresentation(props)

  return h.label(
    sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
      ...attrs(
        'field-label',
        cn(
          'w-fit text-muted-foreground group-data-[orientation=horizontal]/field:text-foreground group-data-[invalid=true]/field:text-destructive',
          size.type.body,
          'has-[>[data-slot=field]]:block has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:border has-[>[data-slot=field]]:border-border',
          {
            pill: 'has-[>[data-slot=field]]:rounded-3xl',
            rounded: 'has-[>[data-slot=field]]:rounded-xl',
            sharp: 'has-[>[data-slot=field]]:rounded-[1px]',
          }[shape.variant],
          size.variant === 'compact'
            ? 'has-[>[data-slot=field]]:p-2.5'
            : 'has-[>[data-slot=field]]:p-3',
          'has-[>[data-slot=field]]:transition-[background-color,border-color] has-[>[data-slot=field]]:duration-80 has-[>[data-slot=field]]:hover:bg-hover has-[>[data-slot=field]]:hover:[&_[data-slot=checkbox]:not([data-disabled]):not(:disabled):not([aria-invalid=true])]:border-foreground/40 has-[[data-state=checked]]:border-foreground/40 has-[[data-checked]]:border-foreground/40 has-[>[data-slot=field]]:has-focus-visible:ring-1 has-[>[data-slot=field]]:has-focus-visible:ring-[color:var(--focus-ring,#6B97FF)] has-[>[data-slot=field]]:[&_[data-slot=checkbox]:focus-visible]:ring-0',
        ),
        props,
        h,
      ),
      ...(props.htmlFor === undefined ? [] : [h.For(props.htmlFor)]),
    ]),
    props.children ?? [],
  ) satisfies Html
}

export const FieldTitle: <Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function FieldTitle<Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.div(
    sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
      ...attrs(
        'field-title',
        cn(resolvePresentation(props).size.type.body, 'text-foreground'),
        props,
        h,
      ),
    ]),
    props.children ?? [],
  ) satisfies Html
}

export const FieldDescription: <Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function FieldDescription<Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.p(
    sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
      ...attrs(
        'field-description',
        cn(resolvePresentation(props).size.type.caption, 'text-pretty text-muted-foreground'),
        props,
        h,
      ),
    ]),
    props.children ?? [],
  ) satisfies Html
}

export const FieldSeparator: <Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function FieldSeparator<Message, Requirements>(
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const { size } = resolvePresentation(props)

  return h.div(
    [
      ...attrs('field-separator', 'relative flex h-5 items-center', props, h),
      ...((props.children?.length ?? 0) > 0 ? [h.DataAttribute('content', 'true')] : []),
    ],
    [
      h.div([h.AriaHidden(true), h.Class('absolute inset-x-0 top-1/2 h-px bg-border')]),
      (props.children?.length ?? 0) > 0
        ? h.span(
            [
              h.Class(
                cn('relative mx-auto bg-background px-2 text-muted-foreground', size.type.caption),
              ),
              h.Style({ fontVariationSettings: fontWeights.normal }),
            ],
            props.children,
          )
        : null,
    ],
  ) satisfies Html
}

export const FieldError: <Message, Requirements>(
  props: FieldErrorProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function FieldError<Message, Requirements>(
  props: FieldErrorProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const { size, icons } = resolvePresentation(props)

  const messages = new Set<string>()

  for (const entry of props.errors ?? []) {
    if (entry?.message !== undefined && entry.message !== '') {
      messages.add(entry.message)
    }
  }

  const children = props.children?.filter((child) => child !== null && child !== '') ?? []
  let content: ReadonlyArray<Html | string> = [...messages]

  if (messages.size > 1) {
    content = [
      h.ul(
        [h.Class('m-0 flex list-none flex-col gap-1 p-0')],
        [...messages].map((message) => h.li([], [message])),
      ),
    ]
  }

  if (children.length > 0) {
    content = children
  }

  if (!content.length) {
    return null satisfies Html
  }

  return h.div(
    sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
      ...attrs(
        'field-error',
        cn('flex items-start text-destructive', size.gap, size.type.caption),
        props,
        h,
      ),
      h.Role('alert'),
    ]),
    [
      icons['circle-alert'](
        {
          size: size.variant === 'compact' ? 12 : 14,
          strokeWidth: 1.75,
          className: 'mt-px shrink-0',
        },
        h,
      ),
      h.div([h.Class('min-w-0')], content),
    ],
  ) satisfies Html
}

export type FieldOrientation = 'vertical' | 'horizontal' | 'responsive'

export interface FieldPartProps<Message, Requirements = never> extends Presentation {
  readonly id?: string
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message, Requirements>>
  readonly children?: ReadonlyArray<Html | string>
}

export interface FieldProps<Message, Requirements = never> extends FieldPartProps<
  Message,
  Requirements
> {
  readonly orientation?: FieldOrientation
  readonly label?: string
  readonly labelledBy?: string
  readonly invalid?: boolean
}

export interface FieldLabelProps<Message, Requirements = never> extends FieldPartProps<
  Message,
  Requirements
> {
  readonly htmlFor?: string
}

export interface FieldLegendProps<Message, Requirements = never> extends FieldPartProps<
  Message,
  Requirements
> {
  readonly variant?: 'legend' | 'label'
}

export interface FieldErrorProps<Message, Requirements = never> extends FieldPartProps<
  Message,
  Requirements
> {
  readonly errors?: ReadonlyArray<{ readonly message?: string } | undefined>
}

const orientations = {
  vertical: 'flex-col gap-1',
  horizontal:
    'flex-row items-center has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[data-slot=checkbox]]:mt-0.5',
  responsive:
    'flex-col gap-1 @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[data-slot=checkbox]]:mt-0.5',
}

function attrs<Message, Requirements>(
  slot: string,
  classes: string,
  props: FieldPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  return [
    h.DataAttribute('slot', slot),
    ...(props.id === undefined ? [] : [h.Id(props.id)]),
    h.Class(cn(classes, props.className)),
    ...(props.attributes ?? []),
  ]
}
