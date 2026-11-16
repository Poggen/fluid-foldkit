import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { Layer, Match, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { GaugeBlock, GaugeLayer, GaugeConfiguration } from '@foldkit-visuals/charts/gauge'

export const ShowcaseKey = Symbol('Showcase')

const Model = Schema.Struct({
  gauge: GaugeBlock.Model,
  companion: GaugeBlock.Model,
  initialValue: Schema.Number,
  isVisible: Schema.Boolean,
  isCompanionVisible: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedDecrement: {},
  ClickedReset: {},
  ClickedToggleMount: {},
  ClickedCycleLabelAlign: {},
  ClickedRaiseCenter: {},
  ClickedLowerCenter: {},
  ClickedToggleNotchDepth: {},
  ClickedToggleCompanion: {},
  ClickedToggleEntrance: {},
  ClickedToggleNotchCorners: {},
})

export const ShowcaseBlock = Block.make('Showcase', {
  key: ShowcaseKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([GaugeConfiguration]),
  ChildInitContext: GaugeConfiguration,
  view: { kind: 'Element' },
})

const GaugeBinding = ShowcaseBlock.makeRequiredFieldBinding(GaugeBlock, {
  field: 'gauge',
  init: { contextToArgs: (configuration) => [configuration, 'fixture-gauge'] },
})

const CompanionBinding = ShowcaseBlock.makeRequiredFieldBinding(GaugeBlock, {
  field: 'companion',
  init: {
    contextToArgs: (configuration) => [
      { ...configuration, enterTransition: { type: 'tween', duration: 1.2, ease: 'easeInOut' } },
      'companion-gauge',
    ],
  },
})

const ShowcaseComposition = ShowcaseBlock.makeComposition({
  bindings: [GaugeBinding, CompanionBinding],
})

const configure = (current: GaugeConfiguration, value: number) =>
  GaugeBinding.requestConfigure({ configuration: modifyFields(current, { value: () => value }) })

export const ShowcaseLayer = ShowcaseBlock.makeLayer({
  init: ShowcaseComposition.makeInit((configuration) => ({
    childInitContext: configuration,
    model: { initialValue: configuration.value, isVisible: true, isCompanionVisible: false },
  })),
  update: ShowcaseComposition.makeUpdate({
    ClickedIncrement: (model) =>
      configure(
        model.gauge.configuration,
        Math.min(100, model.gauge.configuration.value + 15),
      )(model),
    ClickedDecrement: (model) =>
      configure(
        model.gauge.configuration,
        Math.max(0, model.gauge.configuration.value - 15),
      )(model),
    ClickedReset: (model) => configure(model.gauge.configuration, model.initialValue)(model),
    ClickedRaiseCenter: (model) => {
      const current = model.gauge.configuration

      return GaugeBinding.requestConfigure({
        configuration: modifyFields(current, {
          centerValue: () => (current.centerValue ?? 0) + 1000,
        }),
      })(model)
    },
    ClickedLowerCenter: (model) => {
      const current = model.gauge.configuration

      return GaugeBinding.requestConfigure({
        configuration: modifyFields(current, {
          centerValue: () => (current.centerValue ?? 0) - 1000,
        }),
      })(model)
    },
    ClickedToggleNotchDepth: (model) => {
      const current = model.gauge.configuration

      return GaugeBinding.requestConfigure({
        configuration: modifyFields(current, {
          notchLengthPercent: () => (current.notchLengthPercent === 40 ? 100 : 40),
        }),
      })(model)
    },
    ClickedToggleNotchCorners: (model) => {
      const current = model.gauge.configuration

      return GaugeBinding.requestConfigure({
        configuration: modifyFields(current, {
          notchCornerRadius: () => (current.notchCornerRadius === 4 ? 0 : 4),
        }),
      })(model)
    },
    ClickedToggleEntrance: (model) => {
      const current = model.gauge.configuration
      const { enterTransition, ...withoutTransition } = current
      const slow = enterTransition?.type === 'tween' && enterTransition.duration === 1.2

      return GaugeBinding.requestConfigure({
        configuration: slow
          ? withoutTransition
          : modifyFields(current, {
              enterTransition: () => ({ type: 'tween', duration: 1.2, ease: 'easeInOut' }),
            }),
      })(model)
    },
    ClickedCycleLabelAlign: (model) => {
      const current = model.gauge.configuration
      const alignment = current.labelAlign ?? 'start'

      return GaugeBinding.requestConfigure({
        configuration: modifyFields(current, {
          labelAlign: () =>
            Match.value(alignment).pipe(
              Match.when('start', () => 'center' as const),
              Match.when('center', () => 'end' as const),
              Match.when('end', () => 'start' as const),
              Match.exhaustive,
            ),
        }),
      })(model)
    },
    ClickedToggleCompanion: ShowcaseBlock.makeFieldsStep(() => ({
      isCompanionVisible: Boolean.not,
    })),
    ClickedToggleMount: ShowcaseBlock.makeFieldsStep(() => ({
      isVisible: Boolean.not,
    })),
  }),
  view: ShowcaseComposition.makeView((model, h) =>
    h.div(
      [],
      [
        h.nav(
          [],
          [
            Button.view(
              {
                onClick: Message.ClickedDecrement(),
                toView: (attributes) => h.button([...attributes.button], ['Decrease']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedIncrement(),
                toView: (attributes) => h.button([...attributes.button], ['Increase']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedReset(),
                toView: (attributes) => h.button([...attributes.button], ['Reset']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedCycleLabelAlign(),
                toView: (attributes) => h.button([...attributes.button], ['Cycle label']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedRaiseCenter(),
                toView: (attributes) => h.button([...attributes.button], ['Change center']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedLowerCenter(),
                toView: (attributes) => h.button([...attributes.button], ['Lower center']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedToggleMount(),
                toView: (attributes) =>
                  h.button([...attributes.button], [model.isVisible ? 'Unmount' : 'Remount']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedToggleNotchDepth(),
                toView: (attributes) => h.button([...attributes.button], ['Toggle notch depth']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedToggleEntrance(),
                toView: (attributes) =>
                  h.button([...attributes.button], ['Toggle entrance transition']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedToggleNotchCorners(),
                toView: (attributes) => h.button([...attributes.button], ['Toggle notch corners']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedToggleCompanion(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button],
                    [model.isCompanionVisible ? 'Hide companion' : 'Show companion'],
                  ),
              },
              h,
            ),
          ],
        ),
        h.div(
          [h.Id('fixture')],
          [
            model.isVisible
              ? h.block(
                  GaugeBinding.embedView({
                    slotId: 'gauge-fixture',
                    model: model.gauge,
                    viewInputs: {},
                  }),
                )
              : h.empty,
            model.isVisible && model.isCompanionVisible
              ? h.block(
                  CompanionBinding.embedView({
                    slotId: 'companion-gauge',
                    model: model.companion,
                    viewInputs: {},
                  }),
                )
              : h.empty,
          ],
        ),
        h.div([h.Id('status')], [`Value ${model.gauge.configuration.value}`]),
      ],
    ),
  ),
}).pipe(Layer.provide(GaugeLayer))
