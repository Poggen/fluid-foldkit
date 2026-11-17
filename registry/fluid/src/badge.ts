import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import {
  badgeColors,
  badgeVariants,
  type BadgeColor,
  type BadgeSize,
} from './lib/badge-variants.js'
import { cn } from './lib/utils.js'
import { resolvePresentation, type Presentation } from './presentation.js'

export interface BadgeProps<Message> extends Presentation {
  readonly children: ReadonlyArray<Html | string>
  readonly variant?: 'solid' | 'dot' | 'ghost'
  readonly color?: BadgeColor
  readonly badgeSize?: BadgeSize
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
}

export function Badge<Message>(props: BadgeProps<Message>, h: HtmlBuilder<Message>): Html {
  const presentation = resolvePresentation(props)

  const size =
    props.badgeSize === undefined
      ? presentation.size.variant
      : props.badgeSize === 'sm' || props.badgeSize === 'compact'
        ? 'compact'
        : 'default'

  const variant = props.variant ?? 'solid'
  const color = props.color ?? 'gray'
  const value = badgeColors[color]
  const solid = variant === 'solid'
  const dotSize = size === 'compact' ? '6px' : '7px'

  return h.span(
    sourceStyleAttributes({}, [
      h.Class(cn(badgeVariants({ variant, size }), presentation.shape.item, props.className)),
      ...(solid
        ? [
            h.Style({
              color: 'var(--foreground)',
              backgroundColor:
                color === 'gray'
                  ? 'var(--accent)'
                  : `color-mix(in srgb, ${value} 15%, var(--background))`,
            }),
          ]
        : []),
      ...(props.attributes ?? []),
    ]),
    [
      solid
        ? null
        : h.span([
            h.Class('shrink-0 rounded-full'),
            h.Style({
              width: dotSize,
              height: dotSize,
              backgroundColor: color === 'gray' ? 'var(--muted-foreground)' : value,
            }),
          ]),
      h.span(
        [h.Class('min-w-0 overflow-x-clip text-ellipsis [text-box:trim-both_cap_alphabetic]')],
        [...props.children],
      ),
    ],
  )
}

export { badgeColors, badgeVariants }

export type { BadgeColor, BadgeSize }
