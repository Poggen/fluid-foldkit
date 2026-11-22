/* @license Ramka examples port. MIT. Copyright (c) 2026 Artur Bień. */
import { Effect, Layer, Match, Queue, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes, createKeyedLazy } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { Environment, LightboxBlock, layer as LightboxLayer } from '@foldkit-visuals/ramka/lightbox'
import { gallery } from './chrome'
import { feedMedia, photoMedia } from './photo-media'

const Example = Schema.Literals(['photos-app', 'photos-app-rtl', 'infinite-scroll'])
type Example = typeof Example.Type
const key = Symbol('PhotoExamples')
export const PhotoExamplesBlock = Block.make('PhotoExamples', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    lightboxes: Schema.Array(LightboxBlock.Instance),
    columns: Schema.Number,
    rtlColumns: Schema.Number,
    loading: Schema.Boolean,
  }),
  Message: defineMessageUnion({
    ChangedDensity: { rtl: Schema.Boolean, columns: Schema.Number },
    ReachedFeedEnd: { count: Schema.Natural },
    ReceivedFeedPage: { count: Schema.Natural },
  }),
  effects: Block.makeEffectsContract<never, Environment>(),
  view: { kind: 'Element' },
})
const Root = PhotoExamplesBlock
const FetchPhotoPage = Root.makeCommand('FetchPhotoPage', {
  args: { count: Schema.Natural },
  messages: [Root.Message.ReceivedFeedPage],
  *handler() {
    return ({ count }) =>
      Effect.sleep('800 millis').pipe(
        Effect.as(Root.Message.ReceivedFeedPage({ count: count + 12 })),
      )
  },
})
const requestPage = Root.makeStep((model) => {
  if (model.loading) return { model }
  const feed = model.lightboxes.find(({ key }) => key === 'infinite-scroll')
  if (feed === undefined) return { model }
  return {
    model: { ...model, loading: true },
    commands: [FetchPhotoPage({ count: feed.model.items.length })],
  }
})
const Lightboxes = Root.makeKeyedArrayBinding(LightboxBlock, {
  field: 'lightboxes',
  placement: 'photos-lightboxes',
  key: 'key',
  childField: 'model',
}).withOutMessagePolicy({
  fold: (key, out) =>
    Root.makeStep((model) => {
      if (key !== 'infinite-scroll') return { model }
      const index = Match.value(out).pipe(
        Match.tagsExhaustive({
          Changed: ({ index }) => index,
          ValueChanged: ({ index }) => index,
          OpenChanged: () => undefined,
          OpenChangeCompleted: () => undefined,
          ZoomChanged: () => undefined,
          Failed: () => undefined,
        }),
      )
      const count =
        model.lightboxes.find(({ key }) => key === 'infinite-scroll')?.model.items.length ?? 0
      return index !== undefined && index >= count - 4 ? requestPage : { model }
    }),
})
const ObserveFeed = Root.makeMountStream('ObservePhotoFeed', {
  args: { count: Schema.Natural },
  messages: [Root.Message.ReachedFeedEnd],
  *handler() {
    return ({ element, count, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state !== 'Live'
            ? Stream.never
            : Stream.callback<typeof Root.Message.ReachedFeedEnd.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const observer = new IntersectionObserver(
                      (entries) => {
                        if (entries.some((entry) => entry.isIntersecting)) {
                          observer.disconnect()
                          Queue.offerUnsafe(queue, Root.Message.ReachedFeedEnd({ count }))
                        }
                      },
                      { rootMargin: '800px 0px' },
                    )
                    observer.observe(element)
                    return observer
                  }),
                  (observer) => Effect.sync(() => observer.disconnect()),
                ),
              ),
        ),
      )
  },
})
const Composition = Root.makeComposition({ bindings: [Lightboxes], mounts: [ObserveFeed] })
type PhotosViewBuilder = Block.ViewBuilderFor<typeof Composition>
const toolbarButton =
  'inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-600 transition hover:bg-black/5 disabled:pointer-events-none disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-white/10'

