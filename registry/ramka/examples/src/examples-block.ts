import { Effect, Layer, Match, Queue, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { LightboxBlock, Environment, layer as LightboxLayer } from '@foldkit-visuals/ramka/lightbox'
import { batch, Example, itemDefinitions, lightboxConfig, limit } from './example-data'
import { examplePage, parameter, selectedPhoto, writePhoto } from './example-location'
import { renderRamkaExample } from './examples-view'

const key = Symbol('RamkaDemos')
export const RamkaDemosBlock = Block.make('RamkaDemos', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    lightboxes: Schema.Array(LightboxBlock.Instance),
    standalone: Schema.NullOr(Schema.String),
    angles: Schema.Record(Schema.String, Schema.Finite),
  }),
  Message: defineMessageUnion({
    ReachedPhotoBatchEnd: { count: Schema.Natural },
    ReadPhotoLocation: {
      example: Example,
      id: Schema.NullOr(Schema.String),
      intercepted: Schema.Boolean,
    },
    WrotePhotoLocation: {},
    ChangedOrbit: { id: Schema.String, angle: Schema.Finite },
  }),
  effects: Block.makeEffectsContract<never, Environment>(),
  view: { kind: 'Element' },
})
const Root = RamkaDemosBlock

const WritePhotoLocation = Root.makeCommand('WritePhotoLocation', {
  args: { example: Example, id: Schema.NullOr(Schema.String) },
  messages: [Root.Message.WrotePhotoLocation],
  *handler() {
    return ({ example, id }) =>
      Effect.sync(() => {
        if (typeof window !== 'undefined') writePhoto(example, id)
        return Root.Message.WrotePhotoLocation()
      })
  },
})

