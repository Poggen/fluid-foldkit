import {
  BannerTitle,
  BannerDescription,
  BannerActions,
  BannerAction,
} from '@foldkit-visuals/fluid/banner'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { createKeyedLazy } from 'foldkit/html'
import { bannerCopy, type Configuration } from '../../playground/configs/banner'
import type { ResolvedSettings } from '../../settings'
import type { FluidGalleryBlock, FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Banner, bannerMotion } from './core-bindings'

type Events = Pick<
  typeof FluidGalleryBlock.Message,
  'DismissedBanner' | 'Refreshed' | 'RequestedCopyBanner'
>
const render = (
  events: Events,
  banner: FluidGalleryModel['banner'],
  config: Configuration,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = createPresentationContext({
    shape,
    size,
    hoverMode: hover,
    hasShapeProvider: true,
    hasSizeProvider: true,
  })
  const copy = bannerCopy[config.status]
  const lineWidths = [
    'w-[90%]',
    'w-[82%]',
    'w-[74%]',
    'w-[66%]',
    'w-[58%]',
    'w-[50%]',
    'w-[42%]',
    'w-[34%]',
    'w-[26%]',
    'w-[18%]',
    'w-[10%]',
    'w-[2%]',
  ]
  const lines = (count: number) =>
    h.div(
      [h.Class('flex flex-col gap-3'), h.AriaHidden(true)],
      Array.from({ length: count }, (_, index) =>
        h.div([h.Class(['h-2.5 rounded-full bg-muted', lineWidths[index]].join(' '))]),
      ),
    )
  const content = h.block(
    Banner.embedView({
      slotId: 'banner',
      model: banner,
      viewInputs: {
        context,
        variant: config.variant,
        status: config.status,
        contrast: config.contrast,
        dismissible: config.dismissible,
        animate: bannerMotion.node,
        children: () => [
          BannerTitle({ context, children: [config.label || copy[0]] }, h),
          config.description ? BannerDescription({ context, children: [copy[1]] }, h) : null,
          config.primary || config.secondary || config.ghost
            ? BannerActions(
                {
                  context,
                  children: [
                    config.primary
                      ? BannerAction(
                          {
                            context,
                            variant: 'primary',
                            children: [copy[2]],
                            attributes: [h.OnClick(events.RequestedCopyBanner())],
                          },
                          h,
                        )
                      : null,
                    config.secondary
                      ? BannerAction(
                          {
                            context,
                            children: [copy[3]],
                            attributes: [h.OnClick(events.Refreshed())],
                          },
                          h,
                        )
                      : null,
                    config.ghost
                      ? BannerAction(
                          {
                            context,
                            variant: 'ghost',
                            children: [copy[4]],
                            attributes: [h.OnClick(events.DismissedBanner())],
                          },
                          h,
                        )
                      : null,
                  ],
                },
                h,
              )
            : null,
        ],
      },
    }),
  )
  return h.div(
    [
      h.Class(
        config.variant === 'fixed'
          ? 'flex w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background h-[280px] max-w-[560px]'
          : 'w-full max-w-[560px]',
      ),
    ],
    [
      h.div([h.Class('shrink-0')], [lines(1)]),
      content,
      config.variant === 'fixed'
        ? h.div([h.Class('min-h-0 flex-1 overflow-y-auto')], [lines(12)])
        : lines(2),
    ],
  )
}
export const makeBannerPlaygroundView = (events: Events) => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    config: Configuration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    lazy('banner-playground', render, [
      events,
      model.banner,
      config,
      config.appearance.shape ?? settings.shape,
      config.appearance.size ?? settings.size,
      config.appearance.hover ?? settings.hover,
      h,
    ])
}
