import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { createKeyedLazy } from 'foldkit/html'
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
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{ readonly only?: 'photos-app' }>(),
  },
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

type DemosViewBuilder = Block.ViewBuilderFor<typeof RamkaDemosComposition>
const renderPhotos = (model: (typeof RamkaDemosBlock.Model.Type)['photos'], h: DemosViewBuilder) =>
  h.block(Photos.embedView({ slotId: 'photos', model, viewInputs: {} }))
const renderRouting = (
  model: (typeof RamkaDemosBlock.Model.Type)['routing'],
  h: DemosViewBuilder,
) => h.block(Routing.embedView({ slotId: 'routing', model }))
const renderEditorial = (
  model: (typeof RamkaDemosBlock.Model.Type)['editorial'],
  h: DemosViewBuilder,
) => h.block(Editorial.embedView({ slotId: 'editorial', model }))
const renderModels = (model: (typeof RamkaDemosBlock.Model.Type)['models'], h: DemosViewBuilder) =>
  h.block(Models.embedView({ slotId: 'models', model }))

const makeView = () => {
  const body = createKeyedLazy()

  return RamkaDemosComposition.makeView.withInputs(
    ({ photos, routing, editorial, models }, inputs, h) =>
      inputs.only === 'photos-app'
        ? h.block(
            Photos.embedView({
              slotId: 'photos',
              model: photos,
              viewInputs: { only: inputs.only },
            }),
          )
        : h.section(
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
              body('photos', renderPhotos, [photos, h]),
              body('routing', renderRouting, [routing, h]),
              body('editorial', renderEditorial, [editorial, h]),
              body('models', renderModels, [models, h]),
            ],
          ),
  )
}

const plans = Effect.gen(function* () {
  const children = yield* RamkaDemosComposition.acquireChildren()

  return {
    children,
    init: RamkaDemosComposition.makeInit((href) => ({ model: {}, childInitContext: href })),
    update: RamkaDemosComposition.makeUpdate({}),
    view: makeView(),
  }
})
export const layer = RamkaDemosBlock.makeLayer(plans).pipe(
  Layer.provide(Layer.mergeAll(PhotosLayer, RoutingLayer, EditorialLayer, ModelsLayer)),
)
