import type { Html, HtmlBuilder } from 'foldkit/html'
import {
  buttonVariants,
  bgVariants,
  activeBgVariants,
  loadingBgVariants,
} from './lib/button-variants.js'
import type { ButtonSize, ButtonSizeCanonical } from './lib/button-variants.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Icon, Presentation } from './presentation.js'

type ButtonAttribute<Message, Requirements> = Parameters<
  HtmlBuilder<Message, Requirements>['button']
>[0][number]

export interface ButtonProps<Message, Requirements = never> extends Presentation {
  readonly children: ReadonlyArray<Html | string>
  readonly variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'destructive'
  readonly buttonSize?: ButtonSize
  readonly loading?: boolean
  readonly active?: boolean
  readonly disabled?: boolean
  readonly leadingIcon?: Icon
  readonly trailingIcon?: Icon
  readonly className?: string
  readonly attributes?: ReadonlyArray<ButtonAttribute<Message, Requirements>>
  readonly render?: (
    attributes: ReadonlyArray<ButtonAttribute<Message, Requirements>>,
    children: ReadonlyArray<Html | string>,
  ) => Html
}

function canonicalSize(
  size: ButtonSize | undefined,
  fallback: 'default' | 'compact',
): ButtonSizeCanonical {
  switch (size) {
    case 'sm': {
      return 'compact'
    }

    case 'md':
    case 'lg': {
      return 'default'
    }

    case 'icon-sm': {
      return 'icon-compact'
    }

    case 'icon-lg': {
      return 'icon'
    }

    case 'default':
    case 'compact':
    case 'toolbar':
    case 'icon':
    case 'icon-compact':
    case 'icon-toolbar': {
      return size
    }

    case undefined: {
      return fallback
    }

    default: {
      return fallback
    }
  }
}

function buttonContent<Message, Requirements>(
  props: ButtonProps<Message, Requirements>,
  iconOnly: boolean,
  iconSize: number,
  h: HtmlBuilder<Message, NoInfer<Requirements>>,
) {
  const leading = props.leadingIcon
  const trailing = props.trailingIcon
  const label = [...props.children]

  if (props.loading === true) {
    return [
      h.span(
        [h.Class('flex items-center justify-center gap-[inherit] opacity-0')],
        [
          leading && !iconOnly ? leading({ size: iconSize, strokeWidth: 2 }, h) : null,
          ...label,
          trailing && !iconOnly ? trailing({ size: iconSize, strokeWidth: 2 }, h) : null,
        ],
      ),
      h.span(
        [h.Class('absolute inset-0 flex items-center justify-center')],
        [
          h.svg(
            [
              h.Width(String(iconSize)),
              h.Height(String(iconSize)),
              h.ViewBox('0 0 16 16'),
              h.Fill('none'),
            ],
            [
              h.g(
                [
                  h.Class(
                    'origin-center [transform-box:fill-box] animate-[spinner-turn_1s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:[animation-duration:2s]',
                  ),
                ],
                [
                  h.circle([
                    h.Cx('8'),
                    h.Cy('8'),
                    h.R('6.25'),
                    h.Stroke('currentColor'),
                    h.StrokeWidth('1.5'),
                    h.StrokeLinecap('round'),
                    h.PathLength('100'),
                    h.Transform('rotate(-90 8 8)'),
                    h.Class(
                      'animate-[spinner-breathe_1s_cubic-bezier(0.65,0,0.35,1)_infinite] motion-reduce:[animation-duration:2s]',
                    ),
                  ]),
                ],
              ),
            ],
          ),
        ],
      ),
    ]
  }

  if (iconOnly) {
    return [
      h.span(
        [
          h.Class(
            '[&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-80 group-hover:[&_svg]:stroke-[2]',
          ),
        ],
        label,
      ),
    ]
  }

  return [
    leading
      ? leading(
          {
            size: iconSize,
            strokeWidth: 1.5,
            className: 'transition-[stroke-width] duration-80 group-hover:stroke-[2]',
          },
          h,
        )
      : null,
    h.span([h.Class('[text-box:trim-both_cap_alphabetic]')], label),
    trailing
      ? trailing(
          {
            size: iconSize,
            strokeWidth: 1.5,
            className: 'transition-[stroke-width] duration-80 group-hover:stroke-[2]',
          },
          h,
        )
      : null,
  ]
}

function backgroundVariant(
  variant: NonNullable<ButtonProps<never>['variant']>,
  active: boolean,
  loading: boolean,
): string {
  if (active) {
    return activeBgVariants[variant]
  }

  if (loading) {
    return loadingBgVariants[variant]
  }

  return bgVariants[variant]
}

export function Button<Message, Requirements = never>(
  props: ButtonProps<Message, Requirements>,
  h: HtmlBuilder<Message, NoInfer<Requirements>>,
): Html {
  const presentation = resolvePresentation(props)
  const size = canonicalSize(props.buttonSize, presentation.size.variant)
  const iconOnly = size === 'icon' || size === 'icon-compact' || size === 'icon-toolbar'
  const compact =
    size === 'compact' || size === 'toolbar' || size === 'icon-compact' || size === 'icon-toolbar'
  const iconSize = compact ? 14 : 16
  const variant = props.variant ?? 'primary'
  const leading = props.leadingIcon
  const trailing = props.trailingIcon
  const loading = props.loading === true

  const content = buttonContent(props, iconOnly, iconSize, h)

  const children = [
    h.span([
      h.AriaHidden(true),
      h.Class(
        cn(
          'absolute inset-px rounded-[inherit] transition-[box-shadow,background-color] [transition-duration:180ms,80ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1),ease] group-active:[transition-duration:80ms,80ms]',
          backgroundVariant(variant, props.active === true, loading),
        ),
      ),
    ]),
    h.span([h.Class('relative inline-flex items-center justify-center gap-[inherit]')], content),
  ]

  const attributes = [
    h.Class(
      cn(
        buttonVariants({
          variant,
          size,
          iconLeft: !iconOnly && Boolean(leading),
          iconRight: !iconOnly && Boolean(trailing),
        }),
        presentation.shape.button,
        props.className,
      ),
    ),
    ...(props.render === undefined
      ? [
          h.Type('button'),
          h.Tabindex(0),
          ...(props.disabled === true || loading ? [h.DataAttribute('disabled', '')] : []),
        ]
      : []),
    ...(loading && props.render === undefined ? [h.AriaBusy(true)] : []),
    ...(props.attributes ?? []),
  ]

  return props.render
    ? props.render(attributes, children)
    : h.button([...attributes, h.Disabled(props.disabled === true || loading)], children)
}

export { buttonVariants } from './lib/button-variants.js'

export type { ButtonSize } from './lib/button-variants.js'
