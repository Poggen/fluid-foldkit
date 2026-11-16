import { Effect, Layer, Option, Queue, Schema, Schedule, Stream } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { childAttributes } from 'foldkit/html'
import {
  CarouselDotsBlock as Carousel,
  CarouselDotsResources,
  CarouselObservation,
  layer as CarouselLayer,
} from '../src/carousel-dots.js'
import type { CarouselDotsConfig } from '../src/carousel-dots.js'
import { createTargetMotionScope } from '../src/motion-target.js'
import { hoverHighlightAnimation } from '../src/hover-highlight.js'

const Config = Carousel.InMessage.RequestedConfigure.fields.config

const MouseOverride = Schema.Literals(['none', 'enter', 'leave', 'move', 'click', 'pointerLeave'])

const Model = Schema.Struct({
  mouseOverride: MouseOverride,
  mouseEvents: Schema.Array(MouseOverride),
  carousel: Carousel.Model,
  mounted: Schema.Boolean,
  outputs: Schema.Array(Schema.NumberFromString),
})

const Json = Schema.fromJsonString(Schema.toCodecJson(Model))

const ConfigJson = Schema.fromJsonString(Schema.toCodecJson(Config))

const Message = defineMessageUnion({
  Configure: { config: Config },
  ToggleMount: {},
  ChangeMouseOverride: { value: MouseOverride },
  ObservedMouse: { value: MouseOverride },
})

const Key = Symbol('CarouselProgram')

const effects = Block.makeEffectsContract<never, CarouselDotsResources>()

const Parent = Block.make('CarouselProgram', {
  key: Key,
  Model,
  Message,
  effects,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element' },
})

const Slides = Parent.makeRequiredFieldBinding(Carousel, {
  field: 'carousel',
  init: { contextToArgs: (config: CarouselDotsConfig) => [config] },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(Carousel, {
    ValueChanged: ({ value }) =>
      Parent.makeFieldsStep(() => ({ outputs: (values) => [...values, value] })),
  }),
})

const Composition = Parent.makeComposition({ bindings: [Slides] })

const init = Composition.makeInit((config: CarouselDotsConfig) => ({
  model: { outputs: [], mounted: true, mouseOverride: 'none', mouseEvents: [] },
  childInitContext: config,
}))

const update = Composition.makeUpdate({
  ChangeMouseOverride: Parent.makeStep(
    (model, { value }: typeof Message.ChangeMouseOverride.Type) => ({
      model: { ...model, mouseOverride: value },
    }),
  ),
  ObservedMouse: Parent.makeStep((model, { value }: typeof Message.ObservedMouse.Type) => ({
    model: { ...model, mouseEvents: [...model.mouseEvents, value] },
  })),
  ToggleMount: Parent.makeFieldsStep(() => ({ mounted: (value) => !value })),
  Configure: Parent.makeStep((_model, { config }: typeof Message.Configure.Type) =>
    Slides.requestConfigure({ config }),
  ),
})

const makeLayer = (motion: ReturnType<typeof createTargetMotionScope>) => {
  const view = Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.input([
          h.Id('carousel-config'),
          h.OnInput((value) => Message.Configure({ config: Schema.decodeSync(ConfigJson)(value) })),
        ]),
        h.input([
          h.Id('carousel-mouse-override'),
          h.OnInput((value) =>
            Message.ChangeMouseOverride({ value: Schema.decodeUnknownSync(MouseOverride)(value) }),
          ),
        ]),
        h.button([h.Id('carousel-mount'), h.OnClick(Message.ToggleMount())], ['Toggle mount']),
        h.pre([h.Id('carousel-snapshot')], [Schema.encodeSync(Json)(model)]),
        model.mounted
          ? h.block(
              Slides.embedView({
                slotId: model.carousel.id,
                model: model.carousel,
                viewInputs: {
                  attributes: childAttributes([
                    ...(model.mouseOverride === 'enter'
                      ? [h.OnMouseEnter(Message.ObservedMouse({ value: 'enter' }))]
                      : []),
                    ...(model.mouseOverride === 'leave'
                      ? [h.OnMouseLeave(Message.ObservedMouse({ value: 'leave' }))]
                      : []),
                    ...(model.mouseOverride === 'move'
                      ? [h.OnMouseMove(Message.ObservedMouse({ value: 'move' }))]
                      : []),
                    ...(model.mouseOverride === 'click'
                      ? [h.OnClick(Message.ObservedMouse({ value: 'click' }))]
                      : []),
                    ...(model.mouseOverride === 'pointerLeave'
                      ? [
                          h.OnPointerLeave(() =>
                            Option.some(Message.ObservedMouse({ value: 'pointerLeave' })),
                          ),
                        ]
                      : []),
                  ]),
                  animate: motion.node,
                  animateHighlight: hoverHighlightAnimation(motion),
                },
              }),
            )
          : null,
      ],
    ),
  )

  const implementation = { init, update, view }

  return Parent.makeLayer<typeof implementation>(implementation).pipe(Layer.provide(CarouselLayer))
}

