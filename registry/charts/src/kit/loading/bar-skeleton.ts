import { modifyFields } from 'foldkit/struct'
import { Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { BarLoadingSkeletonProps } from './sweep-options'
import { barSkeletonView } from './sweep-view'
import { reducedMotionChanges } from './bar-skeleton-preference'

export { initialReducedMotion as initialBarLoadingSkeletonPreference } from './bar-skeleton-preference'

export type { BarLoadingSkeletonProps } from './sweep-options'

const Configuration = Schema.Struct({
  innerWidth: Schema.Number,
  innerHeight: Schema.Number,
  barCount: Schema.optionalKey(Schema.Number),
  fill: Schema.optionalKey(Schema.String),
  fillOpacity: Schema.optionalKey(Schema.Number),
  backgroundOpacity: Schema.optionalKey(Schema.Number),
  baseline: Schema.optionalKey(Schema.Literals(['bottom', 'center'])),
  barFraction: Schema.optionalKey(Schema.Number),
  durationSeconds: Schema.optionalKey(Schema.Number),
})

const Model = Schema.Struct({
  id: Schema.String,
  configuration: Configuration,
  reducedMotion: Schema.Boolean,
  tick: Schema.Number,
})

const Message = defineMessageUnion({
  ObservedPreference: { reducedMotion: Schema.Boolean },
  ObservedSweepCycle: {},
})

const InMessage = defineInMessageUnion({ RequestedConfigure: { configuration: Configuration } })

const effects = Block.makeEffectsContract()

export const BarLoadingSkeletonKey = Symbol('BarLoadingSkeleton')

export const BarLoadingSkeletonBlock = Block.make('BarLoadingSkeleton', {
  key: BarLoadingSkeletonKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([Schema.String, Configuration, Schema.Boolean]),
  view: { kind: 'Element' },
  effects,
})

const Subscriptions = BarLoadingSkeletonBlock.makeSubscriptions((entry) => ({
  Preference: entry('Preference', {
    messages: [Message.ObservedPreference],
    *handler() {
      return () =>
        reducedMotionChanges.pipe(
          Stream.map((reducedMotion) => Message.ObservedPreference({ reducedMotion })),
        )
    },
  }),
}))

const BarLoadingSkeletonComposition = BarLoadingSkeletonBlock.makeComposition({})

const plans = {
  init: BarLoadingSkeletonComposition.makeInit(
    (id: string, configuration: typeof Configuration.Type, reducedMotion: boolean) => ({
      model: { id, configuration, reducedMotion, tick: 0 },
    }),
  ),
  update: BarLoadingSkeletonComposition.makeUpdate({
    ObservedPreference: (model, { reducedMotion }) => ({
      model:
        reducedMotion === model.reducedMotion
          ? model
          : modifyFields(model, { reducedMotion: () => reducedMotion }),
    }),
    ObservedSweepCycle: (model) => ({ model: modifyFields(model, { tick: () => model.tick + 1 }) }),
  }),
  inMessageUpdate: BarLoadingSkeletonComposition.makeInMessageUpdate({
    RequestedConfigure: (model, { configuration }) => ({
      model: modifyFields(model, { configuration: () => configuration }),
    }),
  }),
  subscriptions: Subscriptions,
  EffectsLayer: Subscriptions.layer,
  view: BarLoadingSkeletonComposition.makeView((model, h) => {
    const { innerWidth, innerHeight } = model.configuration

    if (innerWidth <= 0 || innerHeight <= 0) {
      return null
    }

    return h.g(
      [h.Id(model.id)],
      barSkeletonView(
        h,
        `bar-sweep-${model.id}`,
        model.tick,
        model.reducedMotion,
        Message.ObservedSweepCycle(),
        model.configuration,
      ),
    )
  }),
}

export const BarLoadingSkeletonLayer = BarLoadingSkeletonBlock.makeLayer<typeof plans>(plans)

export const barLoadingSkeletonConfiguration = (props: BarLoadingSkeletonProps) =>
  Configuration.make(props)
