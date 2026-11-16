import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
import { resolvePresentation } from './presentation.js'
// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { HoverBlock, layer as HoverLayer } from './hover.js'
import type { HoverConfig } from './hover.js'
import { HoverHighlightBlock, layer as HighlightLayer } from './hover-highlight.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import type { Presentation } from './presentation.js'
import type { TargetMotionOptions } from './motion-target.js'
import {
  CarouselClock,
  advanceCarousel,
  carouselClock,
  carouselFillAt,
} from './carousel-dots-state.js'
import type { CarouselDotsConfig } from './carousel-dots-state.js'
import { CarouselDotsResources } from './carousel-dots-resources.js'
import { CarouselPaint, CarouselPresentation } from './carousel-dots-progress.js'

export {
  CarouselClock,
  advanceCarousel,
  carouselClock,
  carouselFillAt,
} from './carousel-dots-state.js'

export type { CarouselDotsAutoplay, CarouselDotsConfig } from './carousel-dots-state.js'

export {
  CarouselDotsResources,
  CarouselDotsResourcesServerLayer,
  CarouselDotsResourcesDefaultLayer,
  makeCarouselDotsResourcesLayer,
  CarouselObservation,
} from './carousel-dots-resources.js'

export type { CarouselProgress, CarouselCapabilities } from './carousel-dots-resources.js'

const Model = Schema.Struct({
  id: Schema.String,
  clock: CarouselClock,
  paintRevision: Schema.Natural,
  presentationGeneration: Schema.Natural,
  initialProgress: Schema.NumberFromString,
  preferenceReady: Schema.Boolean,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
})

type Model = typeof Model.Type

const Message = defineMessageUnion({
  Frame: { elapsed: Schema.Finite },
  Reduced: { value: Schema.Boolean },
  Progress: { value: Schema.NumberFromString },
  Clicked: { index: Schema.Int },
  Notified: {},
  Painted: {},
  Unmounted: {},
})

const OutMessage = defineMessageUnion({ ValueChanged: { value: Schema.NumberFromString } })

const Config = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  count: Schema.NumberFromString,
  value: Schema.NumberFromString,
  resourceIdentity: Schema.optionalKey(Schema.String),
  autoplay: Schema.optionalKey(
    Schema.Union([
      Schema.Boolean,
      Schema.Struct({
        duration: Schema.optionalKey(Schema.NumberFromString),
        paused: Schema.optionalKey(Schema.Boolean),
        loop: Schema.optionalKey(Schema.Boolean),
      }),
    ]),
  ),
  progress: Schema.optionalKey(Schema.NumberFromString),
  externalProgress: Schema.optionalKey(Schema.Boolean),
  reducedMotion: Schema.optionalKey(Schema.Boolean),
})

export const InMessage = defineInMessageUnion({
  RequestedConfigure: { config: Config },
  RequestedHoverMode: { mode: HoverMode },
})

export const CarouselDotsKey = Symbol('CarouselDots')

const effects = Block.makeEffectsContract<never, CarouselDotsResources>()

export const CarouselDotsBlock = Block.make('CarouselDots', {
  key: CarouselDotsKey,
  InitArgs: Schema.Tuple([Config]),
  Model,
  Message,
  OutMessage,
  InMessage,
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<CarouselDotsProps>() },
})

const Observe = CarouselDotsBlock.makeMountStream('Observe', {
  args: { id: Schema.String, identity: Schema.String },
  messages: [Message.Progress],
  *handler() {
    const resources = yield* CarouselDotsResources

    return ({ id, identity, element, viewStateChanges }) =>
      resources.observe(id, identity, element.parentElement ?? element, viewStateChanges)
  },
})

const Preference = CarouselDotsBlock.makeMountStream('Preference', {
  messages: [Message.Reduced],
  *handler() {
    const resources = yield* CarouselDotsResources

    return ({ element, viewStateChanges }) => resources.preference(element, viewStateChanges)
  },
})

const Clock = CarouselDotsBlock.makeMountStream('Clock', {
  messages: [Message.Frame],
  *handler() {
    const resources = yield* CarouselDotsResources

    return ({ element, viewStateChanges }) => resources.clock(element, viewStateChanges)
  },
})

const Notify = CarouselDotsBlock.makeCommand('Notify', {
  args: { id: Schema.String, identity: Schema.String, index: Schema.NumberFromString },
  messages: [Message.Notified],
  *handler() {
    const resources = yield* CarouselDotsResources

    return ({ id, identity, index }) =>
      resources.notify(id, identity, index).pipe(Effect.as(Message.Notified()))
  },
})

export const Paint = CarouselDotsBlock.makeCommand('Paint', {
  args: { snapshot: CarouselPaint },
  messages: [Message.Painted],
  *handler() {
    const resources = yield* CarouselDotsResources
    return ({ snapshot }) =>
      resources[CarouselPresentation].paint(snapshot).pipe(Effect.as(Message.Painted()))
  },
})

