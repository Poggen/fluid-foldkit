import { modifyFields } from 'foldkit/struct'
import { Effect, Option, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import * as Render from 'foldkit/render'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { CurveFactory } from 'd3-shape'
import type { LineLoadingSweepProps } from './sweep-options'
import { lineSweepView } from './sweep-view'
import { reducedMotionChanges } from './bar-skeleton-preference'

export { initialReducedMotion as initialLineLoadingSweepPreference } from './bar-skeleton-preference'

const Mode = Schema.Literals(['loop', 'enter', 'exit'])

const TransitionMode = Schema.Literals(['enter', 'exit'])

const Configuration = Schema.Struct({
  withArea: Schema.optionalKey(Schema.Boolean),
  mode: Schema.optionalKey(Mode),
  stroke: Schema.optionalKey(Schema.String),
  strokeOpacity: Schema.optionalKey(Schema.Number),
  strokeWidth: Schema.optionalKey(Schema.Number),
  pointCount: Schema.optionalKey(Schema.Number),
  durationSeconds: Schema.optionalKey(Schema.Number),
  innerWidth: Schema.optionalKey(Schema.Number),
  innerHeight: Schema.optionalKey(Schema.Number),
})

const Classification = Schema.Struct({ reducedMotion: Schema.Boolean, isLoop: Schema.Boolean })

export interface LineSweepViewInputs {
  readonly curve: () => CurveFactory
  readonly dimensions: Readonly<{ innerWidth: number; innerHeight: number }>
}

const Model = Schema.Struct({
  id: Schema.String,
  configuration: Configuration,
  reducedMotion: Schema.Boolean,
  tick: Schema.Number,
  committedClassification: Schema.Option(Classification),
})

const Message = defineMessageUnion({
  ObservedPreference: { reducedMotion: Schema.Boolean },
  ObservedCommittedClassification: Classification.fields,
  ObservedSweepCycle: { observedLoop: Schema.Boolean },
  ObservedTransitionEnd: { observedMode: TransitionMode },
})

const OutMessage = defineMessageUnion({
  TransitionCompleted: {
    mode: TransitionMode,
    source: Schema.Literals(['reducedMotion', 'animation']),
  },
})

const InMessage = defineInMessageUnion({
  RequestedConfigure: { configuration: Configuration },
})

const effects = Block.makeEffectsContract()

export const LineLoadingSweepKey = Symbol('LineLoadingSweep')

export const LineLoadingSweepBlock = Block.make('LineLoadingSweep', {
  key: LineLoadingSweepKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Schema.String, Configuration, Schema.Boolean]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<LineSweepViewInputs>() },
  effects,
})

const Subscriptions = LineLoadingSweepBlock.makeSubscriptions((entry) => ({
  Preference: entry('Preference', {
    messages: [Message.ObservedPreference],
    *handler() {
      return () =>
        reducedMotionChanges.pipe(
          Stream.map((reducedMotion) => Message.ObservedPreference({ reducedMotion })),
        )
    },
  }),
  CommittedClassification: entry('CommittedClassification', Classification.fields, {
    messages: [Message.ObservedCommittedClassification],
    modelToDependencies: (model) => ({
      reducedMotion: model.reducedMotion,
      isLoop: (model.configuration.mode ?? 'loop') === 'loop',
    }),
    *handler() {
      const { afterCommit } = Render

      return (classification) =>
        Stream.fromEffect(
          afterCommit.pipe(Effect.as(Message.ObservedCommittedClassification(classification))),
        )
    },
  }),
}))

const LineLoadingSweepComposition = LineLoadingSweepBlock.makeComposition({})

