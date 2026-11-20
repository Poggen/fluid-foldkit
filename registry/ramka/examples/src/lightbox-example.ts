import purpleLandscape from './assets/media-0.svg?url'
import greenLandscape from './assets/media-1.svg?url'
import goldenPortrait from './assets/media-2.svg?url'
import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  LightboxBlock,
  type Config,
  Environment,
  layer as LightboxLayer,
} from '@foldkit-visuals/ramka/lightbox'

const media = [purpleLandscape, greenLandscape, goldenPortrait]
const key = Symbol('RamkaExample')
export const RamkaExampleBlock = Block.make('RamkaExample', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ lightbox: LightboxBlock.Model }),
  Message: defineMessageUnion({}),
  effects: Block.makeEffectsContract<never, Environment>(),
  view: { kind: 'Element' },
})
const Lightbox = RamkaExampleBlock.makeRequiredFieldBinding(LightboxBlock, {
  field: 'lightbox',
  init: {
    contextToArgs: () =>
      [
        {
          id: 'ramka-showcase',
          items: [
            {
              id: 'landscape',
              width: 1920,
              height: 1280,
              caption: 'Purple landscape',
              alt: 'Purple landscape',
            },
            {
              id: 'forest',
              width: 1920,
              height: 1280,
              caption: 'Green landscape',
              alt: 'Green landscape',
            },
            {
              id: 'portrait',
              width: 1080,
              height: 1440,
              caption: 'Golden portrait',
              alt: 'Golden portrait',
            },
          ],
          options: { loop: true, viewTransition: 'default' },
        },
      ] satisfies [Config],
  },
}).withOutMessagePolicy({
  fold: RamkaExampleBlock.makeOutMessageFold(LightboxBlock, {
    Changed: RamkaExampleBlock.makeNoopStep,
    OpenChanged: RamkaExampleBlock.makeNoopStep,
    ValueChanged: RamkaExampleBlock.makeNoopStep,
    OpenChangeCompleted: RamkaExampleBlock.makeNoopStep,
    ZoomChanged: RamkaExampleBlock.makeNoopStep,
    Failed: RamkaExampleBlock.makeNoopStep,
  }),
})
const RamkaExampleComposition = RamkaExampleBlock.makeComposition({
  bindings: [Lightbox],
})
export const layer = RamkaExampleBlock.makeLayer({
  init: RamkaExampleComposition.makeInit(() => ({ model: {} })),
  update: RamkaExampleComposition.makeUpdate({}),
  view: RamkaExampleComposition.makeView((model, h) =>
    h.div(
      [h.Class('ramka-example')],
      [
        h.p([], ['Open an image. Swipe, zoom, or use the arrow keys to explore.']),
        h.block(
          Lightbox.embedView({
            slotId: 'ramka-lightbox',
            model: model.lightbox,
            viewInputs: {
              label: 'Ramka image gallery',
              carouselLabel: 'Gallery images',
              thumbnailsLabel: 'Choose image',
              trigger: (index) => [
                h.img([h.Src(media[index] ?? purpleLandscape), h.Alt(`Open image ${index + 1}`)]),
              ],
              thumbnail: (index) => [h.img([h.Src(media[index] ?? purpleLandscape), h.Alt('')])],
              item: (index) =>
                h.img([
                  h.Src(media[index] ?? purpleLandscape),
                  h.Alt(model.lightbox.items[index]?.alt ?? ''),
                  h.Draggable(false),
                ]),
            },
          }),
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(LightboxLayer))
