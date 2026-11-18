import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { fontWeights } from './lib/font-weight.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { childAttributes } from 'foldkit/html'
import type { Attribute, ChildAttribute, Html, HtmlBuilder, TaggedAttribute } from 'foldkit/html'
import { cn } from './lib/utils.js'
import { nestedRadius } from './lib/shape.js'
import { spring } from './lib/springs.js'
import type { LayoutMotionOptions } from './motion-layout.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import type { MessageFile, QueuedMessage } from './input-message-domain.js'
/** Retained FileThumbnail occurrence and removal lifetime are supplied by the native parent Binding. */

export const InputMessageFileTile: <M>(
  props: AnimatedPresentation &
    RemoveTooltip & {
      readonly tooltipKey: string
      readonly file: MessageFile
      readonly filePreviewSize: number
      readonly isTouch?: boolean
      readonly present: boolean
      readonly initial: boolean
      readonly completion: Attribute<M>
      readonly remove: TaggedAttribute<M>
      readonly thumbnail: (file: MessageFile, size: number, radius: number) => Html
    },
  h: HtmlBuilder<M>,
) => Html = function InputMessageFileTile<M>(
  props: AnimatedPresentation &
    RemoveTooltip & {
      readonly tooltipKey: string
      readonly file: MessageFile
      readonly filePreviewSize: number
      readonly isTouch?: boolean
      readonly present: boolean
      readonly initial: boolean
      readonly completion: Attribute<M>
      readonly remove: TaggedAttribute<M>
      readonly thumbnail: (file: MessageFile, size: number, radius: number) => Html
    },
  h: HtmlBuilder<M>,
) {
  const p = resolvePresentation(props)
  const remove = childAttributes([props.remove])

  return props.animate(
    h.keyed('div')(
      props.file.id,
      [h.Class('relative shrink-0 cursor-default group/tile'), props.completion],
      [
        props.thumbnail(
          props.file,
          props.filePreviewSize,
          nestedRadius(p.shape.containerRadius, 8),
        ),
        props.tooltip(
          {
            trigger: ({ button }) =>
              button(
                [
                  ...remove,
                  ...childAttributes([
                    h.Type('button'),
                    h.AriaLabel(`Remove ${props.file.name}`),
                    h.Class(
                      cn(
                        // oxlint-disable-next-line shadcn/no-raw-colors -- Original registry/default/input-message.tsx:260 at cc276ca0 owns this literal tile action.
                        'absolute top-1 right-1 w-5 h-5 rounded-full bg-neutral-900 text-white transition-opacity duration-80 flex items-center justify-center cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                        'before:absolute before:-inset-1.5',
                        props.isTouch
                          ? 'opacity-100'
                          : 'pointer-events-none opacity-0 group-hover/tile:pointer-events-auto group-hover/tile:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
                      ),
                    ),
                  ]),
                ],
                [p.icons.x({ size: 12, strokeWidth: 2.5 }, h)],
              ),
          },
          { key: props.tooltipKey, shapeClass: p.shape.bg, content: 'Remove', side: 'top' },
        ),
      ],
    ),
    {
      layout: true,
      initial: props.initial ? { opacity: 0, scale: 0.9 } : false,
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9, transition: spring.fast.exit },
      transition: spring.fast,
      present: props.present,
    },
  ) satisfies Html
}

