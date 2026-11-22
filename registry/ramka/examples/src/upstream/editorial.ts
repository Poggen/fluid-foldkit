/* @license Ramka examples adaptation. MIT. Copyright (c) 2026 Artur Bień. */
import { Effect, Layer, Match, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { childAttributes } from 'foldkit/html'
import { Environment, LightboxBlock, layer as LightboxLayer } from '@foldkit-visuals/ramka/lightbox'
import { gallery } from './chrome'
import { attachments, films } from './editorial-media'

const key = Symbol('EditorialExamples')
export const EditorialExamplesBlock = Block.make('EditorialExamples', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    lightboxes: Schema.Array(LightboxBlock.Instance),
    ready: Schema.Record(Schema.String, Schema.Boolean),
  }),
  Message: defineMessageUnion({ MountedVideo: {} }),
  effects: Block.makeEffectsContract<never, Environment>(),
  view: { kind: 'Element' },
})
const Root = EditorialExamplesBlock

const ObserveVideo = Root.makeMountStream('ObserveEditorialVideo', {
  messages: [Root.Message.MountedVideo],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state !== 'Live'
            ? Stream.never
            : Stream.callback<typeof Root.Message.MountedVideo.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    if (!(element instanceof HTMLVideoElement)) return () => undefined
                    const synchronize = () => {
                      if (element.dataset.playReady === 'true') {
                        void element.play().catch(() => undefined)
                      } else {
                        element.pause()
                        element.currentTime = 0
                      }
                    }
                    const observer = new MutationObserver(synchronize)
                    observer.observe(element, {
                      attributes: true,
                      attributeFilter: ['data-play-ready'],
                    })
                    synchronize()
                    Queue.offerUnsafe(queue, Root.Message.MountedVideo())
                    return () => {
                      observer.disconnect()
                      element.pause()
                      element.currentTime = 0
                    }
                  }),
                  (release) => Effect.sync(release),
                ),
              ),
        ),
      )
  },
})

const Lightboxes = Root.makeKeyedArrayBinding(LightboxBlock, {
  field: 'lightboxes',
  key: 'key',
  childField: 'model',
}).withOutMessagePolicy({
  fold: (id, out) =>
    Root.makeFieldsStep((model) => ({
      ready: () =>
        Match.value(out).pipe(
          Match.tagsExhaustive({
            Changed: ({ open }) => (open ? model.ready : { ...model.ready, [id]: false }),
            OpenChanged: ({ open }) => (open ? model.ready : { ...model.ready, [id]: false }),
            ValueChanged: () => model.ready,
            OpenChangeCompleted: ({ open }) => ({ ...model.ready, [id]: open }),
            ZoomChanged: () => model.ready,
            Failed: () => ({ ...model.ready, [id]: false }),
          }),
        ),
    })),
})
const Composition = Root.makeComposition({ bindings: [Lightboxes], mounts: [ObserveVideo] })