const paintSnapshot = (model: Model): CarouselPaint => ({
  id: model.id,
  identity: model.clock.resourceIdentity,
  index: model.clock.value,
  generation: model.presentationGeneration,
  revision: model.paintRevision,
  progress: model.clock.progress,
})

const Highlight = CarouselDotsBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: CarouselDotsConfig) => [
      {
        id: `${config.id}-highlight`,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
})

const Hover = CarouselDotsBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: CarouselDotsConfig): [HoverConfig] => [
      {
        id: config.id,
        axis: 'x',
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: CarouselDotsBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      CarouselDotsBlock.makeStep((model) =>
        Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
      ),
  }),
})

const CarouselDotsComposition = CarouselDotsBlock.makeComposition({
  bindings: [Hover, Highlight],
  mounts: [Observe, Preference, Clock],
})

const init = CarouselDotsComposition.makeInit((config: CarouselDotsConfig) => ({
  model: {
    id: config.id,
    clock: carouselClock(config),
    preferenceReady: false,
    paintRevision: 0,
    presentationGeneration: 0,
    initialProgress: carouselClock(config).progress,
  },
  childInitContext: config,
}))

const update = CarouselDotsComposition.makeUpdate({
  Frame: (model, { elapsed }) => {
    const next = advanceCarousel(model.clock, elapsed)

    if (
      next.requested === null &&
      (next.clock === model.clock ||
        (Object.is(next.clock.progress, model.clock.progress) &&
          next.clock.waiting === model.clock.waiting))
    ) {
      return { model }
    }

    const painted = modifyFields(model, {
      clock: () => next.clock,
      paintRevision: (value) => value + 1,
    })
    const updated = { model: painted, commands: [Paint({ snapshot: paintSnapshot(painted) })] }

    if (next.requested === null) {
      return updated
    }

    return {
      ...updated,
      outMessage: OutMessage.ValueChanged({ value: next.requested }),
      commands: [
        ...updated.commands,
        Notify({ id: model.id, identity: model.clock.resourceIdentity, index: next.requested }),
      ],
    }
  },
  Reduced: (model, { value }) => ({
    model: model.preferenceReady
      ? model
      : modifyFields(model, {
          clock: (clock) => modifyFields(clock, { reducedMotion: () => value }),
          preferenceReady: () => true,
        }),
  }),
  Progress: (model, { value }) => {
    const painted = modifyFields(model, {
      clock: (clock) => modifyFields(clock, { progress: () => value }),
      paintRevision: (value) => value + 1,
    })
    return { model: painted, commands: [Paint({ snapshot: paintSnapshot(painted) })] }
  },
  Clicked: (model, { index }) =>
    Number.isSafeInteger(model.clock.count) && index >= 0 && index < model.clock.count
      ? {
          model,
          outMessage: OutMessage.ValueChanged({ value: index }),
          commands: [Notify({ id: model.id, identity: model.clock.resourceIdentity, index })],
        }
      : { model },
  Notified: CarouselDotsBlock.makeNoopStep(),
  Painted: CarouselDotsBlock.makeNoopStep(),
  Unmounted: (model) => ({
    model: modifyFields(model, {
      paintRevision: (value) => value + 1,
      presentationGeneration: (value) => value + 1,
      initialProgress: () => (model.clock.autoplay ? 0 : model.clock.progress),
      preferenceReady: () => false,
      clock: () =>
        modifyFields(model.clock, {
          waiting: () => false,
          progress: () => (model.clock.autoplay ? 0 : model.clock.progress),
        }),
    }),
  }),
})

export interface CarouselDotsProps extends Presentation {
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly getLabel?: (index: number) => string
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  readonly animateHighlight: HoverHighlightViewInputs['animate']
}

