import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { CardGroupRefs } from '../src/card.js'
import {
  Card,
  CardGroupBlock,
  CardHeader,
  CardTitle,
  CardButton,
  CardGroupRefsServerLayer,
  layer as CardLayer,
} from '../src/card.js'
import type { CarouselDotsResources } from '../src/carousel-dots.js'
import {
  CarouselDotsBlock,
  CarouselDotsResourcesServerLayer,
  layer as CarouselLayer,
} from '../src/carousel-dots.js'
import type { FileThumbnailResources } from '../src/file-thumbnail.js'
import {
  FileThumbnailBlock,
  FileThumbnailResourcesServerLayer,
  layer as FileLayer,
} from '../src/file-thumbnail.js'

export const CompanionOptions = Schema.Struct({ count: Schema.NumberFromString })

const Model = Schema.Struct({
  group: CardGroupBlock.Model,
  slides: CarouselDotsBlock.Model,
  file: FileThumbnailBlock.Model,
  lastSelected: Schema.Int,
})

const Message = defineMessageUnion({ Selected: {}, Change: {}, Resize: {} })

const CompanionFixtureKey = Symbol('CompanionFixture')

const effects = Block.makeEffectsContract<
  never,
  CardGroupRefs | CarouselDotsResources | FileThumbnailResources
>()

export const CompanionFixtureBlock = Block.make('CompanionFixture', {
  key: CompanionFixtureKey,
  InitArgs: Schema.Tuple([CompanionOptions]),
  effects,
  view: { kind: 'Document' },
  Model,
  Message,
})

const Group = CompanionFixtureBlock.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'group',
  init: { contextToArgs: () => [{ id: 'cards' }] },
})

const Slides = CompanionFixtureBlock.makeRequiredFieldBinding(CarouselDotsBlock, {
  field: 'slides',
  init: {
    contextToArgs: (config: typeof CompanionOptions.Type) => [
      { id: 'slides', count: config.count, value: 1 },
    ],
  },
}).withOutMessagePolicy({
  fold: CompanionFixtureBlock.makeOutMessageFold(CarouselDotsBlock, {
    ValueChanged: ({ value }) =>
      CompanionFixtureBlock.makeFieldsStep(() => ({ lastSelected: () => value })),
  }),
})

const File = CompanionFixtureBlock.makeRequiredFieldBinding(FileThumbnailBlock, {
  field: 'file',
  init: {
    contextToArgs: () => [
      { id: 'file', file: { id: 'doc', name: 'report.txt', type: 'text/plain' }, size: 64 },
    ],
  },
})

const FluidCompanionFixtureComposition = CompanionFixtureBlock.makeComposition({
  bindings: [Group, Slides, File],
})

const init = FluidCompanionFixtureComposition.makeInit((config: typeof CompanionOptions.Type) => ({
  model: { lastSelected: -1 },
  childInitContext: config,
}))

const update = FluidCompanionFixtureComposition.makeUpdate({
  Selected: CompanionFixtureBlock.makeNoopStep(),
  Change: Slides.requestConfigure({ config: { id: 'slides', count: 3, value: 2, progress: 0.5 } }),
  Resize: File.requestConfigure({
    file: { id: 'doc', name: 'report.txt', type: 'text/plain' },
    size: 96,
  }),
})

const view = FluidCompanionFixtureComposition.makeView((model, h) => ({
  title: 'Companion fixture',
  body: h.div(
    [],
    [
      h.block(
        Group.embedView({
          slotId: model.group.id,
          model: model.group,
          viewInputs: {
            count: 2,
            border: 'outlined',
            columns: 2,
            selectedIndex: 0,
            animateHighlight: (node) => node,
            children: (group) =>
              [0, 1].map((index) =>
                Card(
                  {
                    group,
                    index,
                    selected: index === 0,
                    label: `Card ${index}`,
                    onClick: Message.Selected(),
                    children: (context) => [
                      CardHeader(
                        {
                          ...context,
                          children: [CardTitle({ ...context, children: [`Title ${index}`] }, h)],
                        },
                        h,
                      ),
                      CardButton(
                        { children: ['Visit'], href: 'https://example.com', external: true },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ),
          },
        }),
      ),
      h.block(
        Slides.embedView({
          slotId: model.slides.id,
          model: model.slides,
          viewInputs: { animate: (node) => node, animateHighlight: (node) => node },
        }),
      ),
      h.block(
        File.embedView({ slotId: model.file.id, model: model.file, viewInputs: { radius: 3 } }),
      ),
    ],
  ),
}))

export const CompanionFixtureLayer = CompanionFixtureBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.mergeAll(CardLayer, CarouselLayer, FileLayer)),
  Layer.provide(
    Layer.mergeAll(
      CardGroupRefsServerLayer,
      CarouselDotsResourcesServerLayer,
      FileThumbnailResourcesServerLayer,
    ),
  ),
)