export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { lightboxes: [], ready: {} },
    steps: [
      Root.makeFieldsStep(() => ({
        lightboxes: () => [
          Lightboxes.create({
            key: 'text-message',
            args: [
              {
                id: 'text-message',
                items: attachments,
                options: { morphTo: 'origin', viewTransition: 'default' },
              },
            ],
          }),
          ...films.map((film) =>
            Lightboxes.create({
              key: film.id,
              args: [
                {
                  id: `film-${film.id}`,
                  items: [
                    {
                      id: film.id,
                      alt: film.title,
                      caption: film.title,
                      width: film.width,
                      height: film.height,
                    },
                  ],
                  options: { viewTransition: 'default' },
                },
              ],
            }),
          ),
        ],
      })),
    ],
  })),
  update: Composition.makeUpdate({ MountedVideo: Root.makeNoopStep() }),
  EffectsLayer: ObserveVideo.layer,
  view: Composition.makeView((model, h) => {
    const text = model.lightboxes.find((instance) => instance.key === 'text-message')
    const code = (label: string) =>
      h.code([h.Class('rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800')], [label])
    const stackOffsets = [
      { x: 0, y: 0, rotate: 0 },
      { x: 10, y: -4, rotate: 2 },
      { x: -12, y: 8, rotate: -6 },
    ]
    return h.div(
      [h.Class('space-y-16')],
      [
        h.section(
          [h.Id('text-message')],
          [
            h.header(
              [h.Class('mb-10')],
              [
                h.h1(
                  [
                    h.Class(
                      'text-balance text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50',
                    ),
                  ],
                  ['Text message'],
                ),
                h.p(
                  [
                    h.Class(
                      'mt-4 max-w-2xl text-pretty text-[15px] leading-7 text-neutral-500 dark:text-neutral-400',
                    ),
                  ],
                  [
                    'A single ',
                    code('Trigger'),
                    ' wraps an entire stack of attachments. Paired with ',
                    code("morphTo: 'origin'"),
                    ', the close animation always returns to the stack no matter which attachment is active.',
                  ],
                ),
              ],
            ),
            text === undefined
              ? h.empty
              : h.block(
                  Lightboxes.embedView({
                    key: text.key,
                    slotId: 'text-message',
                    model: text.model,
                    viewInputs: {
                      label: 'Message attachments',
                      carouselLabel: 'Message attachments',
                      hasThumbnails: true,
                      hasZoom: true,
                      item: () => h.empty,
                      render: (parts, context) =>
                        h.div(
                          [
                            h.Class(
                              'flex min-h-[80vh] items-end justify-end rounded-2xl bg-neutral-100 p-6 dark:bg-neutral-900',
                            ),
                          ],
                          [
                            h.div(
                              [h.Class('flex max-w-[300px] flex-col items-end gap-3')],
                              [
                                h.span(
                                  [
                                    h.Class(
                                      'text-[10px] font-medium uppercase tracking-[0.05em] text-neutral-500',
                                    ),
                                  ],
                                  ['Today at 11:11 AM'],
                                ),
                                h.div(
                                  [
                                    h.Class(
                                      'rounded-[20px] rounded-br-[4px] bg-blue-500 px-4 py-2 text-sm font-medium text-white',
                                    ),
                                  ],
                                  ['some imgs'],
                                ),
                                parts.Trigger({
                                  index: 0,
                                  crossfade: 'close',
                                  attributes: childAttributes([
                                    h.AriaLabel('Open 3 attachments'),
                                    h.Class(
                                      'relative block h-80 w-[260px] cursor-pointer rounded-2xl border-none bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-4',
                                    ),
                                  ]),
                                  children: [
                                    h.div(
                                      [h.Class('absolute -inset-5')],
                                      attachments.map((item, index) => {
                                        const offset = stackOffsets[index] ?? {
                                          x: 0,
                                          y: 0,
                                          rotate: 0,
                                        }
                                        return h.img([
                                          h.Src(item.src),
                                          h.Alt(item.alt),
                                          ...(index === 0
                                            ? [
                                                h.DataAttribute('ramka-morph', ''),
                                                h.DataAttribute('ramka-image', ''),
                                              ]
                                            : []),
                                          h.Class(
                                            'absolute block h-[280px] w-[200px] rounded-2xl object-cover shadow-[0_4px_20px_rgba(0,0,0,0.15)]',
                                          ),
                                          h.Style({
                                            left: '50%',
                                            top: '50%',
                                            transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotate}deg)`,
                                            zIndex: String(attachments.length - index),
                                          }),
                                        ])
                                      }),
                                    ),
                                  ],
                                }),
                                h.div(
                                  [h.Class('flex items-center gap-2 text-xs text-neutral-500')],
                                  [
                                    h.svg(
                                      [
                                        h.AriaHidden(true),
                                        h.Width('16'),
                                        h.Height('16'),
                                        h.ViewBox('0 0 16 16'),
                                        h.Fill('none'),
                                        h.Class('opacity-40'),
                                      ],
                                      [
                                        h.path([
                                          h.D(
                                            'M2 3h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4-2h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Zm4 2h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM4.5 8h7a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13.5v-4A1.5 1.5 0 0 1 4.5 8Z',
                                          ),
                                          h.Stroke('currentColor'),
                                          h.StrokeWidth('1.2'),
                                        ]),
                                      ],
                                    ),
                                    h.span([], ['3 attachments']),
                                  ],
                                ),
                              ],
                            ),
                            gallery(
                              parts,
                              context,
                              attachments,
                              { label: 'Message attachments' },
                              h,
                            ),
                          ],
                        ),
                    },
                  }),
                ),
          ],
        ),
        h.section(
          [h.Id('film-trailers')],
          [
            h.header(
              [h.Class('mb-10')],
              [
                h.h1(
                  [
                    h.Class(
                      'text-balance text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50',
                    ),
                  ],
                  ['Film trailers'],
                ),
                h.p(
                  [
                    h.Class(
                      'mt-4 max-w-2xl text-pretty text-[15px] leading-7 text-neutral-500 dark:text-neutral-400',
                    ),
                  ],
                  [
                    'Each poster is its own ',
                    code('LightboxBlock'),
                    ' with a single-item gallery and ',
                    code('renderMedia'),
                    ' for the video. ',
                    code("crossfade: 'close'"),
                    ' hard-cuts the open morph into the video and dissolves the live frame back into the poster on close. Video autoplays (muted) only after ',
                    code('OpenChangeCompleted'),
                    '.',
                  ],
                ),
              ],
            ),
            h.div(
              [h.Class('max-w-3xl')],
              [
                h.div(
                  [h.Class('py-5')],
                  [
                    h.div(
                      [
                        h.Class(
                          'text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground',
                        ),
                      ],
                      ['Now Streaming'],
                    ),
                    h.h3(
                      [h.Class('mt-1 text-2xl font-semibold tracking-tight')],
                      ['Blender Open Movies'],
                    ),
                    h.p(
                      [h.Class('mt-2 max-w-md text-sm text-muted-foreground')],
                      [
                        'Four Creative Commons shorts from the Blender Foundation. Click any poster to watch fullscreen.',
                      ],
                    ),
                  ],
                ),
                h.div(
                  [h.Class('grid grid-cols-2 gap-5 sm:grid-cols-3')],
                  films.map((film) => {
                    const instance = model.lightboxes.find((item) => item.key === film.id)
                    if (instance === undefined) return h.empty
                    const item = {
                      id: film.id,
                      src: film.poster,
                      thumb: film.poster,
                      alt: film.title,
                      caption: film.title,
                      width: film.width,
                      height: film.height,
                    }
                    const video = h.video(
                      [
                        h.Src(film.video),
                        h.Poster(film.poster),
                        h.Width(String(film.width)),
                        h.Height(String(film.height)),
                        h.Controls(true),
                        h.Playsinline(true),
                        h.Muted(true),
                        h.Preload('metadata'),
                        h.DataAttribute('play-ready', String(model.ready[film.id] === true)),
                        h.OnMount(ObserveVideo()),
                        h.Class('h-full w-full object-cover'),
                      ],
                      [h.a([h.Href(film.video)], [`Watch ${film.title}`])],
                    )
                    return h.block(
                      Lightboxes.embedView({
                        key: instance.key,
                        slotId: `film-${film.id}`,
                        model: instance.model,
                        viewInputs: {
                          label: film.title,
                          carouselLabel: film.title,
                          hasThumbnails: false,
                          hasZoom: true,
                          item: () => h.empty,
                          render: (parts, context) =>
                            h.div(
                              [],
                              [
                                parts.Trigger({
                                  index: 0,
                                  crossfade: 'close',
                                  attributes: childAttributes([
                                    h.Class(
                                      'group block w-full cursor-pointer rounded-xl border-none bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4',
                                    ),
                                  ]),
                                  children: [
                                    h.div(
                                      [
                                        h.DataAttribute('ramka-morph', ''),
                                        h.Class('relative overflow-hidden rounded-xl'),
                                      ],
                                      [
                                        h.img([
                                          h.Src(film.poster),
                                          h.Alt(film.title),
                                          h.Loading('lazy'),
                                          h.Class(
                                            'block aspect-[2/3] w-full rounded-xl object-cover',
                                          ),
                                        ]),
                                        h.div(
                                          [
                                            h.Class(
                                              'pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100',
                                            ),
                                          ],
                                          [
                                            h.div(
                                              [
                                                h.Class(
                                                  'flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-black',
                                                ),
                                              ],
                                              [
                                                h.svg(
                                                  [
                                                    h.AriaHidden(true),
                                                    h.ViewBox('0 0 24 24'),
                                                    h.Fill('currentColor'),
                                                    h.Class('h-5 w-5'),
                                                  ],
                                                  [h.path([h.D('m6 3 14 9-14 9V3Z')])],
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    h.div(
                                      [h.Class('px-0.5 pt-2.5')],
                                      [
                                        h.div(
                                          [h.Class('text-sm font-medium leading-snug')],
                                          [film.title],
                                        ),
                                        h.div(
                                          [h.Class('text-xs text-muted-foreground')],
                                          [`${film.year} · ${film.genre}`],
                                        ),
                                      ],
                                    ),
                                  ],
                                }),
                                gallery(
                                  parts,
                                  context,
                                  [item],
                                  {
                                    label: film.title,
                                    thumbnails: false,
                                    zoom: false,
                                    renderMedia: () =>
                                      parts.Zoom({
                                        index: 0,
                                        children: [
                                          parts.Media({
                                            index: 0,
                                            width: film.width,
                                            height: film.height,
                                            attributes: childAttributes([
                                              h.Class('overflow-hidden rounded-xl'),
                                            ]),
                                            children: [video],
                                          }),
                                        ],
                                      }),
                                  },
                                  h,
                                ),
                              ],
                            ),
                        },
                      }),
                    )
                  }),
                ),
              ],
            ),
          ],
        ),
      ],
    )
  }),
}).pipe(Layer.provide(LightboxLayer))