export const InputMessageQueueRow: <M>(
  props: AnimatedPresentation &
    RemoveTooltip & {
      readonly tooltipKey: string
      readonly item: QueuedMessage
      readonly index: number
      readonly total: number
      readonly present: boolean
      readonly initial: boolean
      readonly reduceMotion: boolean
      readonly isTouch: boolean
      readonly attributes: ReadonlyArray<Attribute<M> | ChildAttribute>
      readonly removeAttributes: ReadonlyArray<ChildAttribute>
      readonly labelNode: Html
    },
  h: HtmlBuilder<M>,
) => Html = function InputMessageQueueRow<M>(
  props: AnimatedPresentation &
    RemoveTooltip & {
      readonly tooltipKey: string
      readonly item: QueuedMessage
      readonly index: number
      readonly total: number
      readonly present: boolean
      readonly initial: boolean
      readonly reduceMotion: boolean
      readonly isTouch: boolean
      readonly attributes: ReadonlyArray<Attribute<M> | ChildAttribute>
      readonly removeAttributes: ReadonlyArray<ChildAttribute>
      readonly labelNode: Html
    },
  h: HtmlBuilder<M>,
) {
  const p = resolvePresentation(props)
  const count = props.item.files.length
  const label = inputMessageQueueLabel(props.item)

  let initial: LayoutMotionOptions['initial'] = false

  if (props.initial) {
    initial = props.reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }
  }

  return props.animate(
    h.keyed('li')(
      props.item.id,
      sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
        h.Class(
          cn(
            'group/qrow flex items-center gap-2 rounded-lg bg-muted',
            p.size.variant === 'compact'
              ? 'h-7 px-2 text-[length:var(--fs-body-compact,12px)] leading-[var(--lh-body-compact,18px)]'
              : 'h-8 px-2.5 text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)]',
            'text-foreground select-none outline-none',
            'cursor-grab active:cursor-grabbing',
            'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
          ),
        ),
        h.AriaLabel(`Queued message ${props.index + 1} of ${props.total}: ${label}`),
        h.Tabindex(0),
        ...props.attributes,
      ]),
      [
        count
          ? h.span(
              [h.Class('flex shrink-0 items-center gap-0.5 text-muted-foreground')],
              [
                p.icons.image({ size: 13 }, h),
                props.item.text ? h.span([h.Class('tabular-nums')], [String(count)]) : null,
              ],
            )
          : null,
        props.labelNode,
        props.tooltip(
          {
            trigger: ({ button }) =>
              button(
                [
                  ...props.removeAttributes,
                  ...childAttributes([
                    h.Type('button'),
                    h.AriaLabel(`Remove queued message: ${label}`),
                    h.Class(
                      cn(
                        'relative shrink-0 flex h-5 w-5 items-center justify-center rounded-full',
                        'before:absolute before:-inset-1.5',
                        'text-muted-foreground hover:text-foreground hover:bg-hover',
                        props.isTouch
                          ? 'opacity-100'
                          : 'opacity-0 group-hover/qrow:opacity-100 focus-visible:opacity-100',
                        'transition-opacity duration-80 cursor-pointer outline-none',
                        'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                      ),
                    ),
                  ]),
                ],
                [p.icons.x({ size: 13, strokeWidth: 2.5 }, h)],
              ),
          },
          { key: props.tooltipKey, shapeClass: p.shape.bg, content: 'Remove', side: 'top' },
        ),
      ],
    ),
    {
      layout: true,
      initial,
      animate: { opacity: 1, scale: 1 },
      exit: props.reduceMotion
        ? { opacity: 0 }
        : { opacity: 0, scale: 0.97, transition: spring.fast.exit },
      transition: spring.fast,
      present: props.present,
    },
  ) satisfies Html
}

export const InputMessageSuggestionRow: <M>(
  props: Presentation & {
    readonly text: string
    readonly active: boolean
    readonly keyHint: boolean
    readonly optionId: string
    readonly attributes: ReadonlyArray<Attribute<M> | ChildAttribute>
  },
  h: HtmlBuilder<M>,
) => Html = function InputMessageSuggestionRow<M>(
  props: Presentation & {
    readonly text: string
    readonly active: boolean
    readonly keyHint: boolean
    readonly optionId: string
    readonly attributes: ReadonlyArray<Attribute<M> | ChildAttribute>
  },
  h: HtmlBuilder<M>,
) {
  const p = resolvePresentation(props)

  return h.div(
    sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
      h.Class(
        cn(
          'relative flex cursor-pointer items-center gap-2',
          p.size.variant === 'compact'
            ? 'h-7 px-2 text-[length:var(--fs-subtitle-compact,13px)] leading-[var(--lh-subtitle-compact,18px)]'
            : 'h-8 px-2.5 text-[length:var(--fs-subtitle,14px)] leading-[var(--lh-subtitle,20px)]',
          'text-muted-foreground transition-colors duration-80',
          props.active && 'text-foreground',
        ),
      ),
      h.Id(props.optionId),
      h.Role('option'),
      h.AriaSelected(props.active),
      ...props.attributes,
    ]),
    [
      h.span(
        [h.Class('min-w-0 flex-1 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1')],
        [props.text],
      ),
      !props.active && props.keyHint
        ? p.icons['arrow-down'](
            {
              size: 13,
              className: 'shrink-0 text-muted-foreground transition-opacity duration-80',
            },
            h,
          )
        : p.icons['corner-down-left'](
            {
              size: 13,
              className: cn(
                'shrink-0 transition-opacity duration-80',
                props.active ? 'opacity-100' : 'opacity-0',
              ),
            },
            h,
          ),
    ],
  ) satisfies Html
}

interface AnimatedPresentation extends Presentation {
  readonly animate: (node: Html, options: LayoutMotionOptions) => Html
}

interface RemoveTooltip {
  readonly tooltip: (
    context: {
      readonly trigger: (context: {
        readonly button: (
          attributes: ReadonlyArray<ChildAttribute>,
          children: ReadonlyArray<Html | string>,
          key?: string,
        ) => Html
      }) => Html
    },
    options: {
      readonly key: string
      readonly shapeClass: string
      readonly content: string
      readonly side: 'top'
    },
  ) => Html
}
/** Reorder driver supplies the actual Source-equivalent pan/layout attributes. */

export const inputMessageQueueLabel = (item: QueuedMessage) => {
  const count = item.files.length
  return item.text || `${count} attachment${count === 1 ? '' : 's'}`
}
