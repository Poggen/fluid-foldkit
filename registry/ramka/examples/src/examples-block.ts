import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Environment } from '@foldkit-visuals/ramka/lightbox'
import { PhotoExamplesBlock, layer as PhotosLayer } from './upstream/photos'
import { RoutingExamplesBlock, layer as RoutingLayer } from './upstream/routing'
import { EditorialExamplesBlock, layer as EditorialLayer } from './upstream/editorial'
import { ModelExamplesBlock, layer as ModelsLayer } from './upstream/models'

const examples = [
  ['ramka-photos-app', 'Photos app'],
  ['ramka-photos-app-rtl', 'Photos app (RTL)'],
  ['ramka-infinite-scroll', 'Infinite scroll'],
  ['ramka-url-synced-state-heading', 'URL-synced state'],
  ['ramka-intercepted-routes-heading', 'Intercepted routes'],
  ['text-message', 'Text message'],
  ['film-trailers', 'Film trailers'],
  ['ramka-3d-models', '3D models'],
] satisfies ReadonlyArray<readonly [string, string]>

const key = Symbol('RamkaDemos')
export const RamkaDemosBlock = Block.make('RamkaDemos', {
  key,
  InitArgs: Schema.Tuple([Schema.String]),
  ChildInitContext: Schema.String,
  Model: Schema.Struct({
    photos: PhotoExamplesBlock.Model,
    routing: RoutingExamplesBlock.Model,
    editorial: EditorialExamplesBlock.Model,
    models: ModelExamplesBlock.Model,
  }),
  Message: defineMessageUnion({}),
  effects: Block.makeEffectsContract<never, Environment>(),
  view: { kind: 'Element' },
})

const Photos = RamkaDemosBlock.makeRequiredFieldBinding(PhotoExamplesBlock, { field: 'photos' })
const Routing = RamkaDemosBlock.makeRequiredFieldBinding(RoutingExamplesBlock, {
  field: 'routing',
  init: { contextToArgs: (href) => [href] },
})
const Editorial = RamkaDemosBlock.makeRequiredFieldBinding(EditorialExamplesBlock, {
  field: 'editorial',
})
const Models = RamkaDemosBlock.makeRequiredFieldBinding(ModelExamplesBlock, { field: 'models' })
const RamkaDemosComposition = RamkaDemosBlock.makeComposition({
  bindings: [Photos, Routing, Editorial, Models],
})

export const layer = RamkaDemosBlock.makeLayer({
  init: RamkaDemosComposition.makeInit((href) => ({ model: {}, childInitContext: href })),
  update: RamkaDemosComposition.makeUpdate({}),
  view: RamkaDemosComposition.makeView(({ photos, routing, editorial, models }, h) =>
    h.section(
      [h.Id('examples'), h.AriaLabel('Ramka examples'), h.Class('w-full space-y-16 py-6')],
      [
        h.h2([h.Class('text-2xl font-semibold tracking-tight')], ['Examples']),
        h.nav(
          [h.AriaLabel('Ramka example index')],
          [
            h.ul(
              [h.Class('flex flex-wrap gap-x-5 gap-y-2 border-b pb-3 text-sm')],
              examples.map(([id, title]) =>
                h.li(
                  [],
                  [h.a([h.Href(`#${id}`), h.Class('underline underline-offset-4')], [title])],
                ),
              ),
            ),
          ],
        ),
        h.block(Photos.embedView({ slotId: 'photos', model: photos })),
        h.block(Routing.embedView({ slotId: 'routing', model: routing })),
        h.block(Editorial.embedView({ slotId: 'editorial', model: editorial })),
        h.block(Models.embedView({ slotId: 'models', model: models })),
      ],
    ),
  ),
}).pipe(Layer.provide(Layer.mergeAll(PhotosLayer, RoutingLayer, EditorialLayer, ModelsLayer)))