const renderExample = (
  example: Example,
  lightbox: typeof LightboxBlock.Model.Type,
  columns: number,
  loading: boolean,
  h: PhotosViewBuilder,
) => {
  const feed = example === 'infinite-scroll'
  const rtl = example === 'photos-app-rtl'
  const libraryId = rtl ? 'ramka-photos-rtl' : 'ramka-photos-ltr'
  const items = feed ? feedMedia(lightbox.items.length) : photoMedia
  const name = feed ? 'Infinite scroll' : rtl ? 'Photos app (RTL)' : 'Photos app'
  return h.section(
    [h.Id(`ramka-${example}`), h.AriaLabel(name)],
    [
      h.h2([h.Class('mb-3 text-xl font-medium')], [name]),
      h.div(
        [
          h.Dir(rtl ? 'rtl' : 'ltr'),
          h.Class(
            'max-h-[calc(100svh-12rem)] overflow-y-auto overscroll-y-contain select-none bg-background',
          ),
        ],
        [
          h.div(
            [
              h.Class(
                'pointer-events-auto sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-black/[0.06] bg-background px-4 py-2.5 dark:border-white/[0.08]',
              ),
              ...(feed ? [] : [h.Style({ viewTransitionName: `${libraryId}-toolbar` })]),
            ],
            [
              h.div(
                [h.Class('flex flex-col')],
                [
                  h.span(
                    [
                      h.Class(
                        'text-[19px] font-bold leading-6 tracking-tight text-neutral-900 dark:text-neutral-50',
                      ),
                    ],
                    [feed ? 'Feed' : 'Library'],
                  ),
                  h.span(
                    [
                      h.Class(
                        'text-[11px] font-medium leading-4 text-neutral-500 dark:text-neutral-400',
                      ),
                    ],
                    [
                      feed
                        ? `${items.length} photos loaded · scrolls forever`
                        : '48 Photos · July 2024',
                    ],
                  ),
                ],
              ),
              feed
                ? null
                : h.div(
                    [h.Class('flex flex-1 items-center justify-end')],
                    [
                      h.div(
                        [
                          h.Class(
                            'flex items-center gap-0.5 rounded-full bg-black/[0.05] p-0.5 dark:bg-white/[0.09]',
                          ),
                        ],
                        [
                          h.button(
                            [
                              h.Type('button'),
                              h.AriaLabel('Smaller photos'),
                              h.Disabled(columns >= 10),
                              h.Class(toolbarButton),
                              h.OnClick(Root.Message.ChangedDensity({ rtl, columns: columns + 1 })),
                            ],
                            [
                              h.svg(
                                [
                                  h.AriaHidden(true),
                                  h.Class('h-4 w-4'),
                                  h.ViewBox('0 0 24 24'),
                                  h.Fill('none'),
                                  h.Stroke('currentColor'),
                                  h.StrokeWidth('2'),
                                  h.StrokeLinecap('round'),
                                ],
                                [h.path([h.D('M5 12h14')])],
                              ),
                            ],
                          ),
                          h.button(
                            [
                              h.Type('button'),
                              h.AriaLabel('Larger photos'),
                              h.Disabled(columns <= 2),
                              h.Class(toolbarButton),
                              h.OnClick(Root.Message.ChangedDensity({ rtl, columns: columns - 1 })),
                            ],
                            [
                              h.svg(
                                [
                                  h.AriaHidden(true),
                                  h.Class('h-4 w-4'),
                                  h.ViewBox('0 0 24 24'),
                                  h.Fill('none'),
                                  h.Stroke('currentColor'),
                                  h.StrokeWidth('2'),
                                  h.StrokeLinecap('round'),
                                ],
                                [h.path([h.D('M5 12h14M12 5v14')])],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
            ],
          ),
          h.block(
            Lightboxes.embedView({
              key: example,
              slotId: example,
              model: lightbox,
              viewInputs: {
                label: feed ? 'Feed photos' : 'Library photos',
                carouselLabel: 'Full-size photos',
                item: (index) => {
                  const item = items[index]
                  return item === undefined
                    ? h.empty
                    : h.img([h.Src(item.src), h.Alt(item.alt), h.Draggable(false)])
                },
                hasThumbnails: !feed,
                hasZoom: true,
                render: (parts, context) =>
                  h.div(
                    [],
                    [
                      h.div(
                        [
                          h.Class(
                            feed
                              ? 'grid grid-cols-3 gap-0.5 md:grid-cols-4 lg:grid-cols-5'
                              : 'grid gap-0.5',
                          ),
                          ...(feed
                            ? []
                            : [
                                h.Style({
                                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                                  viewTransitionName: `${libraryId}-grid`,
                                }),
                              ]),
                        ],
                        items.map((item, index) =>
                          parts.Trigger({
                            index,
                            attributes: childAttributes([
                              h.Class(
                                'relative block aspect-square cursor-pointer overflow-hidden bg-transparent p-0 md:scroll-mt-16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
                              ),
                            ]),
                            children: [
                              h.img([
                                h.Src(item.thumb),
                                h.Srcset(item.thumbSrcset),
                                h.Sizes(
                                  feed
                                    ? '(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 33vw'
                                    : `${Math.round(100 / columns)}vw`,
                                ),
                                h.Decoding('async'),
                                h.Alt(item.alt),
                                h.Loading('lazy'),
                                h.Width(String(item.width)),
                                h.Height(String(item.height)),
                                h.Class('block size-full object-cover'),
                              ]),
                              !feed && [0, 15, 24].includes(index)
                                ? h.svg(
                                    [
                                      h.AriaHidden(true),
                                      h.Class(
                                        'pointer-events-none absolute bottom-1.5 start-1.5 h-4 w-4 fill-white text-white drop-shadow',
                                      ),
                                      h.ViewBox('0 0 24 24'),
                                      h.Fill('currentColor'),
                                      h.Stroke('currentColor'),
                                      h.StrokeWidth('2'),
                                      h.StrokeLinecap('round'),
                                      h.StrokeLinejoin('round'),
                                    ],
                                    [
                                      h.path([
                                        h.D(
                                          'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78',
                                        ),
                                      ]),
                                    ],
                                  )
                                : null,
                            ],
                          }),
                        ),
                      ),
                      feed
                        ? h.div(
                            [
                              h.Key(String(items.length)),
                              h.OnMount(ObserveFeed({ count: items.length })),
                              h.Class('flex items-center justify-center py-10'),
                            ],
                            [
                              h.span([
                                h.AriaHidden(true),
                                h.Class(
                                  `h-5 w-5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent transition-opacity ${loading ? 'opacity-100' : 'opacity-0'}`,
                                ),
                              ]),
                            ],
                          )
                        : null,
                      gallery(
                        parts,
                        context,
                        items,
                        {
                          label: feed ? 'Feed photos' : 'Library photos',
                          dir: rtl ? 'rtl' : 'ltr',
                          mode: feed ? 'feed' : 'photos',
                          thumbnails: !feed,
                          zoom: true,
                          ...(feed
                            ? {
                                more: h.div(
                                  [
                                    h.Class(
                                      `flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] font-medium text-neutral-600 transition-opacity dark:bg-white/[0.09] dark:text-neutral-300 ${loading ? 'opacity-100' : 'opacity-0'}`,
                                    ),
                                    h.AriaHidden(!loading),
                                  ],
                                  ['Loading more photos'],
                                ),
                              }
                            : {}),
                        },
                        h,
                      ),
                    ],
                  ),
              },
            }),
          ),
        ],
      ),
    ],
  )
}

const makeView = () => {
  const body = createKeyedLazy()

  return Composition.makeView((model, h) =>
    h.div(
      [h.Class('space-y-10')],
      Example.literals.map((example) => {
        const instance = model.lightboxes.find(({ key }) => key === example)
        return instance === undefined
          ? null
          : body(example, renderExample, [
              example,
              instance.model,
              example === 'infinite-scroll'
                ? 0
                : example === 'photos-app-rtl'
                  ? model.rtlColumns
                  : model.columns,
              example === 'infinite-scroll' && model.loading,
              h,
            ])
      }),
    ),
  )
}

const implementation = {
  init: Composition.makeInit(() => ({
    model: { lightboxes: [], columns: 5, rtlColumns: 5, loading: false },
    steps: [
      Root.makeFieldsStep(() => ({
        lightboxes: () =>
          Example.literals.map((example) =>
            Lightboxes.create({
              key: example,
              args: [
                {
                  id: `upstream-${example}`,
                  items: example === 'infinite-scroll' ? feedMedia(12) : photoMedia,
                  options: {
                    loop: example !== 'infinite-scroll',
                    dir: example === 'photos-app-rtl' ? 'rtl' : 'ltr',
                    maxZoom: 6,
                    preload: 2,
                    viewTransition: 'default',
                    scrollTriggerIntoView: [
                      { type: 'onChange', behavior: 'instant' },
                      { type: 'onOpenComplete', behavior: 'instant' },
                    ],
                  },
                },
              ],
            }),
          ),
      })),
    ],
  })),
  EffectsLayer: Layer.mergeAll(FetchPhotoPage.layer, ObserveFeed.layer),
  update: Composition.makeUpdate({
    ChangedDensity: Root.makeFieldsStep((_model, { rtl, columns }) =>
      rtl
        ? { rtlColumns: () => Math.max(2, Math.min(10, columns)) }
        : { columns: () => Math.max(2, Math.min(10, columns)) },
    ),
    ReachedFeedEnd: Root.makeStep((model, { count }) => {
      const current = model.lightboxes.find(({ key }) => key === 'infinite-scroll')?.model.items
        .length
      return current === count ? requestPage : { model }
    }),
    ReceivedFeedPage: Root.makeStep((_model, { count }) =>
      Update.combineSteps([
        Root.makeFieldsStep(() => ({ loading: () => false })),
        Lightboxes.informOfItems('infinite-scroll', { items: feedMedia(count) }),
      ]),
    ),
  }),
}
const plans = Effect.gen(function* () {
  const children = yield* Composition.acquireChildren()

  return { ...implementation, children, view: makeView() }
})
export const layer = Root.makeLayer(plans).pipe(Layer.provide(LightboxLayer))
