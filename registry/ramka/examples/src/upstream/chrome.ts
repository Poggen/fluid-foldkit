/* @license Adapted from arturbien/ramka at 9eaaab4. MIT. Copyright (c) 2026 Artur Bień. */
import type { ViewInputs } from '@foldkit-visuals/ramka/lightbox'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'

export const lightboxChromeButton =
  'pointer-events-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' +
  'border border-black/20 bg-white/55 text-neutral-900 ' +
  'shadow-[0_0.5px_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08),inset_0_0.5px_0_rgba(255,255,255,0.65)] ' +
  'backdrop-blur-2xl backdrop-saturate-150 ' +
  'transition-[background-color,box-shadow,transform,opacity,color] duration-150 ease-out ' +
  'hover:[background-image:linear-gradient(rgba(0,0,0,0.05),rgba(0,0,0,0.05))] ' +
  'active:scale-[0.96] active:[background-image:linear-gradient(rgba(0,0,0,0.09),rgba(0,0,0,0.09))] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ' +
  'disabled:pointer-events-none disabled:opacity-30 ' +
  'dark:border-white/25 dark:bg-neutral-900/45 dark:text-white ' +
  'dark:shadow-[0_0_0_0.5px_#000,0_0.5px_1px_rgba(0,0,0,0.45),0_1px_2px_rgba(0,0,0,0.35),inset_0_0.5px_0_rgba(255,255,255,0.14)] ' +
  'dark:hover:[background-image:linear-gradient(rgba(255,255,255,0.08),rgba(255,255,255,0.08))] ' +
  'dark:active:[background-image:linear-gradient(rgba(255,255,255,0.12),rgba(255,255,255,0.12))] ' +
  'dark:focus-visible:ring-white/40'

export const lightboxChromeButtonMd = `hidden md:inline-flex ${lightboxChromeButton.replace('inline-flex ', '')}`

export const lightboxChromeButtonGroup =
  'pointer-events-auto hidden h-9 items-stretch overflow-hidden rounded-full md:inline-flex ' +
  'border border-black/20 bg-white/55 ' +
  'shadow-[0_0.5px_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08),inset_0_0.5px_0_rgba(255,255,255,0.65)] ' +
  'backdrop-blur-2xl backdrop-saturate-150 ' +
  'dark:border-white/25 dark:bg-neutral-900/45 ' +
  'dark:shadow-[0_0_0_0.5px_#000,0_0.5px_1px_rgba(0,0,0,0.45),0_1px_2px_rgba(0,0,0,0.35),inset_0_0.5px_0_rgba(255,255,255,0.14)]'

export const lightboxChromeButtonSegment =
  'relative inline-flex w-9 shrink-0 items-center justify-center text-neutral-900 ' +
  'transition-[background-color,box-shadow,opacity,color] duration-150 ease-out ' +
  'hover:[background-image:linear-gradient(rgba(0,0,0,0.05),rgba(0,0,0,0.05))] ' +
  'active:[background-image:linear-gradient(rgba(0,0,0,0.09),rgba(0,0,0,0.09))] ' +
  'focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_rgba(0,0,0,0.25)] ' +
  'disabled:pointer-events-none disabled:opacity-30 ' +
  'dark:text-white ' +
  'dark:hover:[background-image:linear-gradient(rgba(255,255,255,0.08),rgba(255,255,255,0.08))] ' +
  'dark:active:[background-image:linear-gradient(rgba(255,255,255,0.12),rgba(255,255,255,0.12))] ' +
  'dark:focus-visible:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.4)]'

export const lightboxChromeSegmentDivider =
  "before:absolute before:inset-y-[22%] before:start-0 before:w-px before:bg-black/15 before:content-[''] dark:before:bg-white/20"

export const triggerFocusClass =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500'

export interface GalleryItem {
  readonly id: string
  readonly src: string
  readonly thumb: string
  readonly alt: string
  readonly width: number
  readonly height: number
  readonly caption?: string
}

type Render = NonNullable<ViewInputs['render']>
type Parts = Parameters<Render>[0]
type Context = Parameters<Render>[1]
interface GalleryOptions {
  readonly label: string
  readonly dir?: 'ltr' | 'rtl'
  readonly thumbnails?: boolean | 'always'
  readonly zoom?: boolean
  readonly renderMedia?: (item: GalleryItem, index: number) => Html
  readonly mode?: 'feed' | 'photos' | 'default'
  readonly more?: Html
  readonly backdrop?: 'solid' | 'scrim'
  readonly layout?: 'snug' | 'bleed'
  readonly layoutControl?: Html
  readonly preload?: number
  readonly ssrSlideShift?: boolean
}

const glyphs = {
  close: ['M18 6 6 18', 'm6 6 12 12'],
  previous: ['m15 18-6-6 6-6'],
  next: ['m9 18 6-6-6-6'],
  zoomOut: ['M21 21l-4.35-4.35', 'M7 11h6'],
  zoomIn: ['M21 21l-4.35-4.35', 'M7 11h6', 'M10 8v6'],
}

