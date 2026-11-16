import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { fontWeights } from './lib/font-weight.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { typeClass } from './lib/type-scale.js'
import { cn } from './lib/utils.js'
import { surfaceClasses } from './lib/surface-classes.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'

export interface DialogPartProps<Message, Requirements = never> extends Presentation {
  readonly children: ReadonlyArray<Html | string>
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message, Requirements> | ChildAttribute>
  readonly render?: (
    attributes: ReadonlyArray<Attribute<Message, Requirements> | ChildAttribute>,
    children: ReadonlyArray<Html | string>,
  ) => Html
}

export interface DialogNamedPartProps<Message, Requirements = never> extends DialogPartProps<
  Message,
  Requirements
> {
  readonly dialogId: string
}

export function DialogHeader<Message, Requirements>(
  props: DialogPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  const attributes = [
    h.Class(cn('flex flex-col gap-1.5 mb-4', props.className)),
    ...(props.attributes ?? []),
  ]

  return props.render?.(attributes, props.children) ?? h.div(attributes, [...props.children])
}

export function DialogFooter<Message, Requirements>(
  props: DialogPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  const attributes = [
    h.Class(cn('flex justify-end gap-2 mt-6', props.className)),
    ...(props.attributes ?? []),
  ]

  return props.render?.(attributes, props.children) ?? h.div(attributes, [...props.children])
}

export function DialogTitle<Message, Requirements>(
  props: DialogNamedPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  const { size } = resolvePresentation(props)

  const attributes = sourceStyleAttributes({ fontVariationSettings: fontWeights.semibold }, [
    h.Class(cn(typeClass('title', size.variant), 'text-foreground', props.className)),
    h.Id(`${props.dialogId}-dialog-title`),
    h.DataAttribute('fluid-dialog-title', ''),
    ...(props.attributes ?? []),
  ])

  return props.render?.(attributes, props.children) ?? h.h2(attributes, [...props.children])
}

export function DialogDescription<Message, Requirements>(
  props: DialogNamedPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  const { size } = resolvePresentation(props)

  const attributes = [
    h.Id(`${props.dialogId}-dialog-description`),
    h.DataAttribute('fluid-dialog-description', ''),
    h.Class(cn(typeClass('body', size.variant), 'text-muted-foreground', props.className)),
    ...(props.attributes ?? []),
  ]

  return props.render?.(attributes, props.children) ?? h.p(attributes, [...props.children])
}

export interface DialogContentProps<Message, Requirements = never> extends Omit<
  DialogPartProps<Message, Requirements>,
  'size' | 'render'
> {
  readonly key?: string
  readonly render?: (
    attributes: ReadonlyArray<Attribute<Message, Requirements> | ChildAttribute>,
    children: ReadonlyArray<Html | string>,
    key?: string,
  ) => Html
  readonly presentation?: Omit<Presentation, 'context'>
  readonly size?: 'sm' | 'lg' | 'xl'
  readonly position?: 'center' | 'top'
  readonly scoped?: boolean
}

export function DialogTrigger<Message, Requirements>(
  props: DialogPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  const attributes = [h.Type('button'), ...(props.attributes ?? [])]

  return props.render?.(attributes, props.children) ?? h.button(attributes, [...props.children])
}

export function DialogClose<Message, Requirements>(
  props: DialogPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  const attributes = [
    h.Type('button'),
    h.DataAttribute('fluid-dialog-close', ''),
    ...(props.attributes ?? []),
  ]

  return props.render?.(attributes, props.children) ?? h.button(attributes, [...props.children])
}

export const dialogContentClass = (
  props: Omit<DialogContentProps<never>, 'attributes' | 'children' | 'render'>,
) => {
  const { size: contentSize, ...inherited } = props
  const { shape, size, surface } = resolvePresentation({ ...inherited, ...props.presentation })
  const compact = size.variant === 'compact'
  const width = contentSize ?? 'sm'

  return cn(
    props.scoped === true ? 'absolute' : 'fixed',
    'left-1/2 z-[var(--z-modal,50)] w-[calc(100%-2rem)]',
    props.position === 'top' ? 'top-[12dvh]' : 'top-1/2',
    surfaceClasses(Math.min(surface + 4, 8)),
    'p-6 focus:outline-none',
    width === 'sm' && (compact ? 'max-w-[360px]' : 'max-w-[400px]'),
    width === 'lg' && (compact ? 'max-w-[480px]' : 'max-w-[540px]'),
    width === 'xl' && (compact ? 'max-w-[800px]' : 'max-w-[880px]'),
    shape.container,
    props.className,
  )
}

export function DialogContent<Message, Requirements>(
  props: DialogContentProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
): Html {
  const attributes = [h.Class(dialogContentClass(props)), ...(props.attributes ?? [])]

  return (
    props.render?.(attributes, props.children, props.key) ??
    (props.key === undefined
      ? h.div(attributes, [...props.children])
      : h.keyed('div')(props.key, attributes, [...props.children]))
  )
}

export type DialogTriggerProps<Message, Requirements = never> = DialogPartProps<
  Message,
  Requirements
>

export type DialogCloseProps<Message, Requirements = never> = DialogPartProps<Message, Requirements>
