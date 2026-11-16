import { modifyFields } from 'foldkit/struct'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  LineLoadingPulseStrokeConfiguration,
  PULSE_CONFIGURATION,
  PulseTransportCodec,
} from './pulse-model'
import type { LineLoadingPulseStrokeInputs } from './pulse-model'
import { observePulse } from './pulse-resource'

export type { LineLoadingPulseStrokeProps } from './pulse-model'

const Model = Schema.Struct({
  id: Schema.String,
  configuration: LineLoadingPulseStrokeConfiguration,
  generation: Schema.Int,
})

const Message = defineMessageUnion({
  ObservedCycle: { generation: Schema.Int },
  Mounted: {},
})

const OutMessage = defineMessageUnion({
  CycleCompleted: { mode: Schema.Literals(['loop', 'enter', 'exit']), loopEpoch: Schema.Finite },
})

const InMessage = defineInMessageUnion({
  RequestedConfigure: { configuration: LineLoadingPulseStrokeConfiguration },
})

const effects = Block.makeEffectsContract()

export const LineLoadingPulseStrokeKey = Symbol('LineLoadingPulseStroke')

export const LineLoadingPulseStrokeBlock = Block.make('LineLoadingPulseStroke', {
  key: LineLoadingPulseStrokeKey,
  InitArgs: Schema.Tuple([Schema.String, LineLoadingPulseStrokeConfiguration]),
  InMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<LineLoadingPulseStrokeInputs>() },
  effects,
  Model,
  Message,
  OutMessage,
})

const Motion = LineLoadingPulseStrokeBlock.makeMountStream('PulseMotion', {
  messages: [Message.ObservedCycle, Message.Mounted],
  *handler() {
    const observe = observePulse<
      ReturnType<typeof Message.ObservedCycle> | ReturnType<typeof Message.Mounted>
    >

    return ({ element, viewStateChanges }) =>
      observe(
        element,
        viewStateChanges,
        (generation) => Message.ObservedCycle({ generation }),
        Message.Mounted(),
      )
  },
})

const LineLoadingPulseStrokeComposition = LineLoadingPulseStrokeBlock.makeComposition({
  mounts: [Motion],
})

const plans = {
  init: LineLoadingPulseStrokeComposition.makeInit(
    (id: string, configuration: LineLoadingPulseStrokeConfiguration) => ({
      model: { id, configuration, generation: 0 },
    }),
  ),
  update: LineLoadingPulseStrokeComposition.makeUpdate({
    ObservedCycle: (model, { generation }) => {
      if (generation !== model.generation) {
        return { model }
      }

      return {
        model,
        outMessage: OutMessage.CycleCompleted({
          mode: model.configuration.mode ?? 'loop',
          loopEpoch: model.configuration.loopEpoch ?? 0,
        }),
      }
    },
    Mounted: LineLoadingPulseStrokeBlock.makeNoopStep(),
  }),
  inMessageUpdate: LineLoadingPulseStrokeComposition.makeInMessageUpdate({
    RequestedConfigure: (model, { configuration }) => ({
      model: modifyFields(model, {
        configuration: () => configuration,
        generation: () => model.generation + 1,
      }),
    }),
  }),
  view: LineLoadingPulseStrokeComposition.makeView.withInputs<LineLoadingPulseStrokeInputs>(
    (model, inputs, h) => {
      let { configuration } = model

      if (inputs.dimensions !== undefined) {
        configuration = { ...configuration, ...inputs.dimensions }
      }

      const {
        pathD,
        innerHeight = 0,
        stroke = 'var(--chart-foreground)',
        strokeOpacity = 0.5,
        strokeWidth = 2.5,
        innerWidth = 0,
      } = configuration

      const clipId = `line-loading-clip-${model.id}`
      const gradientId = `line-loading-gradient-${model.id}`

      return h.keyed('g')(
        model.id,
        [
          h.Attribute(
            PULSE_CONFIGURATION,
            Schema.encodeSync(PulseTransportCodec)({
              id: model.id,
              generation: model.generation,
              configuration,
            }),
          ),
          h.OnMount(Motion()),
        ],
        [
          h.defs(
            [],
            [
              h.clipPath(
                [h.Id(clipId)],
                [
                  h.rect([
                    h.Class('[transform:translateX(-10px)]'),
                    h.Attribute('data-bkm-pulse-clip', ''),
                    h.Width('0'),
                    h.Height(String(innerHeight + 20)),
                    h.Y('-10'),
                  ]),
                ],
              ),
              h.linearGradient(
                [
                  h.Id(gradientId),
                  h.Attribute('gradientUnits', 'userSpaceOnUse'),
                  h.Attribute('x1', '0'),
                  h.Attribute('x2', String(innerWidth)),
                  h.Attribute('y1', '0'),
                  h.Attribute('y2', '0'),
                ],
                [0, 15, 85, 100].map((offset, index) =>
                  h.stop([
                    h.Offset(`${offset}%`),
                    h.StopColor(stroke),
                    h.Attribute('stop-opacity', index === 0 || index === 3 ? '0' : '1'),
                  ]),
                ),
              ),
            ],
          ),
          h.path([
            h.ClipPath(`url(#${clipId})`),
            h.D(pathD),
            h.Fill('none'),
            h.Attribute('opacity', String(strokeOpacity)),
            h.Stroke(`url(#${gradientId})`),
            h.StrokeLinecap('round'),
            h.StrokeWidth(String(strokeWidth)),
          ]),
        ],
      )
    },
  ),
  EffectsLayer: Motion.layer,
}

export const LineLoadingPulseStrokeLayer =
  LineLoadingPulseStrokeBlock.makeLayer<typeof plans>(plans)
