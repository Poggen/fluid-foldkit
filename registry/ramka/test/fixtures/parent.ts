import { Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { childAttributes } from 'foldkit/html'
import {
  LightboxBlock,
  layer as LightboxLayer,
  Config,
  createHandle,
} from '@foldkit-visuals/ramka/lightbox'

const Message = defineMessageUnion({
  Added: {},
  OpenedThird: {},
  ToggledDirection: {},
  ToggledLoop: {},
  ToggledMotion: {},
  ConfiguredPreload: {},
  ToggledKeepMounted: {},
  ControlledOpen: {},
  ZoomViaBinding: {},
  AcceptedOpen: { open: Schema.Boolean },
})
export const AppKey = Symbol('FullRamkaDemo')
export const App = Block.make('FullRamkaDemo', {
  key: AppKey,
  Model: Schema.Struct({
    gallery: LightboxBlock.Model,
    samples: Schema.Natural,
    notices: Schema.Natural,
  }),
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: Block.makeEffectsContract<never, import('../../src/environment.js').Environment>(),
})
export const Gallery = App.makeRequiredFieldBinding(LightboxBlock, {
  field: 'gallery',
  init: {
    contextToArgs: () =>
      [
        {
          id: 'gallery',
          items: [
            {
              id: 'landscape',
              width: 1920,
              height: 1280,
              caption: 'Purple landscape — responsive SVG image',
              alt: 'Purple landscape',
            },
            {
              id: 'portrait',
              width: 640,
              height: 360,
              caption: 'Green landscape — video with poster',
              alt: 'Green landscape',
            },
            { id: 'chart', caption: 'Live HTML stays interactive while zoomed', alt: 'Live chart' },
            {
              id: 'detail',
              width: 1080,
              height: 1440,
              caption: 'Portrait image with zoom detail',
              alt: 'Golden portrait',
            },
          ],
          options: { keepMounted: true, preload: 4, viewTransition: 'default', loop: false },
        },
      ] satisfies [Config],
  },
}).withOutMessagePolicy({
  fold: App.makeOutMessageFold(LightboxBlock, {
    Changed: () => App.makeFieldsStep((model) => ({ notices: () => model.notices + 1 })),
    OpenChanged: () => App.makeFieldsStep((model) => ({ notices: () => model.notices + 1 })),
    ValueChanged: () => App.makeFieldsStep((model) => ({ notices: () => model.notices + 1 })),
    OpenChangeCompleted: App.makeNoopStep,
    ZoomChanged: App.makeNoopStep,
    Failed: App.makeNoopStep,
  }),
})
export const handle = createHandle(Gallery)
const Composition = App.makeComposition({ bindings: [Gallery] })
export const layer = App.makeLayer({
  init: Composition.makeInit(() => ({ model: { samples: 0, notices: 0 } })),
  update: Composition.makeUpdate({
    ZoomViaBinding: Gallery.requestZoom({ zoom: 2 }),
    Added: App.makeFieldsStep((model) => ({ samples: () => model.samples + 1 })),
    OpenedThird: handle.open(2, { triggerId: 'open-third' }),
    ToggledDirection: App.makeStep((model) =>
      Gallery.informOfOptions({
        options: {
          ...model.gallery.options,
          dir: model.gallery.options.dir === 'rtl' ? 'ltr' : 'rtl',
        },
      }),
    ),
    ToggledLoop: App.makeStep((model) =>
      Gallery.informOfOptions({
        options: { ...model.gallery.options, loop: !model.gallery.options.loop },
      }),
    ),
    ToggledMotion: App.makeStep((model) =>
      Gallery.informOfOptions({
        options: {
          ...model.gallery.options,
          viewTransition: model.gallery.options.viewTransition === false ? 'default' : false,
        },
      }),
    ),
    ConfiguredPreload: App.makeStep((model) =>
      Gallery.informOfOptions({
        options: { ...model.gallery.options, preload: model.gallery.options.preload === 0 ? 4 : 0 },
      }),
    ),
    ToggledKeepMounted: App.makeStep((model) =>
      Gallery.informOfOptions({
        options: { ...model.gallery.options, keepMounted: !model.gallery.options.keepMounted },
      }),
    ),
    ControlledOpen: Gallery.informOfControl({ open: Option.some(false), value: Option.none() }),
    AcceptedOpen: App.makeStep.fromMessage(({ open }) => Gallery.informOfOpen({ open })),
  }),
  view: Composition.makeView((model, h) => {
    const add = childAttributes([h.OnClick(Message.Added())])
    const zoomBinding = childAttributes([h.OnClick(Message.ZoomViaBinding())])
    return {
      title: 'Ramka Foldkit gallery',
      body: h.main(
        [],
        [
          h.h1([], ['Ramka, native Foldkit']),
          h.p(
            [],
            [
              'Pointer, keyboard, native scroll snap, pinch, pan and pull. Four kinds of live media.',
            ],
          ),
          h.div(
            [h.Class('settings')],
            [
              h.button(
                [h.Id('open-third'), h.OnClick(Message.OpenedThird())],
                ['Open live chart through Binding'],
              ),
              h.button(
                [h.Id('direction'), h.OnClick(Message.ToggledDirection())],
                [`Direction: ${model.gallery.options.dir ?? 'ltr'}`],
              ),
              h.button(
                [h.Id('loop'), h.OnClick(Message.ToggledLoop())],
                [`Loop: ${model.gallery.options.loop ?? false}`],
              ),
              h.button(
                [h.Id('motion'), h.OnClick(Message.ToggledMotion())],
                [`View transitions: ${model.gallery.options.viewTransition !== false}`],
              ),
              h.button(
                [h.Id('keep-mounted'), h.OnClick(Message.ToggledKeepMounted())],
                [`Keep mounted: ${model.gallery.options.keepMounted}`],
              ),
              h.button(
                [h.Id('preload'), h.OnClick(Message.ConfiguredPreload())],
                [`Preload: ${model.gallery.options.preload}`],
              ),
            ],
          ),
          h.output(
            [h.Id('model-state')],
            [
              JSON.stringify({
                open: model.gallery.open,
                index: model.gallery.index,
                phase: model.gallery.phase,
                zoom: model.gallery.zoom,
                x: model.gallery.x,
                y: model.gallery.y,
                notices: model.notices,
              }),
            ],
          ),
          h.block(
            Gallery.embedView({
              slotId: 'gallery',
              model: model.gallery,
              viewInputs: {
                label: 'Media viewer',
                carouselLabel: 'Gallery media',
                thumbnailsLabel: 'Choose media',
                trigger: (index) => [
                  h.img([
                    h.Src(`/media-${index === 3 ? 2 : index === 2 ? 0 : index}.svg`),
                    h.Alt(`Open item ${index + 1}`),
                  ]),
                ],
                thumbnail: (index) => [
                  h.img([
                    h.Src(`/media-${index === 3 ? 2 : index === 2 ? 0 : index}.svg`),
                    h.Alt(''),
                  ]),
                ],
                item: (index) =>
                  index === 2
                    ? h.section(
                        [h.Id('live-chart'), h.Class('chart')],
                        [
                          h.h2([], ['Live activity']),
                          h.p(
                            [h.Id('samples'), h.AriaLive('polite')],
                            [`Samples: ${model.samples}`],
                          ),
                          h.div(
                            [
                              h.Class('bars'),
                              h.Role('img'),
                              h.AriaLabel(`Chart with ${model.samples} samples`),
                            ],
                            [30, 60, 45, 90].map((v, i) =>
                              h.div(
                                [
                                  h.Style({
                                    height: `${20 + ((v + model.samples * (i + 1)) % 75)}%`,
                                  }),
                                ],
                                [],
                              ),
                            ),
                          ),
                          h.button([h.Id('add'), ...add], ['Add sample']),
                          h.button(
                            [h.Id('zoom-binding'), ...zoomBinding],
                            ['Zoom through Binding'],
                          ),
                          h.input([
                            h.Id('annotation'),
                            h.AriaLabel('Chart annotation'),
                            h.Placeholder('Annotate the live chart'),
                          ]),
                        ],
                      )
                    : index === 1
                      ? h.video(
                          [
                            h.Id('video'),
                            h.Controls(true),
                            h.Poster('/media-1.svg'),
                            h.Src('/sample.mp4'),
                            h.Playsinline(true),
                            h.Attribute('preload', 'metadata'),
                          ],
                          [],
                        )
                      : h.picture(
                          [],
                          [
                            h.source([
                              h.Attribute('media', '(min-width: 800px)'),
                              h.Srcset(`/media-${index === 3 ? 2 : 0}.svg 1920w`),
                              h.Sizes('90vw'),
                            ]),
                            h.img([
                              h.Id(`image-${index}`),
                              h.Src(`/media-${index === 3 ? 2 : 0}.svg`),
                              h.Srcset(`/media-${index === 3 ? 2 : 0}.svg 1920w`),
                              h.Sizes('90vw'),
                              h.Alt(index === 0 ? 'Purple landscape' : 'Golden portrait'),
                              h.Draggable(false),
                            ]),
                          ],
                        ),
              },
            }),
          ),
          h.button([h.Id('after')], ['After gallery']),
        ],
      ),
    }
  }),
}).pipe(Layer.provide(LightboxLayer))