const ObserveLocation = Root.makeMountStream('ObserveLocation', {
  args: { example: Example },
  messages: [Root.Message.ReadPhotoLocation],
  *handler() {
    return ({ element, example, viewStateChanges }) => {
      const window = element.ownerDocument.defaultView
      if (window === null) return Stream.never
      return viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state !== 'Live'
            ? Stream.never
            : Stream.callback<typeof Root.Message.ReadPhotoLocation.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const read = () => {
                      if (window.location.pathname === examplePage)
                        Queue.offerUnsafe(
                          queue,
                          Root.Message.ReadPhotoLocation({
                            example,
                            ...selectedPhoto(window, example),
                          }),
                        )
                    }
                    read()
                    window.addEventListener('popstate', read)
                    window.addEventListener('foldkit:urlchange', read)
                    return () => {
                      window.removeEventListener('popstate', read)
                      window.removeEventListener('foldkit:urlchange', read)
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

const ObservePhotoBatch = Root.makeMountStream('ObservePhotoBatch', {
  args: { count: Schema.Natural },
  messages: [Root.Message.ReachedPhotoBatchEnd],
  *handler() {
    return ({ element, count, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state !== 'Live'
            ? Stream.never
            : Stream.callback<typeof Root.Message.ReachedPhotoBatchEnd.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const observer = new IntersectionObserver(
                      (entries) => {
                        if (!entries.some((entry) => entry.isIntersecting)) return
                        observer.disconnect()
                        Queue.offerUnsafe(queue, Root.Message.ReachedPhotoBatchEnd({ count }))
                      },
                      { root: element.parentElement },
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

const Lightboxes = Root.makeKeyedArrayBinding(LightboxBlock, {
  field: 'lightboxes',
  placement: 'lightboxes',
  key: 'key',
  childField: 'model',
}).withOutMessagePolicy({
  fold: (key, out) =>
    Root.makeStep((model) => {
      const example = Example.literals.find((candidate) => candidate === key)
      if (example === undefined || parameter(example) === undefined) return { model }
      const lightbox = model.lightboxes.find((entry) => entry.key === key)?.model
      if (lightbox === undefined) return { model }
      const selected = (index: number) => lightbox.items[index]?.id ?? null
      const id = Match.value(out).pipe(
        Match.tagsExhaustive({
          Changed: ({ open, index }) => (open ? selected(index) : null),
          OpenChanged: ({ open }) => (open ? selected(lightbox.index) : null),
          ValueChanged: ({ index }) => (lightbox.open ? selected(index) : undefined),
          OpenChangeCompleted: () => undefined,
          ZoomChanged: () => undefined,
          Failed: () => undefined,
        }),
      )
      return id === undefined
        ? { model }
        : { model, commands: [WritePhotoLocation({ example, id })] }
    }),
})
const Composition = Root.makeComposition({
  bindings: [Lightboxes],
  mounts: [ObserveLocation, ObservePhotoBatch],
})

export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { lightboxes: [], standalone: null, angles: {} },
    steps: [
      Root.makeFieldsStep(() => ({
        lightboxes: () =>
          Example.literals.map((example) =>
            Lightboxes.create({ key: example, args: [lightboxConfig(example)] }),
          ),
      })),
    ],
  })),
  EffectsLayer: Layer.mergeAll(
    WritePhotoLocation.layer,
    ObserveLocation.layer,
    ObservePhotoBatch.layer,
  ),
  update: Composition.makeUpdate({
    ReachedPhotoBatchEnd: Root.makeStep((model, { count }) => {
      const gallery = model.lightboxes.find(({ key }) => key === 'infinite-scroll')
      if (gallery?.model.items.length !== count || count >= limit) return { model }
      return Lightboxes.informOfItems('infinite-scroll', {
        items: itemDefinitions('infinite-scroll', Math.min(count + batch, limit)),
      })
    }),
    ReadPhotoLocation: Root.makeStep((_model, { example, id, intercepted }) => {
      const index = itemDefinitions(example).findIndex((item) => item.id === id)
      const standalone = example === 'intercepted-routes' && !intercepted && index >= 0
      return Update.combineSteps([
        ...(example === 'intercepted-routes'
          ? [Root.makeFieldsStep(() => ({ standalone: () => (standalone ? id : null) }))]
          : []),
        ...(index >= 0 && !standalone
          ? [Lightboxes.requestOpen(example, { index })]
          : [Lightboxes.requestClose(example)]),
      ])
    }),
    WrotePhotoLocation: Root.makeNoopStep(),
    ChangedOrbit: Root.makeFieldsStep(({ angles }, { id, angle }) => ({
      angles: () => ({ ...angles, [id]: angle }),
    })),
  }),
  view: Composition.makeView((model, h) =>
    h.section(
      [h.Id('examples'), h.AriaLabel('Ramka examples'), h.Class('mt-12 space-y-10')],
      [
        h.h2([h.Class('text-xl font-medium')], ['Examples']),
        ...Example.literals.map((example) => {
          const instance = model.lightboxes.find(({ key }) => key === example)
          if (instance === undefined) return null
          return renderRamkaExample(
            {
              example,
              model: instance.model,
              standalone: model.standalone,
              angles: model.angles,
              location:
                parameter(example) === undefined ? [] : [h.OnMount(ObserveLocation({ example }))],
              sentinel: (count) =>
                h.div(
                  [
                    h.Key(String(count)),
                    h.Class('p-2 text-center text-xs'),
                    h.OnMount(ObservePhotoBatch({ count })),
                  ],
                  ['Loading more photos…'],
                ),
              changeOrbit: (id, angle) => Root.Message.ChangedOrbit({ id, angle }),
              embed: (viewInputs) =>
                h.block(
                  Lightboxes.embedView({
                    key: example,
                    slotId: example,
                    model: instance.model,
                    viewInputs,
                  }),
                ),
            },
            h,
          )
        }),
        h.p(
          [h.Class('text-xs text-[var(--fluid-text-muted)]')],
          [
            h.a(
              [h.Href('https://unsplash.com/'), h.Class('underline')],
              ['Photography via Unsplash'],
            ),
            ' · ',
            h.a(
              [h.Href('https://studio.blender.org/films/'), h.Class('underline')],
              ['Films by the Blender Foundation'],
            ),
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(LightboxLayer))
