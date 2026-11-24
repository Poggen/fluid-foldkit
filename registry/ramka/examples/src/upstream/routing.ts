/* @license MIT. Adapted from Ramka upstream 9eaaab4, Copyright (c) 2026 Artur Bień. */
import { Effect, Layer, Match, Queue, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { childAttributes } from 'foldkit/html'
import { LightboxBlock, Environment, layer as LightboxLayer } from '@foldkit-visuals/ramka/lightbox'
import { gallery } from './chrome'
import { routePhotos, interceptedPhotos } from './route-media'

const Example = Schema.Literals(['url-synced-state', 'intercepted-routes'])
type Example = typeof Example.Type
const examples = Example.literals
const photos = (example: Example) =>
  example === 'url-synced-state' ? routePhotos : interceptedPhotos
const parameter = (example: Example) =>
  example === 'url-synced-state' ? 'ramka-photo' : 'ramka-route'
const headingId = 'ramka-intercepted-routes-heading'
const basePath = '/ramka/lightbox'
const title = (example: Example) =>
  example === 'url-synced-state' ? 'URL-synced state' : 'Intercepted routes'
const photoHref = (example: Example, id: string | null) =>
  `${basePath}${id === null ? '' : `?${parameter(example)}=${encodeURIComponent(id)}`}#${example === 'intercepted-routes' ? headingId : 'ramka-url-synced-state-heading'}`
const documentVisit = (window: Window) =>
  window.history.state?.ramkaExample === 'intercepted-routes' &&
  window.history.state?.ramkaDocument === window.performance.timeOrigin
function locationPhoto(href: string, example: Example) {
  const url = new URL(href, 'http://localhost')
  return url.pathname === basePath
    ? photos(example).findIndex((photo) => photo.id === url.searchParams.get(parameter(example)))
    : -1
}

const key = Symbol('RoutingExamples')
export const RoutingExamplesBlock = Block.make('RoutingExamples', {
  key,
  InitArgs: Schema.Tuple([Schema.String]),
  Model: Schema.Struct({
    lightboxes: Schema.Array(LightboxBlock.Instance),
    standalone: Schema.NullOr(Schema.String),
    urlSyncedDeepLink: Schema.Boolean,
  }),
  Message: defineMessageUnion({
    ReadLocation: { href: Schema.String, intercepted: Schema.Boolean },
    FollowedPhotoLink: { id: Schema.String },
    WroteLocation: {},
  }),
  effects: Block.makeEffectsContract<never, Environment>(),
  view: { kind: 'Element' },
})
const Root = RoutingExamplesBlock
const WriteLocation = Root.makeCommand('WriteLocation', {
  args: { example: Example, id: Schema.NullOr(Schema.String), completed: Schema.Boolean },
  messages: [Root.Message.WroteLocation],
  *handler() {
    return ({ example, id, completed }) =>
      Effect.sync(() => {
        if (typeof window === 'undefined' || window.location.pathname !== basePath)
          return Root.Message.WroteLocation()
        const url = new URL(window.location.href)
        const param = parameter(example)
        const previous = url.searchParams.get(param)
        if (completed) {
          if (previous !== null && documentVisit(window)) window.history.back()
          return Root.Message.WroteLocation()
        }
        if (id === previous) return Root.Message.WroteLocation()
        if (example === 'intercepted-routes' && id === null) return Root.Message.WroteLocation()
        if (id === null) url.searchParams.delete(param)
        else {
          url.searchParams.set(param, id)
          if (example === 'intercepted-routes') url.hash = headingId
        }
        const state = {
          ...window.history.state,
          ramkaExample: example,
          ramkaDocument: window.performance.timeOrigin,
        }
        if (id !== null && previous === null) window.history.pushState(state, '', url)
        else window.history.replaceState(window.history.state, '', url)
        window.dispatchEvent(new Event('foldkit:urlchange'))
        return Root.Message.WroteLocation()
      })
  },
})
const ObserveLocation = Root.makeMountStream('ObserveLocation', {
  messages: [Root.Message.ReadLocation, Root.Message.FollowedPhotoLink],
  *handler() {
    return ({ element, viewStateChanges }) => {
      const window = element.ownerDocument.defaultView
      if (!window) return Stream.never
      return viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state !== 'Live'
            ? Stream.never
            : Stream.callback<
                typeof Root.Message.ReadLocation.Type | typeof Root.Message.FollowedPhotoLink.Type
              >((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const pageTitle = element.ownerDocument.title
                    const read = () => {
                      if (window.location.pathname !== basePath) return
                      const selectedExample = examples.find(
                        (example) => locationPhoto(window.location.href, example) >= 0,
                      )
                      const selected =
                        selectedExample === undefined
                          ? undefined
                          : photos(selectedExample)[
                              locationPhoto(window.location.href, selectedExample)
                            ]
                      element.ownerDocument.title = selected
                        ? `${selected.caption} · ${pageTitle}`
                        : pageTitle
                      Queue.offerUnsafe(
                        queue,
                        Root.Message.ReadLocation({
                          href: window.location.href,
                          intercepted: documentVisit(window),
                        }),
                      )
                    }
                    const click = (event: Event) => {
                      if (!(event instanceof window.MouseEvent)) return
                      if (
                        event.defaultPrevented ||
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return
                      const target = event.target
                      const link =
                        target instanceof window.Element
                          ? target.closest<HTMLAnchorElement>('a[data-ramka-photo-link]')
                          : null
                      const id = link?.dataset.ramkaPhotoLink
                      if (!id) return
                      event.preventDefault()
                      Queue.offerUnsafe(queue, Root.Message.FollowedPhotoLink({ id }))
                    }
                    read()
                    window.addEventListener('popstate', read)
                    window.addEventListener('foldkit:urlchange', read)
                    element.addEventListener('click', click)
                    return () => {
                      window.removeEventListener('popstate', read)
                      window.removeEventListener('foldkit:urlchange', read)
                      element.removeEventListener('click', click)
                    }
                  }),
                  (release) => Effect.sync(release),
                ),
              ),
        ),
      )
    }
  },
})
const Lightboxes = Root.makeKeyedArrayBinding(LightboxBlock, {
  field: 'lightboxes',
  placement: 'lightboxes',
  key: 'key',
  childField: 'model',
}).withOutMessagePolicy({
  fold: (key, out) =>
    Root.makeStep((model) => {
      const example = examples.find((candidate) => candidate === key)
      const child = model.lightboxes.find((entry) => entry.key === key)?.model
      if (!example || !child) return { model }
      const selected = (index: number) => photos(example)[index]?.id
      const write = (id: string | null | undefined, completed = false) =>
        Root.makeCommandsStep(() =>
          id === undefined ? [] : [WriteLocation({ example, id, completed })],
        )
      return Match.value(out).pipe(
        Match.tagsExhaustive({
          Changed: ({ open, index }) =>
            Update.combineSteps([
              Lightboxes.informOfValue(example, { index }),
              Lightboxes.informOfOpen(example, { open }),
              write(open ? selected(index) : null),
            ]),
          OpenChanged: ({ open }) =>
            Update.combineSteps([
              Lightboxes.informOfOpen(example, { open }),
              write(open ? selected(child.index) : null),
            ]),
          ValueChanged: ({ index }) =>
            Update.combineSteps([
              Lightboxes.informOfValue(example, { index }),
              write(child.open ? selected(index) : undefined),
            ]),
          OpenChangeCompleted: ({ open }) =>
            !open && example === 'intercepted-routes' ? write(null, true) : Root.makeNoopStep(),
          ZoomChanged: Root.makeNoopStep,
          Failed: Root.makeNoopStep,
        }),
      )
    }),
})
const Composition = Root.makeComposition({ bindings: [Lightboxes], mounts: [ObserveLocation] })
export const layer = Root.makeLayer({
  init: Composition.makeInit((href) => ({
    model: {
      lightboxes: [],
      standalone: interceptedPhotos[locationPhoto(href, 'intercepted-routes')]?.id ?? null,
      urlSyncedDeepLink: locationPhoto(href, 'url-synced-state') >= 0,
    },
    steps: [
      Root.makeFieldsStep(() => ({
        lightboxes: () =>
          examples.map((example) => {
            const index = locationPhoto(href, example)
            return Lightboxes.create({
              key: example,
              args: [
                {
                  id: `ramka-${example}`,
                  items: photos(example),
                  defaultOpen: example === 'url-synced-state' && index >= 0,
                  defaultValue: Math.max(0, index),
                  options: {
                    loop: true,
                    viewTransition: 'default',
                    scrollTriggerIntoView: [
                      { type: 'onChange', behavior: 'instant' },
                      { type: 'onOpenComplete', behavior: 'instant' },
                    ],
                  },
                },
              ],
            })
          }),
      })),
    ],
  })),
  EffectsLayer: Layer.mergeAll(WriteLocation.layer, ObserveLocation.layer),
  update: Composition.makeUpdate({
    ReadLocation: Root.makeStep((_model, { href, intercepted }) =>
      Update.combineSteps([
        Root.makeFieldsStep(() => ({
          standalone: () =>
            intercepted
              ? null
              : (interceptedPhotos[locationPhoto(href, 'intercepted-routes')]?.id ?? null),
        })),
        ...examples.map((example) => {
          const index = locationPhoto(href, example)
          return Update.combineSteps([
            ...(index >= 0 ? [Lightboxes.informOfValue(example, { index })] : []),
            Lightboxes.informOfOpen(example, {
              open: index >= 0 && (example === 'url-synced-state' || intercepted),
            }),
          ])
        }),
      ]),
    ),
    FollowedPhotoLink: Root.makeStep((model, { id }) => ({
      model,
      commands: [WriteLocation({ example: 'intercepted-routes', id, completed: false })],
    })),
    WroteLocation: Root.makeNoopStep(),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [h.OnMount(ObserveLocation())],
      examples.map((example) => {
        const instance = model.lightboxes.find((entry) => entry.key === example)
        if (!instance) return null
        const items = photos(example)
        const standalone =
          example === 'intercepted-routes'
            ? interceptedPhotos.find((photo) => photo.id === model.standalone)
            : undefined
        return h.section(
          [h.Class('mt-10'), h.AriaLabel(title(example))],
          [
            h.h3(
              [
                h.Id(
                  example === 'intercepted-routes' ? headingId : 'ramka-url-synced-state-heading',
                ),
                h.Class('mb-3 text-2xl font-semibold tracking-tight'),
              ],
              [title(example)],
            ),
            h.p(
              [h.Class('mb-6 max-w-3xl text-[13px] leading-6 text-neutral-500')],
              [
                example === 'url-synced-state'
                  ? 'Every photo in this masonry wall has its own URL. Tapping a tile opens the viewer and adds the photo to the address. Swiping updates that same history entry, and Back returns to the gallery. Opening a photo URL directly renders the gallery with the lightbox already open on the server. The Foldkit Block keeps the photo and viewer state in sync with the browser history.'
                  : 'Each photo has one URL and two presentations. Follow a link from the gallery to open a lightbox over the grid. Visit that URL directly or reload it to see a standalone photo. Browser Back returns to the gallery. Compare this with URL-synced state, which opens the same gallery and viewer on a direct visit.',
              ],
            ),
            standalone
              ? h.div(
                  [h.Class('max-w-4xl py-8')],
                  [
                    h.a(
                      [
                        h.Href(photoHref(example, null)),
                        h.Class(
                          'mb-8 inline-block text-[13px] text-neutral-500 underline underline-offset-4',
                        ),
                      ],
                      ['← Back to the gallery'],
                    ),
                    h.figure(
                      [],
                      [
                        h.img([
                          h.Src(standalone.src),
                          h.Alt(standalone.alt),
                          h.Class('block h-auto w-full rounded-2xl'),
                        ]),
                        h.figcaption(
                          [h.Class('mt-4 text-[15px] text-neutral-600')],
                          [standalone.caption],
                        ),
                      ],
                    ),
                    h.p(
                      [h.Class('mt-8 max-w-2xl text-[13px] leading-6 text-neutral-500')],
                      [
                        'You hard-loaded this photo URL, so route interception did not apply and you got this standalone page instead of the lightbox over the grid — one URL, two presentations. Navigate back to the gallery and click the same photo to see the intercepted modal presentation.',
                      ],
                    ),
                  ],
                )
              : h.block(
                  Lightboxes.embedView({
                    key: example,
                    slotId: example,
                    model: instance.model,
                    viewInputs: {
                      label: 'Gallery photos',
                      carouselLabel: 'Gallery photos',
                      hasThumbnails: true,
                      hasZoom: true,
                      ...(example === 'url-synced-state' && model.urlSyncedDeepLink
                        ? { portalContainerId: null }
                        : {}),
                      item: (index) =>
                        h.img([h.Src(items[index]?.src ?? ''), h.Alt(items[index]?.alt ?? '')]),
                      render: (parts, context) =>
                        h.div(
                          [],
                          [
                            h.div(
                              [
                                h.Class(
                                  example === 'url-synced-state'
                                    ? 'max-w-2xl [container-type:inline-size]'
                                    : 'grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3',
                                ),
                              ],
                              example === 'url-synced-state'
                                ? [
                                    h.div(
                                      [
                                        h.Class(
                                          'grid grid-flow-dense grid-cols-2 auto-rows-[var(--masonry-unit)] gap-x-[calc(var(--masonry-unit)*9)] [--masonry-unit:calc(100cqw/249)] sm:grid-cols-3 sm:[--masonry-unit:calc(100cqw/378)]',
                                        ),
                                      ],
                                      items.map((item, index) =>
                                        parts.Trigger({
                                          index,
                                          attributes: childAttributes([
                                            h.Class(
                                              'block w-full cursor-pointer overflow-hidden rounded-xl border-none bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-4',
                                            ),
                                            h.Style({
                                              gridRowEnd: `span ${Math.round((120 * item.height) / item.width) + 9}`,
                                              marginBottom: 'calc(var(--masonry-unit) * 9)',
                                            }),
                                          ]),
                                          children: [
                                            h.img([
                                              h.Src(item.thumb),
                                              h.Alt(item.alt),
                                              h.Loading('lazy'),
                                              h.Class(
                                                'block h-full w-full rounded-xl bg-neutral-100 object-cover transition duration-200 hover:opacity-90',
                                              ),
                                            ]),
                                          ],
                                        }),
                                      ),
                                    ),
                                  ]
                                : items.map((item) =>
                                    h.a(
                                      [
                                        h.Href(photoHref(example, item.id)),
                                        h.DataAttribute('ramka-photo-link', item.id),
                                        h.Class('block overflow-hidden rounded-xl'),
                                      ],
                                      [
                                        h.img([
                                          h.Src(item.thumb),
                                          h.Alt(item.alt),
                                          h.Loading('lazy'),
                                          h.Class(
                                            'block aspect-square h-auto w-full rounded-xl bg-neutral-100 object-cover transition duration-200 hover:opacity-90',
                                          ),
                                        ]),
                                      ],
                                    ),
                                  ),
                            ),
                            gallery(
                              parts,
                              context,
                              items,
                              { label: 'Gallery photos', backdrop: 'solid', ssrSlideShift: true },
                              h,
                            ),
                          ],
                        ),
                    },
                  }),
                ),
          ],
        )
      }),
    ),
  ),
}).pipe(Layer.provide(LightboxLayer))
