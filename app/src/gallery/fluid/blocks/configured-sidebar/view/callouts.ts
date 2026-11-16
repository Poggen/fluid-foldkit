import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardMedia,
  CardImage,
} from '@foldkit-visuals/fluid/card'
import type { CardGroupContext } from '@foldkit-visuals/fluid/card'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { childAttributes } from 'foldkit/html'
import { spring, surfaceClasses, surfaceHoverClasses } from '@foldkit-visuals/fluid/tokens'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import type { PresentationContext } from '@foldkit-visuals/fluid/presentation'
import type { Html } from 'foldkit/html'
import { callouts, type Configuration } from '../../../../../playground/configs/sidebar'
import { target, highlight } from '../../../../../motion'
import type { ConfiguredSidebarBlock, ConfiguredSidebarModel } from '../block'
import type { ConfiguredSidebarViewBuilder } from '../composition'
import { SidebarCallouts, SidebarCalloutPresence } from '../bindings'
import { cardThumb } from '../../../card-art'
import { MeasureSidebarCallout } from '../callout-measure'

export type SidebarCalloutEvents = Pick<
  typeof ConfiguredSidebarBlock.Message,
  'DismissedSidebarCallout' | 'UpdatedSidebarAction' | 'HoveredSidebarCallouts'
>

export const renderSidebarCallouts = (
  events: SidebarCalloutEvents,
  calloutGroup: ConfiguredSidebarModel['sidebarCallouts'],
  presences: ConfiguredSidebarModel['sidebarCalloutPresence'],
  dismissed: ReadonlyArray<string>,
  hovered: boolean,
  measuredHeight: number,
  configuration: Configuration,
  context: PresentationContext,
  h: ConfiguredSidebarViewBuilder,
): ReadonlyArray<Html> => {
  if (configuration.footerCallout === 'none') return []
  const shown = (configuration.footerCalloutStacked ? callouts : callouts.slice(0, 1)).filter(
    (card) => presences.find((item) => item.id === card.id)?.model.phase !== 'Closed',
  )
  const live = shown.filter((card) => !dismissed.includes(card.id))
  const fan = configuration.footerCallout === 'inline' && hovered
  const height = measuredHeight
  const { shape, surface } = resolvePresentation({ context })
  const level = Math.min(surface + 1, 8)
  const renderCard = (card: (typeof callouts)[number], index: number, group: CardGroupContext) =>
    Card(
      {
        context,
        attributes: live[0]?.id === card.id ? [h.OnMount(MeasureSidebarCallout())] : [],
        group,
        index,
        disabled: dismissed.includes(card.id),
        dismissible: !dismissed.includes(card.id) && (live[0]?.id === card.id || fan),
        onDismiss: events.DismissedSidebarCallout({ id: card.id }),
        onClick: events.UpdatedSidebarAction({ action: card.title }),
        className: `${shape.container} overflow-hidden transition-[background-color,box-shadow] duration-80 ${surfaceClasses(level, 2)} ${surfaceHoverClasses(level + 1, 3)} shadow-[var(--shadow-2-inset)] hover:shadow-[var(--shadow-3-inset)] min-h-0 ${configuration.footerCallout === 'inline' ? 'pl-2.5' : ''}`,
        ...(configuration.footerCallout === 'banner'
          ? {
              image: () =>
                CardImage(
                  { src: cardThumb('#6B97FF'), alt: '', className: 'aspect-[2/1] max-h-28' },
                  h,
                ),
            }
          : {}),
        children: (cardContext) => [
          ...(configuration.footerCallout === 'inline'
            ? [CardMedia({ ...cardContext, icon: defaultIcons[card.icon], size: 18 }, h)]
            : []),
          CardHeader(
            {
              ...cardContext,
              className: configuration.footerCallout === 'banner' ? 'gap-0 pt-3' : 'gap-[2px] py-3',
              children: [
                CardTitle({ ...cardContext, className: 'truncate', children: [card.title] }, h),
                CardDescription(
                  {
                    ...cardContext,
                    className:
                      'truncate text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]',
                    children: [card.description],
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
  return [
    h.div(
      [
        h.OnMouseEnter(events.HoveredSidebarCallouts({ hovered: true })),
        h.OnMouseLeave(events.HoveredSidebarCallouts({ hovered: false })),
      ],
      [
        h.block(
          SidebarCallouts.embedView({
            slotId: 'sidebar-callouts',
            model: calloutGroup,
            viewInputs: {
              context,
              count: shown.length,
              separated: true,
              orientation: configuration.footerCallout === 'inline' ? 'inline' : 'card',
              columns: 1,
              animateHighlight: highlight,
              className: 'relative',
              children: (group) => [
                h.div(
                  [
                    h.Class('relative'),
                    h.Style({
                      height: `${live.length === 0 ? 0 : fan ? live.length * (height + 4) - 4 : height + (live.length - 1) * 12}px`,
                    }),
                  ],
                  shown.map((card, index) => {
                    const presence = presences.find((item) => item.id === card.id)?.model
                    if (presence === undefined)
                      throw new Error(`Missing sidebar callout ${card.id}`)
                    const position = Math.max(
                      0,
                      live.findIndex((item) => item.id === card.id),
                    )
                    return h.block(
                      SidebarCalloutPresence.embedView({
                        key: card.id,
                        slotId: `callout-${card.id}`,
                        model: presence,
                        viewInputs: {
                          className: 'absolute inset-x-0 bottom-0',
                          attributes: childAttributes([
                            h.Style({
                              transformOrigin: 'bottom center',
                              zIndex: String(100 - position),
                            }),
                          ]),
                          animate: (node, present) =>
                            target.node(node, {
                              initial: false,
                              animate: {
                                y: fan ? -position * (height + 4) : -Math.min(position, 2) * 12,
                                scale: fan ? 1 : 1 - Math.min(position, 2) * 0.05,
                                opacity: 1,
                                x: 0,
                              },
                              exit: { opacity: 0, scale: 0.94, x: 40 },
                              present,
                              transition: spring.moderate,
                            }),
                          content: () => renderCard(card, index, group),
                        },
                      }),
                    )
                  }),
                ),
              ],
            },
          }),
        ),
      ],
    ),
  ]
}
