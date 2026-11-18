import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { Layer, Match, Record, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineMessageUnion } from 'foldkit/message'
import {
  SeriesPointMarkerBlock,
  SeriesPointMarkerLayer,
} from '@foldkit-visuals/charts/series-point-marker'
import type { SeriesPointMarkerProps } from '@foldkit-visuals/charts/series-point-marker'

const configuration: (key: string) => SeriesPointMarkerProps = (key: string) => ({
  dataKey: key,
  index: 0,
  cx: key === 'primary' ? 40 : 120,
  cy: 40,
  revealDelay: 0.125,
  revealEpoch: 0,
  enterDuration: 0.4,
})

export const SeriesPointMarkerRuntimeFixtureKey = Symbol('SeriesPointMarkerRuntimeFixture')

const Model = Schema.Struct({
  instances: Schema.Record(Schema.String, SeriesPointMarkerBlock.Model),
  areViewsVisible: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedCreate: { key: Schema.String },
  ClickedRemove: { key: Schema.String },
  ClickedChange: {
    key: Schema.String,
    change: Schema.Literals(['replay', 'paint', 'nan', 'zero', 'negativeZero']),
  },
  ClickedBurst: { key: Schema.String },
  ClickedViewsToggled: {},
})

const SeriesPointMarkerRuntimeFixtureBlock = Block.make('SeriesPointMarkerRuntimeFixture', {
  key: SeriesPointMarkerRuntimeFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const Instances = SeriesPointMarkerRuntimeFixtureBlock.makeRecordBinding(SeriesPointMarkerBlock, {
  field: 'instances',
})

const SeriesPointMarkerRuntimeFixtureComposition =
  SeriesPointMarkerRuntimeFixtureBlock.makeComposition({ bindings: [Instances] })

const initMarker = (key: string) =>
  SeriesPointMarkerRuntimeFixtureBlock.makeStep((model) =>
    initAndInsert(Instances, model, {
      key,
      args: [configuration(key)],
    }),
  )

const layer = SeriesPointMarkerRuntimeFixtureBlock.makeLayer({
  init: SeriesPointMarkerRuntimeFixtureComposition.makeInit(() => ({
    model: { instances: {}, areViewsVisible: true },
    steps: [initMarker('primary'), initMarker('sibling')],
  })),
  update: SeriesPointMarkerRuntimeFixtureComposition.makeUpdate({
    ClickedCreate: (model, { key }) =>
      Record.has(model.instances, key)
        ? SeriesPointMarkerRuntimeFixtureBlock.makeNoopStep()(model)
        : initMarker(key)(model),
    ClickedRemove: (model, { key }) => ({
      model: modifyFields(model, { instances: (instances) => Record.remove(instances, key) }),
    }),
    ClickedChange: (model, { key, change }) => {
      const child = model.instances[key]

      if (child === undefined) {
        return SeriesPointMarkerRuntimeFixtureBlock.makeNoopStep()(model)
      }

      const props = child.configuration

      const next: SeriesPointMarkerProps = Match.value(change).pipe(
        Match.when('paint', () => ({ ...props, fill: props.fill === 'red' ? 'blue' : 'red' })),
        Match.when('nan', () => ({ ...props, revealEpoch: Number.NaN })),
        Match.when('zero', () => ({ ...props, revealEpoch: 0 })),
        Match.when('negativeZero', () => ({ ...props, revealEpoch: -0 })),
        Match.when('replay', () => ({ ...props, revealEpoch: props.revealEpoch + 1 })),
        Match.exhaustive,
      )

      return Instances.requestConfigure(key, { configuration: next })(model)
    },
    ClickedBurst: (model, { key }) => {
      const child = model.instances[key]

      if (child === undefined) {
        return SeriesPointMarkerRuntimeFixtureBlock.makeNoopStep()(model)
      }

      return Update.combineSteps([
        Instances.requestConfigure(key, {
          configuration: {
            ...child.configuration,
            revealEpoch: child.configuration.revealEpoch + 1,
          },
        }),
        Instances.requestConfigure(key, { configuration: child.configuration }),
      ])(model)
    },
    ClickedViewsToggled: (model) => ({
      model: modifyFields(model, { areViewsVisible: Boolean.not }),
    }),
  }),
  view: SeriesPointMarkerRuntimeFixtureComposition.makeView((model, h) =>
    h.main(
      [h.Id('series-point-marker-fixture')],
      [
        Button.view(
          {
            onClick: Message.ClickedCreate({ key: 'primary' }),
            toView: (attributes) =>
              h.button([...attributes.button, h.Id('create-primary')], ['Create primary']),
          },
          h,
        ),
        Button.view(
          {
            onClick: Message.ClickedRemove({ key: 'primary' }),
            toView: (attributes) =>
              h.button([...attributes.button, h.Id('remove-primary')], ['Remove primary']),
          },
          h,
        ),
        Button.view(
          {
            onClick: Message.ClickedViewsToggled(),
            toView: (attributes) =>
              h.button([...attributes.button, h.Id('toggle-views')], ['Toggle physical views']),
          },
          h,
        ),
        ...Object.entries(model.instances).map(([key, child]) =>
          h.keyed('section')(
            key,
            [h.DataAttribute('member', key)],
            [
              Button.view(
                {
                  onClick: Message.ClickedChange({ key, change: 'replay' }),
                  toView: (attributes) =>
                    h.button(
                      [...attributes.button, h.DataAttribute('action', 'replay')],
                      ['Replay'],
                    ),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedChange({ key, change: 'paint' }),
                  toView: (attributes) =>
                    h.button([...attributes.button, h.DataAttribute('action', 'paint')], ['Paint']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedBurst({ key }),
                  toView: (attributes) =>
                    h.button(
                      [...attributes.button, h.DataAttribute('action', 'burst')],
                      ['Coalesced A-B-A'],
                    ),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedChange({ key, change: 'nan' }),
                  toView: (attributes) =>
                    h.button(
                      [...attributes.button, h.DataAttribute('action', 'nan')],
                      ['NaN epoch'],
                    ),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedChange({ key, change: 'zero' }),
                  toView: (attributes) =>
                    h.button(
                      [...attributes.button, h.DataAttribute('action', 'zero')],
                      ['Positive zero'],
                    ),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedChange({ key, change: 'negativeZero' }),
                  toView: (attributes) =>
                    h.button(
                      [...attributes.button, h.DataAttribute('action', 'negative-zero')],
                      ['Negative zero'],
                    ),
                },
                h,
              ),
              h.svg(
                [h.Width('180'), h.Height('100')],
                model.areViewsVisible
                  ? [h.block(Instances.embedView({ key, slotId: key, model: child }))]
                  : [],
              ),
            ],
          ),
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(SeriesPointMarkerLayer))

export const Fixture = { block: SeriesPointMarkerRuntimeFixtureBlock, layer }
