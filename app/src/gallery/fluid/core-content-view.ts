import type { CoreEvents } from './render-presentation'
import {
  BannerAction,
  BannerActions,
  BannerDescription,
  BannerTitle,
} from '@foldkit-visuals/fluid/banner'
import { Field, FieldDescription, FieldLabel } from '@foldkit-visuals/fluid/field'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@foldkit-visuals/fluid/table-parts'
import { highlight } from '../../motion'
import { Button } from '@foldkit-visuals/fluid/button'
import { Badge } from '@foldkit-visuals/fluid/badge'
import { Card, CardHeader, CardMedia, CardTitle } from '@foldkit-visuals/fluid/card'
import { cardThumb } from './card-art'
import { accentColor } from '../../settings'
import type { FluidViewBuilder } from './composition'
import { Banner, CardGroup, Search, Table, bannerMotion } from './core-bindings'
import { TABLE_COLUMNS, TABLE_ROWS, BUTTON_ITEMS, BADGE_ITEMS } from './demo-data'

import type { FluidGalleryInputs, FluidGalleryModel } from './block'

import { demoPresentation } from './render-presentation'

export const renderBanner = (
  banner: FluidGalleryModel['banner'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
  events: CoreEvents,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Banner.embedView({
      slotId: 'banner',
      model: banner,
      viewInputs: {
        context,
        status: 'info',
        dismissible: true,
        animate: bannerMotion.node,
        children: () => [
          BannerTitle({ context, children: ['The registry has new components'] }, h),
          BannerDescription(
            {
              context,
              children: ['Run the install command again to pull the latest versions.'],
            },
            h,
          ),
          BannerActions(
            {
              context,
              children: [
                BannerAction(
                  {
                    context,
                    variant: 'primary',
                    children: ['Copy command'],
                    attributes: [h.OnClick(events.copy())],
                  },
                  h,
                ),
                BannerAction(
                  {
                    context,
                    variant: 'ghost',
                    children: ['Later'],
                    attributes: [h.OnClick(events.dismiss())],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      },
    }),
  )
}

export const renderButton = (
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.div(
    [h.Class('flex flex-wrap items-center gap-2')],
    BUTTON_ITEMS.map(({ label, variant }) =>
      Button({ context, variant, buttonSize: 'sm', children: [label] }, h),
    ),
  )
}

export const renderBadge = (
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.div(
    [h.Class('flex flex-wrap items-center gap-2')],
    BADGE_ITEMS.map(({ label, color }) =>
      Badge({ context, variant: 'dot', color, children: [label] }, h),
    ),
  )
}

export const renderCard = (
  cardGroup: FluidGalleryModel['cardGroup'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  globalAccent: FluidGalleryInputs['settings']['accent'],
  globalTheme: FluidGalleryInputs['settings']['theme'],
  h: FluidViewBuilder,
  events: CoreEvents,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.div(
    [h.Class('w-full max-w-[520px]')],
    [
      h.block(
        CardGroup.embedView({
          slotId: 'card-group',
          model: cardGroup,
          viewInputs: {
            context,
            count: 4,
            separated: false,
            columns: 1,
            orientation: 'inline',
            animateHighlight: highlight,
            children: (group) => {
              const thumb = cardThumb(accentColor(globalAccent, globalTheme))
              const press = events.press()
              return ['Fluid motion', 'Accessible', 'Yours to theme', 'Fluid hover'].map(
                (title, index) =>
                  Card(
                    {
                      context,
                      group,
                      index,
                      label: title,
                      selected: false,
                      disabled: false,
                      onClick: press,
                      className: 'min-h-[52px] py-1.5',
                      size: 'compact',
                      children: (card) => [
                        CardMedia(
                          {
                            ...card,
                            logo: thumb,
                            size: 28,
                          },
                          h,
                        ),
                        CardHeader(
                          { ...card, children: [CardTitle({ ...card, children: [title] }, h)] },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
              )
            },
          },
        }),
      ),
    ],
  )
}

export const renderField = (
  search: FluidGalleryModel['search'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return Field(
    {
      context,
      children: [
        FieldLabel({ htmlFor: 'preview-field-input', children: ['Email address'] }, h),
        h.block(
          Search.embedView({
            slotId: 'field-input',
            model: search,
            viewInputs: {
              context,
              type: 'email',
              placeholder: 'you@studio.design',
            },
          }),
        ),
        FieldDescription({ children: ['A quiet place for your best work.'] }, h),
      ],
    },
    h,
  )
}

export const renderTable = (
  table: FluidGalleryModel['table'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Table.embedView({
      slotId: 'table',
      model: table,
      viewInputs: {
        context,
        animateHighlight: highlight,
        content: (table) => [
          TableHeader(
            {
              children: [
                TableRow(
                  {
                    children: TABLE_COLUMNS.map((text) => TableHead({ children: [text] }, h)),
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          TableBody(
            {
              children: TABLE_ROWS.slice(0, 4).map((row, index) =>
                TableRow(
                  {
                    index,
                    context: table,
                    children: row.map((text) => TableCell({ children: [text] }, h)),
                  },
                  h,
                ),
              ),
            },
            h,
          ),
        ],
      },
    }),
  )
}
