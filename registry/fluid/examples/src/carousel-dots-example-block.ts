import { Button, Input } from '@foldkit/ui'
import { modifyFields } from 'foldkit/struct'
import { Boolean, Number as EffectNumber } from 'effect'
import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import { motionValue } from 'motion-dom'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  CarouselDotsBlock,
  makeCarouselDotsResourcesLayer,
  layer as CarouselLayer,
} from '@foldkit-visuals/fluid/carousel-dots'
import type {
  CarouselDotsConfig,
  CarouselDotsResources,
} from '@foldkit-visuals/fluid/carousel-dots'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'

const Mode = Schema.Literals(['static', 'autoplay', 'progress', 'external'])
const Model = Schema.Struct({
  dots: CarouselDotsBlock.Model,
  mode: Mode,
  isPaused: Schema.Boolean,
  isLoop: Schema.Boolean,
  duration: Schema.Number,
  progress: Schema.Number,
  isHold: Schema.Boolean,
  maybePending: Schema.Option(Schema.Number),
  requests: Schema.Natural,
  isMounted: Schema.Boolean,
  isSecondSource: Schema.Boolean,
})
const Message = defineMessageUnion({
  ClickedMode: { mode: Mode },
  ClickedPause: {},
  ClickedLoop: {},
  ClickedDuration: {},
  UpdatedProgress: { value: Schema.String },
  ClickedNext: {},
  ClickedCount: {},
  ClickedHold: {},
  ClickedAccept: {},
  ClickedMount: {},
  ClickedReplaceSource: {},
  CompletedSetProgress: {},
})
const initialConfig = { ...exampleHoverConfig, id: 'carousel-dots', count: 4, value: 0 }
export const CarouselDotsExampleKey = Symbol('CarouselDotsExample')
export const CarouselDotsExampleBlock = Block.make('CarouselDotsExample', {
  key: CarouselDotsExampleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  effects: Block.makeEffectsContract<never, CarouselDotsResources>(),
  view: { kind: 'Element' },
})
const Root = CarouselDotsExampleBlock
const configOf: (model: Model) => CarouselDotsConfig = (model: Model) => ({
  ...exampleHoverConfig,
  id: model.dots.id,
  count: model.dots.clock.count,
  value: model.dots.clock.value,
  autoplay:
    model.mode !== 'static'
      ? { duration: model.duration, paused: model.isPaused, loop: model.isLoop }
      : false,
  externalProgress: model.mode === 'external',
  resourceIdentity:
    model.mode === 'external' ? (model.isSecondSource ? 'second' : 'first') : 'local',
  ...(model.mode === 'progress' ? { progress: model.progress } : {}),
})
const Dots = Root.makeRequiredFieldBinding(CarouselDotsBlock, {
  field: 'dots',
  init: { contextToArgs: () => [initialConfig] },
})
const DotsPolicy = Dots.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(CarouselDotsBlock, {
    ValueChanged: ({ value }) =>
      Root.makeStep((model) =>
        Update.combineSteps([
          Root.makeFieldsStep(() => ({
            requests: EffectNumber.increment,
            maybePending: () => (model.isHold ? Option.some(value) : Option.none()),
          })),
          model.isHold
            ? Root.makeNoopStep()
            : Dots.requestConfigure({ config: { ...configOf(model), value } }),
        ]),
      ),
  }),
})
const composition = Root.makeComposition({ bindings: [DotsPolicy] })
const init = composition.makeInit(() => ({
  model: {
    mode: 'static',
    isPaused: false,
    isLoop: true,
    duration: 3000,
    progress: 0.4,
    isHold: false,
    maybePending: Option.none(),
    requests: 0,
    isMounted: true,
    isSecondSource: false,
  },
}))
const configure = (patch: Partial<Omit<Model, 'dots'>>) =>
  Root.makeStep((model) => {
    const next = modifyFields(model, {
      mode: (value) => patch.mode ?? value,
      isPaused: (value) => patch.isPaused ?? value,
      isLoop: (value) => patch.isLoop ?? value,
      duration: (value) => patch.duration ?? value,
      progress: (value) => patch.progress ?? value,
      isSecondSource: (value) => patch.isSecondSource ?? value,
    })
    return Update.combineSteps([
      Root.makeFieldsStep(() => ({
        mode: () => next.mode,
        isPaused: () => next.isPaused,
        isLoop: () => next.isLoop,
        duration: () => next.duration,
        progress: () => next.progress,
        isSecondSource: () => next.isSecondSource,
      })),
      Dots.requestConfigure({ config: configOf(next) }),
    ])
  })