const plans = {
  init: LineLoadingSweepComposition.makeInit(
    (id: string, configuration: typeof Configuration.Type, reducedMotion: boolean) => ({
      model: {
        id,
        configuration,
        reducedMotion,
        tick: 0,
        committedClassification: Option.none<typeof Classification.Type>(),
      },
    }),
  ),
  update: LineLoadingSweepComposition.makeUpdate({
    ObservedPreference: (model, { reducedMotion }) => ({
      model:
        reducedMotion === model.reducedMotion
          ? model
          : modifyFields(model, { reducedMotion: () => reducedMotion }),
    }),
    ObservedSweepCycle: (model, { observedLoop }) => ({
      model: observedLoop ? modifyFields(model, { tick: () => model.tick + 1 }) : model,
    }),
    ObservedTransitionEnd: (model, { observedMode }) => ({
      model,
      outMessage: OutMessage.TransitionCompleted({ mode: observedMode, source: 'animation' }),
    }),
    ObservedCommittedClassification: (model, classification) => {
      const isLoop = (model.configuration.mode ?? 'loop') === 'loop'

      if (
        classification.reducedMotion !== model.reducedMotion ||
        classification.isLoop !== isLoop
      ) {
        return { model }
      }

      const previous = model.committedClassification
      const next = modifyFields(model, {
        committedClassification: () => Option.some(classification),
      })
      const mode = model.configuration.mode ?? 'loop'

      const enteredReducedNonloop = Option.match(previous, {
        onNone: () => true,
        onSome: (committed) => !committed.reducedMotion || committed.isLoop,
      })

      if (
        classification.reducedMotion &&
        !classification.isLoop &&
        mode !== 'loop' &&
        enteredReducedNonloop
      ) {
        return {
          model: next,
          outMessage: OutMessage.TransitionCompleted({ mode, source: 'reducedMotion' }),
        }
      }

      return { model: next }
    },
  }),
  inMessageUpdate: LineLoadingSweepComposition.makeInMessageUpdate({
    RequestedConfigure: (model, { configuration }) => ({
      model: modifyFields(model, { configuration: () => configuration }),
    }),
  }),
  subscriptions: Subscriptions,
  EffectsLayer: Subscriptions.layer,
  view: LineLoadingSweepComposition.makeView.withInputs<LineSweepViewInputs>((model, inputs, h) => {
    const mode = model.configuration.mode ?? 'loop'

    const completion =
      mode === 'loop' ? undefined : Message.ObservedTransitionEnd({ observedMode: mode })

    const paint = lineSweepView(
      h,
      model.id,
      model.tick,
      model.reducedMotion,
      Message.ObservedSweepCycle({ observedLoop: mode === 'loop' }),
      {
        ...model.configuration,
        curve: inputs.curve(),
        innerWidth: model.configuration.innerWidth ?? inputs.dimensions.innerWidth,
        innerHeight: model.configuration.innerHeight ?? inputs.dimensions.innerHeight,
        onTransitionComplete: completion,
      },
    )

    return paint.length === 0 ? null : h.g([h.Id(model.id)], paint)
  }),
}

export const LineLoadingSweepLayer = LineLoadingSweepBlock.makeLayer<typeof plans>(plans)

export const lineLoadingSweepConfiguration = (props: LineLoadingSweepProps) =>
  Schema.decodeUnknownSync(Configuration)(
    Object.fromEntries(
      [
        ['withArea', props.withArea],
        ['mode', props.mode],
        ['stroke', props.stroke],
        ['strokeOpacity', props.strokeOpacity],
        ['strokeWidth', props.strokeWidth],
        ['pointCount', props.pointCount],
        ['durationSeconds', props.durationSeconds],
        ['innerWidth', props.innerWidth],
        ['innerHeight', props.innerHeight],
      ].filter(([, value]) => value !== undefined),
    ),
  )

export const lineLoadingSweepInputs: (
  props: Pick<LineLoadingSweepProps, 'curve'>,
  dimensions?: Readonly<{ innerWidth: number; innerHeight: number }>,
) => LineSweepViewInputs = (
  props: Pick<LineLoadingSweepProps, 'curve'>,
  dimensions?: Readonly<{ innerWidth: number; innerHeight: number }>,
) => ({
  curve: () => props.curve,
  dimensions: {
    innerWidth: dimensions?.innerWidth ?? 0,
    innerHeight: dimensions?.innerHeight ?? 0,
  },
})
