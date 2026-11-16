import { CARD_THUMB } from '../../gallery/fluid/card-art'
import { columnsOf, separatedOf, cardItems, cardBanner, type Configuration } from './card'
export const cardCode = (
  c: Configuration,
) => `import { CardGroupBlock, Card, CardHeader, CardTitle, CardDescription, CardFooter, CardButton, CardMedia, CardImage } from '@foldkit-visuals/fluid/card'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'

const Cards = Page.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'cards', init: { contextToArgs: () => [{ id: 'cards', fluidHover: ${c.fluidHover} }] },
})
const items = ${JSON.stringify(
  cardItems.map((item, index) => (index === 0 ? { ...item, title: c.label } : item)),
  null,
  2,
)} as const
const visibleItems = items.slice(0, ${columnsOf(c) === 3 ? 6 : 4})

Cards.embedView({ slotId: 'cards', model: model.cards, viewInputs: {
  context, orientation: ${JSON.stringify(c.cardOrientation)}, columns: ${columnsOf(c)}, border: ${JSON.stringify(c.border)}, separated: ${separatedOf(c)}, count: visibleItems.length, animateHighlight,
  selectedIndex: ${c.selected ? 'model.selectedIndex' : '-1'},
  children: group => visibleItems.map((item, index) => Card({ group, index, label: item.title,
    selected: ${c.selected ? 'index === model.selectedIndex' : 'false'}, disabled: ${c.disabled},
    onClick: Message.SelectedCard({ index }), dismissible: ${c.dismissible}, dismissOnHover: ${c.dismissOnHover}, onDismiss: Message.DismissedCard({ index }),
    ${c.media === 'image' ? `image: () => CardImage({ src: ${JSON.stringify(cardBanner)}, alt: 'Abstract gradient' }, h),` : ''}
    children: card => [
      ${c.media === 'icon' || c.media === 'logo' ? `CardMedia({ context, orientation: '${c.cardOrientation}', ${c.media === 'icon' ? 'icon: defaultIcons[item.icon]' : `logo: ${JSON.stringify(CARD_THUMB)}, logoAlt: 'Fluid', size: 32`} }, h),` : ''}
      CardHeader({ ...card, children: [CardTitle({ ...card, children: [item.title] }, h), ${c.description ? 'CardDescription({ ...card, children: [item.description] }, h)' : ''}] }, h),
      ${
        c.primaryBtn || c.secondaryBtn || c.ghostBtn
          ? `CardFooter({ ...card, children: [${(c.cardOrientation === 'inline' &&
            c.media !== 'image'
              ? ['ghost', 'secondary', 'primary']
              : ['primary', 'secondary', 'ghost']
            )
              .filter((v) =>
                v === 'primary' ? c.primaryBtn : v === 'secondary' ? c.secondaryBtn : c.ghostBtn,
              )
              .map(
                (v) =>
                  `CardButton({ context, variant: '${v}', children: ['${v === 'primary' ? 'Get started' : v === 'secondary' ? 'Learn more' : 'Connect'}'], onClick: Message.PressedAction({ index }) }, h)`,
              )
              .join(', ')}] }, h),`
          : ''
      }
    ],
  }, h)),
} })`
