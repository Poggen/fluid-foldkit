/* @license Adapted from Ramka (MIT), Copyright (c) 2026 Artur Bień. */
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { LightboxBlock, Environment, layer as LightboxLayer } from '@foldkit-visuals/ramka/lightbox'
import { gallery } from './chrome'
import { products } from './models-data'

const key = Symbol('ModelExamples')
export const ModelExamplesBlock = Block.make('ModelExamples', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ lightboxes: Schema.Array(LightboxBlock.Instance) }),
  Message: defineMessageUnion({ MountedScene: {} }),
  effects: Block.makeEffectsContract<never, Environment>(),
  view: { kind: 'Element' },
})
const Root = ModelExamplesBlock
const Scene = Root.makeMount('Scene', {
  args: { id: Schema.String, role: Schema.Literals(['trigger', 'lightbox']) },
  messages: [Root.Message.MountedScene],
  *handler() {
    return ({ element, id, role }) => {
      const product = products.find((item) => item.id === id)
      if (!product || !(element instanceof HTMLElement))
        return Effect.succeed(Root.Message.MountedScene())
      const nearViewport =
        role === 'lightbox'
          ? Effect.void
          : Effect.callback<void>((resume) => {
              const observer = new IntersectionObserver(
                (entries) => {
                  if (entries.some((entry) => entry.isIntersecting)) resume(Effect.void)
                },
                { rootMargin: '160px' },
              )
              observer.observe(element)
              return Effect.sync(() => observer.disconnect())
            })
      return nearViewport.pipe(
        Effect.andThen(
          Effect.acquireRelease(
            Effect.promise(() => import('./models-scene')).pipe(
              Effect.map(({ mountModel }) => mountModel(element, product, role)),
            ),
            (release) => Effect.sync(release),
          ),
        ),
        Effect.as(Root.Message.MountedScene()),
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
  fold: Root.makeOutMessageFold(LightboxBlock, {
    Changed: Root.makeNoopStep,
    OpenChanged: Root.makeNoopStep,
    ValueChanged: Root.makeNoopStep,
    OpenChangeCompleted: Root.makeNoopStep,
    ZoomChanged: Root.makeNoopStep,
    Failed: Root.makeNoopStep,
  }),
})
const Composition = Root.makeComposition({ bindings: [Lightboxes], mounts: [Scene] })
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { lightboxes: [] },
    steps: [
      Root.makeFieldsStep(() => ({
        lightboxes: () =>
          products.map((product) =>
            Lightboxes.create({
              key: product.id,
              args: [
                {
                  id: `model-${product.id}`,
                  items: [
                    {
                      id: product.id,
                      width: 1024,
                      height: 1024,
                      alt: product.name,
                      caption: `${product.name} · ${product.material}`,
                    },
                  ],
                  options: { preload: 0, pullToClose: false, viewTransition: 'default' },
                },
              ],
            }),
          ),
      })),
    ],
  })),
  EffectsLayer: Scene.layer,
  update: Composition.makeUpdate({ MountedScene: Root.makeNoopStep() }),
  view: Composition.makeView((model, h) =>
    h.section(
      [h.Id('ramka-3d-models'), h.AriaLabel('3D models'), h.Class('max-w-3xl')],
      [
        h.header(
          [h.Class('mb-10')],
          [
            h.h2([h.Class('text-balance text-4xl font-semibold tracking-tight')], ['3D models']),
            h.p(
              [h.Class('mt-4 max-w-2xl text-pretty text-[15px] leading-7 text-muted-foreground')],
              [
                'Each tile has its own lightbox and a Three.js canvas. Rotate a model in the viewer and its orientation carries back to the tile.',
              ],
            ),
          ],
        ),
        h.div(
          [h.Class('py-5')],
          [
            h.div(
              [h.Class('text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground')],
              ['Object studio'],
            ),
            h.h2(
              [h.Class('mt-1 text-2xl font-semibold tracking-tight')],
              ['Khronos sample assets'],
            ),
            h.p(
              [h.Class('mt-2 max-w-md text-sm text-muted-foreground')],
              ['Open any model. Orbit stays in sync with the grid tile.'],
            ),
          ],
        ),
        h.div(
          [h.Class('grid grid-cols-2 gap-5')],
          products.map((product) => {
            const instance = model.lightboxes.find((item) => item.key === product.id)
            if (!instance) return null
            const items = [
              {
                id: product.id,
                src: product.src,
                thumb: product.src,
                alt: product.name,
                width: 1024,
                height: 1024,
                caption: `${product.name} · ${product.material}`,
              },
            ]
            const triggerScene = h.div([
              h.Class('absolute inset-0 size-full pointer-events-none'),
              h.DataAttribute('spinning', String(!instance.model.open)),
              h.OnMount(Scene({ id: product.id, role: 'trigger' })),
            ])
            const viewerScene = h.div([
              h.Class('relative size-full min-h-0'),
              h.DataAttribute('spinning', String(instance.model.open)),
              h.DataAttribute('interactive', String(instance.model.phase === 'Open')),
              h.OnMount(Scene({ id: product.id, role: 'lightbox' })),
            ])
            return h.block(
              Lightboxes.embedView({
                key: product.id,
                slotId: `model-${product.id}`,
                model: instance.model,
                viewInputs: {
                  label: product.name,
                  carouselLabel: product.name,
                  item: () => h.div([]),
                  render: (parts, context) =>
                    h.div(
                      [],
                      [
                        parts.Trigger({
                          index: 0,
                          crossfade: 'both',
                          attributes: childAttributes([
                            h.Class(
                              'group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-xl border-none bg-transparent p-0 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            ),
                          ]),
                          children: [triggerScene],
                        }),
                        h.div(
                          [h.Class('px-0.5 pt-2.5 text-center')],
                          [
                            h.div([h.Class('text-sm font-medium leading-snug')], [product.name]),
                            h.div([h.Class('text-xs text-muted-foreground')], [product.material]),
                          ],
                        ),
                        gallery(
                          parts,
                          context,
                          items,
                          {
                            label: product.name,
                            thumbnails: false,
                            zoom: false,
                            renderMedia: () =>
                              h.div(
                                [
                                  h.Class(
                                    'flex size-full items-center justify-center [container-type:size]',
                                  ),
                                ],
                                [
                                  parts.Media({
                                    width: 1024,
                                    height: 1024,
                                    attributes: childAttributes([
                                      h.Class(
                                        'size-[min(100cqw,100cqh)]! overflow-hidden rounded-xl bg-transparent',
                                      ),
                                    ]),
                                    children: [viewerScene],
                                  }),
                                ],
                              ),
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
  ),
}).pipe(Layer.provide(LightboxLayer))
