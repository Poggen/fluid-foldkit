import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { fontWeights } from './lib/font-weight.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { Button } from './button.js'
import type { ButtonProps } from './button.js'
import { typeClass } from './lib/type-scale.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'

export interface BannerPartProps<Message> extends Presentation {
  readonly children: ReadonlyArray<Html | string>
  readonly className?: string
  readonly attributes?: ReadonlyArray<Attribute<Message> | ChildAttribute>
}

export function BannerTitle<Message>(props: BannerPartProps<Message>, h: HtmlBuilder<Message>) {
  return h.p(
    sourceStyleAttributes({ fontVariationSettings: fontWeights.semibold }, [
      h.Class(
        cn(
          'col-start-2 row-start-1 min-w-0 text-foreground',
          typeClass('subtitle', resolvePresentation(props).size.variant),
          props.className,
        ),
      ),
      h.DataAttribute('slot', 'banner-title'),
      ...(props.attributes ?? []),
    ]),
    props.children,
  )
}

export function BannerDescription<Message>(
  props: BannerPartProps<Message>,
  h: HtmlBuilder<Message>,
) {
  return h.p(
    [
      h.DataAttribute('slot', 'banner-description'),
      h.Class(
        cn(
          'col-start-2 row-start-2 mt-0.5 min-w-0 text-foreground',
          typeClass('subtitle', resolvePresentation(props).size.variant),
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    props.children,
  )
}

export function BannerActions<Message>(props: BannerPartProps<Message>, h: HtmlBuilder<Message>) {
  const compact = resolvePresentation(props).size.variant === 'compact'

  return h.div(
    [
      h.DataAttribute('slot', 'banner-actions'),
      h.Class(
        cn(
          'col-start-3 row-start-1 flex flex-wrap items-center gap-2',
          compact ? '-my-[5px] ml-2.5' : '-my-1 ml-3',
          'group-data-described/banner:col-start-2 group-data-described/banner:row-start-3 group-data-described/banner:my-0 group-data-described/banner:ml-0',
          compact ? 'group-data-described/banner:mt-1.5' : 'group-data-described/banner:mt-2',
          '@max-sm/banner:col-start-2 @max-sm/banner:row-start-3 @max-sm/banner:my-0 @max-sm/banner:ml-0',
          compact ? '@max-sm/banner:mt-1.5' : '@max-sm/banner:mt-2',
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    props.children,
  )
}

export type BannerActionVariant = 'primary' | 'secondary' | 'ghost'

const actionOrder: Record<BannerActionVariant, string> = {
  primary: 'order-3 group-data-described/banner:order-1 @max-sm/banner:order-1',
  secondary: 'order-2',
  ghost: 'order-1 group-data-described/banner:order-3 @max-sm/banner:order-3',
}

export interface BannerActionProps<Message> extends Omit<
  ButtonProps<Message>,
  'variant' | 'buttonSize' | 'render'
> {
  readonly variant?: BannerActionVariant
  readonly href?: string
  readonly external?: boolean
}

export function BannerAction<Message>(props: BannerActionProps<Message>, h: HtmlBuilder<Message>) {
  const { variant = 'secondary', href, external = false, className, attributes, ...rest } = props

  const options = {
    ...rest,
    variant,
    buttonSize: 'compact',
    className: cn(actionOrder[variant], variant === 'ghost' && 'text-foreground', className),
    attributes: [
      h.DataAttribute('slot', 'banner-action'),
      ...(href === undefined || href === '' ? [h.Type('button')] : []),
      ...(attributes ?? []),
    ],
  } satisfies ButtonProps<Message>

  return href === undefined || href === ''
    ? Button<Message>(options, h)
    : Button<Message>(
        {
          ...options,
          render: (attrs, children) =>
            h.a(
              [
                ...attrs,
                h.Href(href),
                ...(external ? [h.Target('_blank'), h.Rel('noopener noreferrer')] : []),
              ],
              children,
            ),
        },
        h,
      )
}
