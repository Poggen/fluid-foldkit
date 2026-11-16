import { modifyFields } from 'foldkit/struct'
import { ChartStatFlowBlock } from './block'
import { Effect, Schema } from 'effect'
import { CustomElement } from 'foldkit'
import type { Html } from 'foldkit/html'
import { cn } from '../kit/classes.js'
import { type ChartStatFlowProps, formatStatValue, statFlowCodec } from './props.js'
import { mountStatNumber, registerStatNumber } from './number-element.js'
import { STAT_HOST } from './bridge.js'

const StatElement = CustomElement.define({
  tag: STAT_HOST,
  properties: { configuration: Schema.String },
  events: {},
})

const { Message } = ChartStatFlowBlock

const Mount = ChartStatFlowBlock.makeMount('MountStatNumber', {
  messages: [Message.CompletedMount],
  *handler() {
    return ({ element }) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          registerStatNumber()
          return mountStatNumber(element)
        }),
        (release) => Effect.sync(release),
      ).pipe(Effect.as(Message.CompletedMount()))
  },
})

const ChartStatFlowComposition = ChartStatFlowBlock.makeComposition({ mounts: [Mount] })

export interface ChartStatFlowViewInputs {
  readonly icon?: ReadonlyArray<Html | string>
}

const plans = {
  init: ChartStatFlowComposition.makeInit((configuration: ChartStatFlowProps) => ({
    model: { configuration },
  })),
  update: ChartStatFlowComposition.makeUpdate({
    CompletedMount: ChartStatFlowBlock.makeNoopStep(),
  }),
  inMessageUpdate: ChartStatFlowComposition.makeInMessageUpdate({
    RequestedConfigure: (model, { configuration }) => ({
      model: modifyFields(model, { configuration: () => configuration }),
    }),
  }),
  view: ChartStatFlowComposition.makeView.withInputs<ChartStatFlowViewInputs>(
    (model, inputs, h) => {
      const props = model.configuration
      const element = StatElement.withMessage(h)

      return h.div(
        [h.Class('contents')],
        [
          ...(inputs.icon === undefined ? [] : [h.div([h.Class('bk-stat-icon')], inputs.icon)]),
          h.span(
            [h.Class(cn('bk-stat-value', props.valueClassName ?? 'bk-text-2xl bk-font-bold'))],
            [
              element(
                [
                  h.Class('contents'),

                  element.Configuration(Schema.encodeSync(statFlowCodec)(props)),
                  h.OnMount(Mount()),
                ],
                [formatStatValue(props)],
              ),
            ],
          ),
          h.span(
            [h.Class(cn('bk-stat-label', props.labelClassName ?? 'bk-text-xs'))],
            [props.label],
          ),
        ],
      )
    },
  ),
  EffectsLayer: Mount.layer,
}

export const ChartStatFlowLayer = ChartStatFlowBlock.makeLayer<typeof plans>(plans)
