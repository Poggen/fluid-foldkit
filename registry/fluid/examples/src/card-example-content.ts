// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import type { Html, HtmlBuilder } from 'foldkit/html'
import {
  Card,
  CardButton,
  CardContent,
  CardDescription,
  CardFeature,
  CardFooter,
  CardHeader,
  CardImage,
  CardMedia,
  CardTitle,
} from '@foldkit-visuals/fluid/card'
import type { CardButtonVariant, CardContext, CardGroupContext } from '@foldkit-visuals/fluid/card'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { Icon, Presentation } from '@foldkit-visuals/fluid/presentation'
import { CARD_BANNER, CARD_THUMB } from './card-example-art.js'

interface Feature {
  readonly title: string
  readonly description: string
  readonly icon: Icon
}

const features: ReadonlyArray<Feature> = [
  {
    title: 'Fluid motion',
    description: 'Spring-tuned transitions calibrated across three tiers',
    icon: defaultIcons.circle,
  },
  {
    title: 'Accessible by default',
    description: 'Focus-visible rings and ARIA roles in every part',
    icon: defaultIcons.shield,
  },
  {
    title: 'Yours to theme',
    description: 'Swap radius, icons, and primitive at runtime',
    icon: defaultIcons.palette,
  },
  {
    title: 'Dark mode ready',
    description: 'Tokens adapt to light and dark automatically',
    icon: defaultIcons.moon,
  },
]

type Actions = 'ghost' | 'primary' | 'pair' | 'all' | 'none'

const actionOptions: Readonly<
  Record<Actions, ReadonlyArray<{ variant: CardButtonVariant; label: string }>>
> = {
  ghost: [{ variant: 'ghost', label: 'Connect' }],
  primary: [{ variant: 'primary', label: 'Get started' }],
  pair: [
    { variant: 'primary', label: 'Get started' },
    { variant: 'secondary', label: 'Learn more' },
  ],
  all: [
    { variant: 'primary', label: 'Get started' },
    { variant: 'secondary', label: 'Learn more' },
    { variant: 'ghost', label: 'Connect' },
  ],
  none: [],
}

export interface CardRows<Message> {
  readonly group: CardGroupContext
  readonly media: 'icon' | 'logo' | 'image'
  readonly actions: Actions
  readonly selectedIndex: number
  readonly disabledLast: boolean
  readonly selected: (index: number) => Message
  readonly action: (label: string) => Message
}

export const cardRows = <Message>(
  props: CardRows<Message>,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> =>
  features.map((feature, index) => {
    const disabled = props.disabledLast && index === features.length - 1

    const card = {
      group: props.group,
      index,
      selected: index === props.selectedIndex,
      disabled,
      label: feature.title,
      onClick: props.selected(index),
      children: (context: CardContext) => [
        ...(props.media === 'image'
          ? []
          : [
              CardMedia(
                {
                  context: createPresentationContext(context),
                  orientation: props.group.orientation ?? 'card',
                  ...(props.media === 'logo' ? { logo: CARD_THUMB } : { icon: feature.icon }),
                },
                h,
              ),
            ]),
        CardHeader(
          {
            ...context,
            children: [
              CardTitle({ ...context, children: [feature.title] }, h),
              CardDescription({ ...context, children: [feature.description] }, h),
            ],
          },
          h,
        ),
        ...(props.actions === 'none'
          ? []
          : [
              CardFooter(
                {
                  ...context,
                  children: actionOptions[props.actions].map(({ variant, label }) =>
                    CardButton(
                      {
                        ...context,
                        variant,
                        disabled,
                        onClick: props.action(`${label}: ${feature.title}`),
                        children: [label],
                      },
                      h,
                    ),
                  ),
                },
                h,
              ),
            ]),
      ],
    }

    return props.media === 'image'
      ? Card(
          {
            ...card,
            image: () =>
              CardImage({ src: CARD_BANNER, orientation: props.group.orientation ?? 'card' }, h),
          },
          h,
        )
      : Card(card, h)
  })

export const promoCard = <Message>(
  props: Presentation & {
    readonly dismiss: Message
    readonly action: (label: string) => Message
  },
  h: HtmlBuilder<Message>,
): Html =>
  Card(
    {
      ...props,
      dismissible: true,
      onDismiss: props.dismiss,
      className: 'border border-border/60 overflow-hidden rounded-xl',
      image: () => CardImage({ src: CARD_BANNER }, h),
      children: (context) => [
        CardHeader(
          {
            ...context,
            children: [CardTitle({ ...context, children: ['Meet the new Card component'] }, h)],
          },
          h,
        ),
        CardContent(
          {
            ...context,
            className: 'flex flex-col gap-3',
            children: [
              CardFeature(
                {
                  ...context,
                  icon: defaultIcons.paintbrush,
                  title: 'Always pixel-perfect',
                  description:
                    'Renders your design exactly — token-driven and crisp in light and dark, at any radius',
                },
                h,
              ),
              CardFeature(
                {
                  ...context,
                  icon: defaultIcons['square-library'],
                  title: 'Stacked, inline, or grid',
                  description:
                    'One compositional API — borderless by default, with separated tiles or a shared frame',
                },
                h,
              ),
            ],
          },
          h,
        ),
        CardFooter(
          {
            ...context,
            children: [
              CardButton(
                {
                  ...context,
                  variant: 'primary',
                  onClick: props.action('Get started: promo'),
                  children: ['Get started'],
                },
                h,
              ),
              CardButton(
                {
                  ...context,
                  onClick: props.action('Learn more: promo'),
                  children: ['Learn more'],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