function icon<Message, Mounts>(
  name: keyof typeof glyphs,
  size: string,
  h: HtmlBuilder<Message, Mounts>,
) {
  const magnifier = name === 'zoomIn' || name === 'zoomOut'
  return h.svg(
    [
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('2.25'),
      h.StrokeLinecap('round'),
      h.StrokeLinejoin('round'),
      h.AriaHidden(true),
      h.Class(size),
    ],
    [
      magnifier ? h.circle([h.Cx('10'), h.Cy('10'), h.R('7')]) : null,
      ...glyphs[name].map((d) => h.path([h.D(d)])),
    ],
  )
}

export function gallery<Message, Mounts>(
  parts: Parts,
  context: Context,
  items: readonly GalleryItem[],
  options: GalleryOptions,
  h: HtmlBuilder<Message, Mounts>,
) {
  if (context.mounted === false && !context.keepMounted) return h.empty

  const feed = options.mode === 'feed'
  const snug = options.layout === 'snug'
  const strip = options.thumbnails !== false && !feed && items.length > 1
  const docked = strip && (options.dir ?? context.dir) !== 'rtl'
  const always = options.thumbnails === 'always'
  const stripVisibility = always ? '' : 'hidden md:block'
  const solid =
    (options.backdrop ?? (feed || options.mode === 'photos' ? 'solid' : 'scrim')) === 'solid'
  const button = (value: string) => childAttributes([h.Class(value)])
  const thumbnailStrip = (classes: string) =>
    parts.ThumbnailStrip({
      attributes: button(classes),
      children: [
        parts.ThumbnailStripTrack({
          label: 'Photo thumbnails',
          children: items.map((item, index) =>
            parts.Thumbnail({
              index,
              label: item.alt,
              attributes: childAttributes([h.Key(item.id)]),
              children: [
                h.img([h.Src(item.thumb), h.Alt(item.alt), h.Loading('lazy'), h.Draggable(false)]),
              ],
            }),
          ),
        }),
        h.span([h.Class('lightbox-demo-thumbnail-strip-indicator'), h.AriaHidden(true)]),
      ],
    })
  const toolbar = h.div(
    [
      h.Class(
        'lightbox-demo-chrome-top lightbox-demo-chrome-hide absolute end-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-30 flex gap-2',
      ),
    ],
    [
      options.layoutControl ?? null,
      options.zoom === false
        ? null
        : h.div(
            [h.Class(lightboxChromeButtonGroup)],
            [
              parts.ZoomOut({
                label: 'Zoom out',
                attributes: button(lightboxChromeButtonSegment),
                children: [icon('zoomOut', 'h-4 w-4', h)],
              }),
              parts.ZoomIn({
                label: 'Zoom in',
                attributes: button(
                  `${lightboxChromeButtonSegment} ${lightboxChromeSegmentDivider}`,
                ),
                children: [icon('zoomIn', 'h-4 w-4', h)],
              }),
            ],
          ),
      parts.Close({
        label: 'Close',
        attributes: button(lightboxChromeButton),
        children: [icon('close', 'h-[18px] w-[18px]', h)],
      }),
    ],
  )
  const slides = parts.Slides({
    label: feed ? 'Full-size photos' : 'Full-size images',
    roleDescription: 'carousel',
    ssrSlideShift: (options.ssrSlideShift ?? context.ssr ?? false) && !snug,
    attributes: childAttributes([
      h.Key(snug ? 'snug' : 'bleed'),
      h.Class(
        snug
          ? 'lightbox-demo-slides lightbox-demo-slides-snug flex-1 [&::-webkit-scrollbar]:hidden'
          : 'lightbox-demo-slides flex-1 gap-5 [--lightbox-ssr-slide-gap:1.25rem] [&::-webkit-scrollbar]:hidden md:gap-0 md:[--lightbox-ssr-slide-gap:0px]',
      ),
      ...(snug && items.length
        ? [
            h.Style({
              '--lightbox-snug-ratio-start': String(
                (items[0]?.width ?? 1) / (items[0]?.height ?? 1),
              ),
              '--lightbox-snug-ratio-end': String(
                (items.at(-1)?.width ?? 1) / (items.at(-1)?.height ?? 1),
              ),
            }),
          ]
        : []),
    ]),
    children: [
      ...items.map((item, index) => {
        const distance = Math.abs(context.index - index)
        const visible =
          !(options.mode === 'photos' && context.parked) &&
          (context.loop ? Math.min(distance, items.length - distance) : distance) <=
            (options.preload ?? (feed ? 2 : 3))
        return parts.Slide({
          index,
          attributes: childAttributes([
            h.Key(item.id),
            h.Class(
              snug
                ? 'lightbox-demo-slide-snug lightbox-demo-slide-pad z-0 h-full'
                : 'lightbox-demo-slide-pad h-full',
            ),
            ...(snug
              ? [h.Style({ '--lightbox-snug-ratio': String(item.width / item.height) })]
              : []),
          ]),
          children: [
            visible
              ? parts.Item({
                  index,
                  ...(strip
                    ? {}
                    : { label: `${index + 1} of ${items.length}`, roleDescription: 'slide' }),
                  children: () => [
                    options.renderMedia?.(item, index) ??
                      parts.Zoom({
                        index,
                        children: [
                          parts.Media({
                            index,
                            width: item.width,
                            height: item.height,
                            attributes: button(
                              feed || options.mode === 'photos'
                                ? 'overflow-hidden rounded-none md:rounded-lg'
                                : 'overflow-hidden rounded-none after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] md:rounded-lg md:after:shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.1)] md:dark:after:shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)]',
                            ),
                            children: [
                              h.img([
                                h.Src(item.src),
                                h.Alt(item.alt),
                                h.Width(String(item.width)),
                                h.Height(String(item.height)),
                                h.Loading('eager'),
                                h.Draggable(false),
                                h.Class('select-none'),
                              ]),
                            ],
                          }),
                        ],
                      }),
                  ],
                })
              : h.empty,
          ],
        })
      }),
      docked
        ? h.div(
            [
              h.Class(
                `lightbox-demo-strip-dock lightbox-demo-chrome-hide lightbox-demo-zoom-hide ${stripVisibility}`,
              ),
            ],
            [thumbnailStrip('pointer-events-auto lightbox-demo-thumbnail-strip')],
          )
        : null,
    ],
  })
  const counter = (classes: string) =>
    parts.Counter({
      attributes: button(classes),
      format: ({ current, total }) => [`${current} of ${total}`],
    })
  const feedChrome = feed
    ? [
        h.div(
          [h.Class('lightbox-demo-chrome-hide absolute start-3 top-1/2 z-30 -translate-y-1/2')],
          [
            parts.Previous({
              label: 'Previous photo',
              attributes: button(lightboxChromeButtonMd),
              children: [icon('previous', 'h-5 w-5', h)],
            }),
          ],
        ),
        h.div(
          [h.Class('lightbox-demo-chrome-hide absolute end-3 top-1/2 z-30 -translate-y-1/2')],
          [
            parts.Next({
              label: 'Next photo',
              attributes: button(lightboxChromeButtonMd),
              children: [icon('next', 'h-5 w-5', h)],
            }),
          ],
        ),
      ]
    : []
  const bottom = feed
    ? h.div(
        [
          h.Class(
            'lightbox-demo-chrome-bottom lightbox-demo-chrome-hide pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 px-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]',
          ),
        ],
        [
          counter('text-[11px] leading-tight tabular-nums text-neutral-500 dark:text-neutral-400'),
          options.more ?? null,
        ],
      )
    : h.div(
        [
          h.Class(
            `lightbox-demo-chrome-bottom lightbox-demo-chrome-hide${strip ? '' : ' lightbox-demo-chrome-bottom-solo'} pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center px-3 ${
              docked
                ? always
                  ? 'pb-[calc(6.875rem+env(safe-area-inset-bottom,0px))]'
                  : 'pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(6.875rem+env(safe-area-inset-bottom,0px))]'
                : 'gap-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'
            }`,
          ),
        ],
        [
          h.div(
            [h.Class('flex max-w-full flex-col items-center text-center')],
            [
              parts.Caption({
                attributes: button(
                  'block max-w-full truncate text-[13px] font-medium leading-tight text-neutral-900 dark:text-neutral-50',
                ),
              }),
              items.length > 1
                ? counter(
                    `text-[11px] leading-tight tabular-nums text-neutral-500 dark:text-neutral-400 ${strip && always ? 'sr-only' : 'md:sr-only'}`,
                  )
                : null,
            ],
          ),
          strip && !docked
            ? thumbnailStrip(`pointer-events-auto lightbox-demo-thumbnail-strip ${stripVisibility}`)
            : null,
        ],
      )
  return parts.Portal({
    children: [
      parts.Content({
        label: options.label,
        attributes: button(
          `lightbox-demo-content fixed inset-0 flex flex-col overscroll-contain bg-transparent outline-none${snug ? ' lightbox-demo-content-snug' : ''}${strip ? '' : ' lightbox-demo-content-solo'}${strip && always ? ' lightbox-demo-content-strip-always' : ''}`,
        ),
        children: [
          parts.Backdrop({
            attributes: button(
              `lightbox-demo-backdrop ${solid ? 'bg-white dark:bg-black' : 'lightbox-demo-backdrop-light dark:bg-black/90'} fixed inset-0`,
            ),
          }),
          toolbar,
          parts.Stage({ children: [slides] }),
          ...feedChrome,
          bottom,
        ],
      }),
    ],
  })
}