export const createCarouselDotsExample = () => {
  const motion = createTargetMotionScope('carousel-dots-example')
  const first = motionValue(0.25)
  const second = motionValue(0.75)
  const resources = makeCarouselDotsResourcesLayer((_id, identity) =>
    identity === 'first' ? { progress: first } : identity === 'second' ? { progress: second } : {},
  )
  const SetProgress = Root.makeCommand('SetProgress', {
    args: { value: Schema.Finite, second: Schema.Boolean },
    messages: [Message.CompletedSetProgress],
    *handler() {
      return ({ value, second: useSecond }) =>
        Effect.sync(() => {
          const source = useSecond ? second : first
          source.set(value)
          return Message.CompletedSetProgress()
        })
    },
  })
  const update = composition.makeUpdate({
    ClickedMode: Root.makeStep((_model, { mode }: ClickedMode) => configure({ mode })),
    ClickedPause: Root.makeStep((model) => configure({ isPaused: !model.isPaused })),
    ClickedLoop: Root.makeStep((model) => configure({ isLoop: !model.isLoop })),
    ClickedDuration: Root.makeStep((model) =>
      configure({ duration: model.duration === 3000 ? 1000 : 3000 }),
    ),
    UpdatedProgress: Root.makeStep((model, { value }: Progress) =>
      Update.combineSteps([
        configure({ progress: Number(value) }),
        Root.makeCommandsStep(() => [
          SetProgress({ value: Number(value), second: model.isSecondSource }),
        ]),
      ]),
    ),
    CompletedSetProgress: Root.makeNoopStep(),
    ClickedReplaceSource: Root.makeStep((model) =>
      configure({ isSecondSource: !model.isSecondSource }),
    ),
    ClickedNext: Root.makeStep((model) =>
      Dots.requestConfigure({
        config: {
          ...configOf(model),
          value: (model.dots.clock.value + 1) % model.dots.clock.count,
        },
      }),
    ),
    ClickedCount: Root.makeStep((model) =>
      Dots.requestConfigure({
        config: {
          ...configOf(model),
          count: model.dots.clock.count === 4 ? 2 : 4,
        },
      }),
    ),
    ClickedHold: Root.makeFieldsStep(() => ({ isHold: Boolean.not })),
    ClickedAccept: Root.makeStep((model) =>
      Option.isSome(model.maybePending)
        ? Update.combineSteps([
            Dots.requestConfigure({
              config: { ...configOf(model), value: model.maybePending.value },
            }),
            Root.makeFieldsStep(() => ({ maybePending: () => Option.none() })),
          ])
        : Root.makeNoopStep(),
    ),
    ClickedMount: Root.makeFieldsStep(() => ({ isMounted: Boolean.not })),
  })

  const view = composition.makeView((model, h) =>
    h.main(
      [h.Class('mx-auto max-w-2xl p-8')],
      [
        h.h1([h.Class('text-2xl mb-4')], ['CarouselDots']),
        h.p(
          [],
          ['Choose a playback mode. Hold requests to keep the current slide until you accept.'],
        ),
        h.div(
          [h.Class('flex flex-wrap gap-4 my-6')],
          [
            ...Mode.literals.map((mode) =>
              Button.view(
                {
                  onClick: Message.ClickedMode({ mode }),
                  type: 'button',
                  toView: (attributes) =>
                    h.button(
                      [...attributes.button, h.AriaPressed(String(model.mode === mode))],
                      [mode],
                    ),
                },
                h,
              ),
            ),
            Button.view(
              {
                onClick: Message.ClickedPause(),
                toView: (attributes) =>
                  h.button([...attributes.button], [model.isPaused ? 'Resume' : 'Pause']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedLoop(),
                toView: (attributes) =>
                  h.button([...attributes.button], [model.isLoop ? 'Loop on' : 'Loop off']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedDuration(),
                toView: (attributes) =>
                  h.button([...attributes.button], [`Duration ${model.duration}ms`]),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedReplaceSource(),
                toView: (attributes) =>
                  h.button([...attributes.button], ['Replace progress source']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedNext(),
                toView: (attributes) => h.button([...attributes.button], ['Next slide']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedCount(),
                toView: (attributes) => h.button([...attributes.button], ['Toggle count']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedHold(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button],
                    [model.isHold ? 'Accept automatically' : 'Hold requests'],
                  ),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedAccept(),
                toView: (attributes) => h.button([...attributes.button], ['Accept pending']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedMount(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button],
                    [model.isMounted ? 'Unmount dots' : 'Remount dots'],
                  ),
              },
              h,
            ),
          ],
        ),
        h.label(
          [],
          [
            'Progress ',
            Input.view(
              {
                id: 'carousel-progress',
                type: 'range',
                onInput: (value) => Message.UpdatedProgress({ value }),
                value: String(model.progress),
                toView: (attributes) =>
                  h.input([...attributes.input, h.Min('0'), h.Max('1'), h.Step('0.01')]),
              },
              h,
            ),
          ],
        ),
        h.output(
          [h.Id('carousel-status'), h.Class('block my-4')],
          [
            `Slide ${model.dots.clock.value + 1}; ${model.dots.clock.count} dots; ${model.mode}; requests ${model.requests}; pending ${Option.getOrElse(model.maybePending, () => -1)}`,
          ],
        ),
        h.div(
          [h.Class('my-6 flex justify-center')],
          [
            model.isMounted
              ? h.block(
                  DotsPolicy.embedView({
                    slotId: model.dots.id,
                    model: model.dots,
                    viewInputs: {
                      animate: motion.node,
                      animateHighlight: hoverHighlightAnimation(motion),
                      getLabel: (index) =>
                        `Show ${['Inbox', 'Drafts', 'Sent', 'Archive'][index] ?? index + 1}`,
                      ...examplePresentation,
                    },
                  }),
                )
              : null,
          ],
        ),
      ],
    ),
  )
  const layer = Root.makeLayer({ init, update, view, EffectsLayer: SetProgress.layer }).pipe(
    Layer.provide(Layer.mergeAll(CarouselLayer, motion.layer)),
  )
  return { layer, resources }
}

type Model = typeof Model.Type
type ClickedMode = typeof Message.ClickedMode.Type
type Progress = typeof Message.UpdatedProgress.Type
