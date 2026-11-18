import { sourceStyleAttributes } from './lib/source-style-attributes.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Predicate } from 'effect'
import { inertHtml } from 'foldkit/html'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { fontWeights } from './lib/font-weight.js'
import { typeClass } from './lib/type-scale.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Icon, Presentation } from './presentation.js'

export const CardHeader: <Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CardHeader<Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const compact = resolvePresentation(props).size.variant === 'compact'

  return h.div(
    [
      h.DataAttribute('slot', 'card-header'),
      h.Class(
        cn(
          'grid auto-rows-min items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto]',
          headerSpacing(props.orientation, props.hasImage === true, compact),
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    [...(props.children ?? [])],
  ) satisfies Html
}

export const CardTitle: <Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CardTitle<Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const size = resolvePresentation(props).size.variant
  const trim = props.orientation === 'inline' ? '[text-box:trim-both_cap_alphabetic]' : ''

  return h.span(
    [
      h.DataAttribute('slot', 'card-title'),
      h.Class(
        cn('inline-grid grid-cols-[minmax(0,1fr)]', typeClass('subtitle', size), props.className),
      ),
      ...(props.attributes ?? []),
    ],
    [
      h.span(
        [
          h.Class(
            cn('col-start-1 row-start-1 invisible min-w-0 overflow-x-clip text-ellipsis', trim),
          ),
          h.AriaHidden(true),
          h.Style({ fontVariationSettings: fontWeights.semibold }),
        ],
        [...(props.children ?? [])],
      ),
      h.span(
        [
          h.Class(
            cn(
              'col-start-1 row-start-1 min-w-0 overflow-x-clip text-ellipsis text-foreground transition-[font-variation-settings] duration-80',
              trim,
            ),
          ),
          h.Style({
            fontVariationSettings:
              props.emphasized === true ? fontWeights.semibold : fontWeights.normal,
          }),
        ],
        [...(props.children ?? [])],
      ),
    ],
  ) satisfies Html
}

export const CardDescription: <Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CardDescription<Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.p(
    [
      h.DataAttribute('slot', 'card-description'),
      h.Class(
        cn(
          'text-muted-foreground',
          typeClass('subtitle', resolvePresentation(props).size.variant),
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    [...(props.children ?? [])],
  ) satisfies Html
}

export const CardAction: <Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CardAction<Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.div(
    [
      h.DataAttribute('slot', 'card-action'),
      h.Class(
        cn(
          'relative z-30 col-start-2 row-span-2 row-start-1 self-start justify-self-end',
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    [...(props.children ?? [])],
  ) satisfies Html
}

export const CardContent: <Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CardContent<Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const compact = resolvePresentation(props).size.variant === 'compact'

  return h.div(
    [
      h.DataAttribute('slot', 'card-content'),
      h.Class(cn(props.orientation === 'inline' ? '' : contentSpacing(compact), props.className)),
      ...(props.attributes ?? []),
    ],
    [...(props.children ?? [])],
  ) satisfies Html
}

export const CardFooter: <Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CardFooter<Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const compact = resolvePresentation(props).size.variant === 'compact'

  return h.div(
    [
      h.DataAttribute('slot', 'card-footer'),
      h.Class(
        cn(
          'relative z-30 flex items-center gap-1',
          footerSpacing(props.orientation, props.hasImage === true, compact),
          props.className,
        ),
      ),
      ...(props.attributes ?? []),
    ],
    [...(props.children ?? [])],
  ) satisfies Html
}

export const CardMedia: <Message, Requirements = never>(
  props: CardMediaProps,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CardMedia<Message, Requirements = never>(
  props: CardMediaProps,
  h: HtmlBuilder<Message, Requirements>,
) {
  const { shape, size } = resolvePresentation({
    ...props,
    size: props.context?.().size ?? 'default',
  })

  const wrap = cn(props.orientation === 'inline' ? '' : 'mb-2', props.className)
  const pixels = props.size ?? 22

  if (props.logo !== undefined && props.logo !== '') {
    const logos = Predicate.isString(props.logo) ? [props.logo] : props.logo

    return h.span(
      [
        h.DataAttribute('slot', 'card-media'),
        h.Class(cn('inline-flex items-center gap-1.5 shrink-0', wrap)),
      ],
      logos.map((src, i) =>
        h.span(
          [h.Class('inline-flex items-center gap-1.5')],
          [
            i > 0 ? h.span([h.AriaHidden(true), h.Class('w-2 h-px bg-border')]) : null,
            h.img([
              h.Class(
                cn(
                  'object-contain outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
                  shape.bg,
                ),
              ),
              h.Src(src),
              h.Alt(props.logoAlt ?? ''),
              h.Width(String(pixels)),
              h.Height(String(pixels)),
              h.Style({ width: `${pixels}px`, height: `${pixels}px` }),
            ]),
          ],
        ),
      ),
    ) satisfies Html
  }

  return (
    props.icon === undefined
      ? null
      : h.span(
          [
            h.DataAttribute('slot', 'card-media'),
            h.Class(
              cn(
                'inline-flex items-center justify-center shrink-0 size-8 bg-hover',
                shape.bg,
                wrap,
              ),
            ),
          ],
          [
            props.icon(
              {
                size: size.variant === 'compact' ? 16 : 18,
                strokeWidth: 1.5,
                className: 'text-muted-foreground',
              },
              inertHtml,
            ),
          ],
        )
  ) satisfies Html
}

export const CardImage: <Message, Requirements = never>(
  props: CardImageProps,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CardImage<Message, Requirements = never>(
  props: CardImageProps,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.img([
    h.Src(props.src),
    h.Alt(props.alt ?? ''),
    h.DataAttribute('slot', 'card-image'),
    h.Class(
      cn(
        'object-cover rounded-[2px] outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
        props.orientation === 'inline' ? 'size-40 shrink-0' : 'w-full aspect-[16/9]',
        props.className,
      ),
    ),
  ]) satisfies Html
}

export const renderCardEyebrow: <Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function renderCardEyebrow<Message, Requirements = never>(
  props: CardPartProps<Message, Requirements>,
  h: HtmlBuilder<Message, Requirements>,
) {
  return h.span(
    sourceStyleAttributes({ fontVariationSettings: fontWeights.semibold }, [
      h.Class(
        cn(
          typeClass('caption', resolvePresentation(props).size.variant),
          'text-muted-foreground',
          props.className,
        ),
      ),
      h.DataAttribute('slot', 'card-eyebrow'),
      ...(props.attributes ?? []),
    ]),
    [...(props.children ?? [])],
  ) satisfies Html
}

export const CardFeature: <Message, Requirements = never>(
  props: CardFeatureProps,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CardFeature<Message, Requirements = never>(
  props: CardFeatureProps,
  h: HtmlBuilder<Message, Requirements>,
) {
  const { size } = resolvePresentation(props)

  return h.div(
    [h.DataAttribute('slot', 'card-feature'), h.Class(cn('flex items-start', size.gap))],
    [
      props.icon?.(
        { size: size.icon, strokeWidth: 1.5, className: 'mt-0.5 shrink-0 text-muted-foreground' },
        inertHtml,
      ) ?? null,
      h.div(
        [h.Class('flex flex-col gap-0.5 min-w-0')],
        [
          h.span(
            [
              h.Class(cn('text-foreground [text-box:trim-both_cap_alphabetic]', size.text)),
              h.Style({ fontVariationSettings: fontWeights.semibold }),
            ],
            [props.title],
          ),
          props.description !== undefined && props.description !== ''
            ? h.span(
                [h.Class(cn('text-muted-foreground', typeClass('caption', size.variant)))],
                [props.description],
              )
            : null,
        ],
      ),
    ],
  ) satisfies Html
}

export const CardButton: <Message, Requirements = never>(
  props: CardButtonProps<Message>,
  h: HtmlBuilder<Message, Requirements>,
) => Html = function CardButton<Message, Requirements = never>(
  props: CardButtonProps<Message>,
  h: HtmlBuilder<Message, Requirements>,
) {
  const { shape, size, icons } = resolvePresentation(props)

  const glyph =
    props.icon?.(
      {
        size: size.variant === 'compact' ? 12 : 14,
        strokeWidth: 1.5,
        className: 'shrink-0 transition-[stroke-width] duration-80 group-hover/action:stroke-[2]',
      },
      inertHtml,
    ) ?? null

  const end = (props.iconPosition ?? (props.external === true ? 'end' : 'start')) === 'end'

  const attributes = [
    h.Class(
      cn(
        'group/action relative z-30 inline-flex items-center justify-center gap-1.5 h-7 px-2.5 cursor-pointer outline-none',
        typeClass('caption', size.variant),
        'transition-colors duration-80',
        'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        shape.button,
        buttonVariants[props.variant ?? 'ghost'],
      ),
    ),
    ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick)]),
    h.Style({ fontVariationSettings: fontWeights.normal }),
  ]

  const content = [
    end ? null : glyph,
    h.span([h.Class('[text-box:trim-both_cap_alphabetic]')], [...props.children]),
    end ? glyph : null,
    props.external === true
      ? icons['arrow-right'](
          {
            size: 13,
            strokeWidth: 1.5,
            className:
              'shrink-0 -rotate-45 transition-[stroke-width] duration-80 group-hover/action:stroke-[2]',
          },
          inertHtml,
        )
      : null,
  ]

  return (
    props.href !== undefined && props.href !== ''
      ? h.a(
          [
            ...attributes,
            h.Href(props.href),
            ...(props.external === true ? [h.Target('_blank'), h.Rel('noopener noreferrer')] : []),
          ],
          content,
        )
      : h.button([...attributes, h.Type('button'), h.Disabled(props.disabled ?? false)], content)
  ) satisfies Html
}

export type CardOrientation = 'card' | 'inline'

export type CardBorder = 'none' | 'outlined'

export type CardLogo = string | readonly [string, string]

export interface CardContext extends Presentation {
  readonly orientation?: CardOrientation
  readonly emphasized?: boolean
  readonly hasImage?: boolean
}

export interface CardPartProps<Message, Requirements = never> extends CardContext {
  readonly children?: ReadonlyArray<Html | string>
  readonly className?: string
  readonly attributes?: Parameters<HtmlBuilder<Message, Requirements>['div']>[0]
}

function headerSpacing(
  orientation: CardOrientation | undefined,
  hasImage: boolean,
  compact: boolean,
) {
  if (orientation === 'inline') {
    return hasImage ? 'min-w-0' : cn('min-w-0 flex-1', compact ? 'py-2.5' : 'py-3.5')
  }

  return compact ? 'px-3 pt-3' : 'px-4 pt-4'
}

function contentSpacing(compact: boolean) {
  return compact ? 'px-3 pt-2.5' : 'px-4 pt-3'
}

function footerSpacing(
  orientation: CardOrientation | undefined,
  hasImage: boolean,
  compact: boolean,
) {
  if (orientation === 'inline') {
    return hasImage ? 'flex-wrap' : cn('shrink-0 ml-auto', compact ? 'pr-3' : 'pr-4')
  }

  return cn('flex-wrap', contentSpacing(compact))
}

export interface CardMediaProps extends Omit<CardContext, 'size'> {
  readonly logo?: CardLogo
  readonly logoAlt?: string
  readonly icon?: Icon
  readonly size?: number
  readonly className?: string
}

export interface CardImageProps {
  readonly src: string
  readonly alt?: string
  readonly className?: string
  readonly orientation?: CardOrientation
}

export interface CardFeatureProps extends Presentation {
  readonly icon?: Icon
  readonly title: string
  readonly description?: string
}

export type CardButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link'

const buttonVariants: Readonly<Record<CardButtonVariant, string>> = {
  primary: 'bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80',
  secondary: 'bg-accent text-foreground hover:bg-accent/80 active:bg-accent',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-hover active:bg-active',
  link: 'text-foreground underline-offset-4 hover:underline !px-0 !h-auto',
}

export interface CardButtonProps<Message> extends Presentation {
  readonly children: ReadonlyArray<Html | string>
  readonly onClick?: Message
  readonly href?: string
  readonly variant?: CardButtonVariant
  readonly icon?: Icon
  readonly iconPosition?: 'start' | 'end'
  readonly external?: boolean
  readonly disabled?: boolean
}

/** @deprecated A card starts with its title. Retained for source compatibility. */
export const CardEyebrow = renderCardEyebrow