const makeView = (resources: typeof CarouselDotsResources.Service) =>
  CarouselDotsComposition.makeView.withInputs<CarouselDotsProps>((model, inputs, h) => {
    const round =
      resolvePresentation(inputs).shape.variant === 'sharp' ? 'rounded-none' : 'rounded-full'
    const { clock } = model
    const reduced = clock.reducedMotion

    return h.block(
      Hover.embedView({
        slotId: model.hover.id,
        model: model.hover,
        viewInputs: {
          className: cn('relative flex w-fit items-center', inputs.className),
          // Source spreads caller props after hover.handlers: replace only the matching mouse event.
          mouseHandlers: {
            enter: !inputs.attributes?.some(({ attribute }) => attribute._tag === 'OnMouseEnter'),
            leave: !inputs.attributes?.some(({ attribute }) => attribute._tag === 'OnMouseLeave'),
            move: !inputs.attributes?.some(({ attribute }) => attribute._tag === 'OnMouseMove'),
            click: !inputs.attributes?.some(({ attribute }) => attribute._tag === 'OnClick'),
          },
          attributes: [
            ...childAttributes([
              h.Role('group'),
              h.AriaLabel('Slides'),
              h.OnUnmount(Message.Unmounted()),
            ]),
            ...(inputs.attributes ?? []),
          ],
          content: (context) => [
            model.preferenceReady && clock.autoplay && !reduced
              ? h.keyed('span')('clock', [h.Class('contents'), h.OnMount(Clock())])
              : null,
            h.keyed('span')('preference', [h.Class('contents'), h.OnMount(Preference())]),
            h.keyed('span')(`resource:${clock.resourceIdentity}`, [
              h.Class('contents'),
              h.OnMount(Observe({ id: model.id, identity: clock.resourceIdentity })),
            ]),
            h.block(
              Highlight.embedView({
                slotId: model.highlight.id,
                model: model.highlight,
                viewInputs: {
                  animate: inputs.animateHighlight,
                  className: round,
                  mode: model.hover.mode,
                },
              }),
            ),
            ...Array.from({ length: clock.count }, (_, index) => {
              const current = index === clock.value

              return h.keyed('button')(
                String(index),
                [
                  h.Type('button'),
                  h.OnClick(Message.Clicked({ index })),
                  h.AriaLabel(inputs.getLabel?.(index) ?? `Go to slide ${index + 1}`),
                  ...(current ? [h.AriaCurrent('true')] : []),
                  ...context.itemAttributes(index),
                  h.Class(
                    `relative z-10 flex items-center ${round} p-1.5 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]`,
                  ),
                ],
                [
                  inputs.animate(
                    h.span(
                      [
                        h.Class(cn(`relative block overflow-hidden ${round}`)),
                        h.Style({
                          height: '6px',
                          backgroundColor:
                            'color-mix(in oklab, var(--foreground), transparent 85%)',
                        }),
                      ],
                      [
                        current
                          ? inputs.animate(
                              h.span([
                                h.Class(cn(`absolute inset-0 ${round}`)),
                                h.AriaHidden(true),
                                h.Style({
                                  backgroundColor:
                                    'color-mix(in oklab, var(--foreground), transparent 60%)',
                                  transform: carouselFillAt(model.initialProgress),
                                }),
                              ]),
                              {
                                initial: false,
                                animate: {},
                                resource: resources[CarouselPresentation].resource(
                                  paintSnapshot(model),
                                ),
                              },
                            )
                          : null,
                      ],
                    ),
                    {
                      initial: false,
                      animate: { width: current ? 24 : 6 },
                      transition: reduced ? { duration: 0 } : spring.moderate,
                    },
                  ),
                ],
              )
            }),
          ],
        },
      }),
    )
  })

const inMessageUpdate = CarouselDotsComposition.makeInMessageUpdate({
  RequestedHoverMode: CarouselDotsBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Hover.requestConfigure({
        options: { mode, axis: 'x', nearest: false, gapClick: true, maxDistance: Infinity },
      }),
  ),
  RequestedConfigure: (model, { config }) => {
    const clock = carouselClock(config)
    const hasProgress = config.progress !== undefined

    const restart =
      !Object.is(model.clock.value, clock.value) || model.clock.autoplay !== clock.autoplay

    const generationChanged =
      restart ||
      model.clock.resourceIdentity !== clock.resourceIdentity ||
      (hasProgress && !Object.is(model.clock.progress, clock.progress))
    const painted = modifyFields(model, {
      paintRevision: (value) => value + 1,
      presentationGeneration: () => model.presentationGeneration + (generationChanged ? 1 : 0),
      initialProgress: () => (generationChanged ? clock.progress : model.initialProgress),
      clock: () =>
        modifyFields(clock, {
          reducedMotion: () =>
            model.preferenceReady ? model.clock.reducedMotion : clock.reducedMotion,
          progress: () =>
            hasProgress || restart || (!clock.autoplay && !clock.externalProgress)
              ? clock.progress
              : model.clock.progress,
          waiting: () => (restart ? false : model.clock.waiting),
        }),
    })
    return { model: painted, commands: [Paint({ snapshot: paintSnapshot(painted) })] }
  },
})

export const layer = Layer.unwrap(
  Effect.map(CarouselDotsResources, (resources) =>
    CarouselDotsBlock.makeLayer({
      init,
      update,
      inMessageUpdate,
      view: makeView(resources),
      EffectsLayer: Layer.mergeAll(
        Observe.layer,
        Preference.layer,
        Clock.layer,
        Notify.layer,
        Paint.layer,
      ),
    }).pipe(Layer.provide(Layer.merge(HoverLayer, HighlightLayer))),
  ),
)
