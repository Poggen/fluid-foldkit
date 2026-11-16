// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { Badge } from './badge.js'
import type { BadgeColor } from './badge.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import type { MotionOptions } from './motion.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'

export interface ThinkingSourcesProps {
  readonly children: ReadonlyArray<Html | string>
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

export function ThinkingStepSources<Message>(props: ThinkingSourcesProps, h: HtmlBuilder<Message>) {
  return h.div(
    [h.Class(cn('flex flex-wrap gap-1.5 mt-1', props.className)), ...(props.attributes ?? [])],
    props.children,
  )
}

export interface ThinkingSourceProps extends Presentation {
  readonly children: ReadonlyArray<Html | string>
  readonly color?: BadgeColor
  readonly delay?: number
  readonly className?: string
  readonly animate: (node: Html, options: MotionOptions) => Html
}

export function ThinkingStepSource<Message>(props: ThinkingSourceProps, h: HtmlBuilder<Message>) {
  const delay = props.delay ?? 0

  return props.animate(
    h.span(
      [],
      [Badge({ ...props, variant: 'solid', badgeSize: 'sm', color: props.color ?? 'gray' }, h)],
    ),
    {
      initial: { opacity: 0, scale: 0.85, filter: 'blur(4px)' },
      animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
      transition: { ...spring.moderate, delay, filter: { duration: 0.12, delay } },
    },
  )
}

export interface ThinkingImageProps extends Presentation {
  readonly src: string
  readonly alt?: string
  readonly caption?: string
  readonly delay?: number
  readonly className?: string
  readonly animate: (node: Html, options: MotionOptions) => Html
}

export function ThinkingStepImage<Message>(props: ThinkingImageProps, h: HtmlBuilder<Message>) {
  const { shape, size } = resolvePresentation(props)
  const delay = props.delay ?? 0

  return props.animate(
    h.div(
      [h.Class(cn('mt-1.5', props.className))],
      [
        h.img([
          h.Src(props.src),
          h.Alt(props.alt ?? ''),
          h.Class(
            cn(
              'w-full max-w-[200px] object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
              shape.container,
            ),
          ),
        ]),
        props.caption !== undefined && props.caption !== ''
          ? h.span(
              [h.Class(cn(size.type.caption, 'text-muted-foreground mt-1 block'))],
              [props.caption],
            )
          : h.empty,
      ],
    ),
    {
      initial: { opacity: 0, filter: 'blur(4px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
      transition: {
        opacity: { duration: 0.2, delay, ease: 'easeOut' },
        filter: { duration: 0.15, delay },
      },
    },
  )
}

export function ThinkingStepDetailText<Message>(
  props: Presentation & { readonly text: string },
  h: HtmlBuilder<Message>,
) {
  return h.span(
    [h.Class(cn(resolvePresentation(props).size.type.caption, 'text-muted-foreground'))],
    [props.text],
  )
}
