import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardButton,
  CardMedia,
  CardImage,
} from '@foldkit-visuals/fluid/card'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { createKeyedLazy } from 'foldkit/html'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import {
  columnsOf,
  separatedOf,
  cardItems,
  tintCardBanner,
  type Configuration,
} from '../../playground/configs/card'
import { accentColor, type ResolvedSettings } from '../../settings'
import { highlight } from '../../motion'
import type { FluidGalleryBlock, FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { CardGroup } from './core-bindings'
import { cardThumb } from './card-art'

type Events = Pick<typeof FluidGalleryBlock.Message, 'DismissedCard' | 'Refreshed' | 'SelectedCard'>
const render = (
  events: Events,
  group: FluidGalleryModel['cardGroup'],
  selectedIndex: number,
  dismissed: ReadonlyArray<number>,
  config: Configuration,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  accent: string,
  h: FluidViewBuilder,
) => {
  const context = createPresentationContext({
    shape,
    size,
    hoverMode: hover,
    surface: 1,
    hasShapeProvider: true,
    hasSizeProvider: true,
  })
  const items = cardItems
    .slice(0, columnsOf(config) === 3 ? 6 : 4)
    .map((item, index) => ({ ...item, index }))
    .filter((item) => !dismissed.includes(item.index))
  const selectedItem = items.findIndex((item) => item.index === selectedIndex)
  const selected = selectedItem < 0 ? Math.min(selectedIndex, items.length - 1) : selectedItem
  return h.block(
    CardGroup.embedView({
      slotId: 'card-group',
      model: group,
      viewInputs: {
        context,
        count: items.length,
        columns: columnsOf(config),
        orientation: config.cardOrientation,
        border: config.border,
        separated: separatedOf(config),
        selectedIndex: config.selected ? selected : -1,
        animateHighlight: highlight,
        children: (groupContext) =>
          items.map((item, index) =>
            Card(
              {
                group: groupContext,
                index,
                label: index === 0 ? config.label : item.title,
                disabled: config.disabled,
                selected: config.selected && index === selected,
                onClick: config.selected
                  ? events.SelectedCard({ index: item.index })
                  : events.Refreshed(),
                dismissible: config.dismissible,
                dismissOnHover: config.dismissOnHover,
                onDismiss: events.DismissedCard({ index: item.index }),
                ...(config.media === 'image'
                  ? {
                      image: (card) =>
                        CardImage(
                          { ...card, src: tintCardBanner(accent), alt: 'Abstract gradient' },
                          h,
                        ),
                    }
                  : {}),
                children: (card) => {
                  const media =
                    config.media === 'icon'
                      ? CardMedia(
                          {
                            context,
                            orientation: config.cardOrientation,
                            icon: defaultIcons[item.icon],
                          },
                          h,
                        )
                      : config.media === 'logo'
                        ? CardMedia(
                            {
                              context,
                              orientation: config.cardOrientation,
                              logo: cardThumb(accent),
                              logoAlt: 'Fluid',
                              size: 32,
                            },
                            h,
                          )
                        : null
                  const buttons = [
                    config.primaryBtn
                      ? CardButton(
                          {
                            context,
                            variant: 'primary',
                            children: ['Get started'],
                            onClick: events.Refreshed(),
                          },
                          h,
                        )
                      : null,
                    config.secondaryBtn
                      ? CardButton(
                          {
                            context,
                            variant: 'secondary',
                            children: ['Learn more'],
                            onClick: events.Refreshed(),
                          },
                          h,
                        )
                      : null,
                    config.ghostBtn
                      ? CardButton(
                          {
                            context,
                            variant: 'ghost',
                            children: ['Connect'],
                            onClick: events.Refreshed(),
                          },
                          h,
                        )
                      : null,
                  ].filter((button) => button !== null)
                  if (config.cardOrientation === 'inline' && config.media !== 'image')
                    buttons.reverse()
                  return [
                    config.cardOrientation === 'inline' ? media : null,
                    CardHeader(
                      {
                        ...card,
                        children: [
                          config.cardOrientation === 'card' ? media : null,
                          CardTitle(
                            { ...card, children: [index === 0 ? config.label : item.title] },
                            h,
                          ),
                          config.description
                            ? CardDescription({ ...card, children: [item.description] }, h)
                            : null,
                        ],
                      },
                      h,
                    ),
                    buttons.length > 0 ? CardFooter({ ...card, children: buttons }, h) : null,
                  ]
                },
              },
              h,
            ),
          ),
      },
    }),
  )
}
export const makeCardPlaygroundView = (events: Events) => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    config: Configuration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    lazy('card-playground', render, [
      events,
      model.cardGroup,
      model.cardSelectedIndex,
      model.cardDismissedIndices,
      config,
      config.appearance.shape ?? settings.shape,
      config.appearance.size ?? settings.size,
      config.appearance.hover ?? settings.hover,
      accentColor(settings.accent, settings.theme),
      h,
    ])
}