export const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 100, schedule: Schedule.spaced('10 millis') }))

export const acquireCarousel = (
  config: CarouselDotsConfig,
  notifications: Array<number>,
  resourcesLayer: Layer.Layer<CarouselDotsResources>,
) =>
  Effect.gen(function* acquireCarouselProgram() {
    const motion = createTargetMotionScope('carousel-program')
    const layer = makeLayer(motion)

    const frames = yield* Queue.unbounded<typeof CarouselObservation.Frame.Type>()

    let listening = false

    const resources = Layer.effect(
      CarouselDotsResources,
      Effect.map(CarouselDotsResources, (base) =>
        CarouselDotsResources.of({
          ...base,
          preference: () =>
            Stream.succeed(CarouselObservation.Reduced({ value: config.reducedMotion ?? false })),
          clock: (_element, states) =>
            states.pipe(
              Stream.switchMap((state) =>
                state === 'Live'
                  ? Stream.fromQueue(frames).pipe(
                      Stream.onStart(
                        Effect.sync(() => {
                          listening = true
                        }),
                      ),
                    )
                  : Stream.never,
              ),
            ),
        }),
      ),
    ).pipe(Layer.provide(resourcesLayer))

    const host = document.createElement('div')
    const container = document.createElement('div')

    container.id = 'carousel-program-root'
    host.append(container)
    document.body.append(host)

    const program = Runtime.embed(
      Program.makeElement({
        block: Parent,
        layer,
        container,
        Flags: Config,
        flags: Effect.succeed(config),
      }).provide({ services: Layer.merge(resources, motion.layer) }),
    )

    yield* Effect.addFinalizer(() =>
      Effect.promise(program.dispose).pipe(
        Effect.andThen(() =>
          Effect.sync(() => {
            host.remove()
          }),
        ),
      ),
    )

    const snapshot = () =>
      Schema.decodeSync(Json)(host.querySelector('#carousel-snapshot')?.textContent ?? '')

    yield* eventually(() => {
      const model = snapshot()

      if (
        !model.carousel.preferenceReady ||
        (model.carousel.clock.autoplay && !model.carousel.clock.reducedMotion && !listening)
      ) {
        throw new Error('Carousel resources not acquired')
      }
    })

    return {
      snapshot,
      root: () => {
        const root = host.querySelector<HTMLElement>('[role="group"]')
        if (root === null) throw new Error('Missing carousel root')
        return root
      },
      mouseOverride: (value: typeof MouseOverride.Type) =>
        Effect.gen(function* changeOverride() {
          const input = host.querySelector<HTMLInputElement>('#carousel-mouse-override')
          if (input === null) throw new Error('Missing mouse override control')
          input.value = value
          input.dispatchEvent(new Event('input', { bubbles: true }))
          yield* eventually(() => {
            if (snapshot().mouseOverride !== value) throw new Error('Mouse override not accepted')
          })
        }),
      notifications,
      fill: () =>
        host.querySelector<HTMLElement>('[aria-current="true"] [aria-hidden="true"]')?.style
          .transform,
      toggleMount: () =>
        Effect.sync(() => {
          const button = host.querySelector<HTMLButtonElement>('#carousel-mount')
          if (button === null) throw new Error('Missing carousel mount control')
          button.click()
        }),
      frame: (elapsed: number) => Queue.offer(frames, CarouselObservation.Frame({ elapsed })),
      configure: (next: CarouselDotsConfig) =>
        Schema.encodeEffect(ConfigJson)(next).pipe(
          Effect.flatMap((encoded) =>
            Effect.sync(() => {
              const input = host.querySelector<HTMLInputElement>('#carousel-config')

              if (input === null) {
                throw new Error('Missing carousel control')
              }

              input.value = encoded
              input.dispatchEvent(new Event('input', { bubbles: true }))
            }),
          ),
        ),
      click: (index: number) =>
        Effect.sync(() => {
          const button = host.querySelector<HTMLButtonElement>(
            `[aria-label="Go to slide ${index + 1}"]`,
          )

          if (button === null) {
            throw new Error('Missing carousel slide')
          }

          button.click()
        }),
    }
  })
