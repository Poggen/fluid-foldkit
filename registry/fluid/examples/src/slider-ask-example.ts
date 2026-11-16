import { sliderAskToolbar } from './slider-ask-toolbar'
import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { shapeMap } from '@foldkit-visuals/fluid/tokens'
import {
  exampleHoverConfig,
  examplePresentation,
  exampleSelectionRadius,
} from './example-presentation.js'
import { Layer, Schema, Predicate } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  SliderBlock,
  layer as sliderLayer,
  createSliderMotionScope,
  sliderPresentationSettings,
  type SliderConfig,
} from '@foldkit-visuals/fluid/slider'

import {
  AskUserQuestionsBlock,
  AskAnswers,
  layer as askLayer,
  createAskUserQuestionsLayer,
  type AskUserQuestion,
  type AskUserQuestionsEnvironment,
} from '@foldkit-visuals/fluid/ask-user-questions'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'

export const sliderAskQuestions: ReadonlyArray<AskUserQuestion> = [
  {
    id: 'choice',
    title: 'Which approach should we use?',
    options: [
      { id: 'native', title: 'Native', description: 'Use the platform.' },
      { id: 'portable', title: 'Portable', description: 'Keep the same interface.' },
      { id: 'custom', title: 'Custom', description: 'Build the experience.' },
    ],
    allowOther: true,
  },
  {
    id: 'multi',
    title: 'What matters most?',
    options: [
      { id: 'quality', title: 'Quality', description: 'Exact behavior and details.' },
      { id: 'speed', title: 'Speed', description: 'Respond without delay.' },
      { id: 'clarity', title: 'Clarity', description: 'Make the next action clear.' },
    ],
    multiSelect: true,
    allowOther: true,
    chipPosition: 'left',
    layout: 'stacked',
  },
  { id: 'text', title: 'Describe your goal', freeText: true, freeTextMultiline: true },
  { id: 'name', title: 'Give it a name', freeText: true, freeTextMultiline: false },
]

const Model = Schema.Struct({
  radix: SliderBlock.Model,
  base: SliderBlock.Model,
  pips: SliderBlock.Model,
  scrubber: SliderBlock.Model,
  ask: AskUserQuestionsBlock.Model,
  isMounted: Schema.Boolean,
  isCompact: Schema.Boolean,
  shape: Schema.Literals(['sharp', 'rounded', 'pill']),
  isDisabled: Schema.Boolean,
  isSelectionRejected: Schema.Boolean,
  events: Schema.Array(Schema.String),
  answers: AskAnswers,
  index: Schema.Int,
})

const Message = defineMessageUnion({
  ClickedMount: {},
  ClickedSize: {},
  ClickedShape: { value: Model.fields.shape },
  ClickedDisabled: {},
  ClickedReject: {},
  ClickedExternal: {},
  Submitted: {},
})

export const SliderAskExampleKey = Symbol('SliderAskExample')

const effects = Block.makeEffectsContract<never, AskUserQuestionsEnvironment>()

export const SliderAskExampleBlock = Block.make('SliderAskExample', {
  key: SliderAskExampleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Document' },
  effects,
})

const R0 = SliderAskExampleBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'radix',
  init: {
    contextToArgs: (): [SliderConfig] => [
      { id: 'radix', value: [20, 70], size: 'compact', showSteps: true, min: 0, max: 100, step: 1 },
    ],
  },
})

const Radix = R0.withOutMessagePolicy({
  fold: SliderAskExampleBlock.makeOutMessageFold(SliderBlock, {
    Changed: ({ value }) =>
      SliderAskExampleBlock.makeStep((model) =>
        model.isSelectionRejected
          ? SliderAskExampleBlock.makeNoopStep()
          : R0.requestSettings({ settings: { ...model.radix.settings, value } }),
      ),
  }),
})

const B0 = SliderAskExampleBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'base',
  init: {
    contextToArgs: (): [SliderConfig] => [
      {
        id: 'base',
        value: 0.5,
        steps: [0.1, 0.5, 0.7, 1.1, 1.3],
        showSteps: true,
        valuePosition: 'tooltip',
      },
    ],
  },
})

const Base = B0.withOutMessagePolicy({
  fold: SliderAskExampleBlock.makeOutMessageFold(SliderBlock, {
    Changed: ({ value }) =>
      SliderAskExampleBlock.makeStep((model) =>
        model.isSelectionRejected
          ? SliderAskExampleBlock.makeNoopStep()
          : B0.requestSettings({ settings: { ...model.base.settings, value } }),
      ),
  }),
})

const P0 = SliderAskExampleBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'pips',
  init: { contextToArgs: () => [{ id: 'pips', value: 4, min: 0, max: 10, step: 1 }] },
})

const Pips = P0.withOutMessagePolicy({
  fold: SliderAskExampleBlock.makeOutMessageFold(SliderBlock, {
    Changed: ({ value }) =>
      SliderAskExampleBlock.makeStep((model) =>
        model.isSelectionRejected
          ? SliderAskExampleBlock.makeNoopStep()
          : P0.requestSettings({ settings: { ...model.pips.settings, value } }),
      ),
  }),
})

const S0 = SliderAskExampleBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'scrubber',
  init: {
    contextToArgs: (): [SliderConfig] => [{ id: 'scrubber', value: 40, variant: 'scrubber' }],
  },
})

const Scrubber = S0.withOutMessagePolicy({
  fold: SliderAskExampleBlock.makeOutMessageFold(SliderBlock, {
    Changed: ({ value }) =>
      SliderAskExampleBlock.makeStep((model) =>
        model.isSelectionRejected
          ? SliderAskExampleBlock.makeNoopStep()
          : S0.requestSettings({ settings: { ...model.scrubber.settings, value } }),
      ),
  }),
})

const Ask = SliderAskExampleBlock.makeRequiredFieldBinding(AskUserQuestionsBlock, {
  field: 'ask',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'ask',
        radius: exampleSelectionRadius,
        questions: sliderAskQuestions,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: SliderAskExampleBlock.makeOutMessageFold(AskUserQuestionsBlock, {
    Events: ({ events }) =>
      SliderAskExampleBlock.makeFieldsStep(() => ({
        events: (events) => [...events, ...events.map((event) => JSON.stringify(event))],
        answers: (answers) =>
          events.findLast((event) => Predicate.isTagged(event, 'AnswersChanged'))?.answers ??
          answers,
        index: (index) =>
          events.findLast((event) => Predicate.isTagged(event, 'CurrentIndexChanged'))?.index ??
          index,
      })),
  }),
})

const SliderAskExampleComposition = SliderAskExampleBlock.makeComposition({
  bindings: [Radix, Base, Pips, Scrubber, Ask],
})
export type SliderAskViewBuilder = Block.ViewBuilderFor<typeof SliderAskExampleComposition>

const init = SliderAskExampleComposition.makeInit(() => ({
  model: {
    isMounted: true,
    isCompact: false,
    shape: examplePresentation.shape ?? 'rounded',
    isDisabled: false,
    isSelectionRejected: false,
    events: [],
    answers: {},
    index: 0,
  },
}))

const update = SliderAskExampleComposition.makeUpdate({
  Submitted: (model) => ({ model }),
  ClickedMount: SliderAskExampleBlock.makeStep((model) =>
    Update.combineSteps([
      ...(model.isMounted ? [] : [Ask.requestReset({ config: { questions: sliderAskQuestions } })]),
      SliderAskExampleBlock.makeFieldsStep(() => ({ isMounted: Boolean.not })),
    ]),
  ),
  ClickedReject: SliderAskExampleBlock.makeFieldsStep(() => ({ isSelectionRejected: Boolean.not })),
  ClickedSize: SliderAskExampleBlock.makeStep((model) =>
    Update.combineSteps([
      SliderAskExampleBlock.makeFieldsStep(() => ({ isCompact: Boolean.not })),
      P0.requestSettings({
        settings: sliderPresentationSettings(
          {
            id: model.pips.id,
            value: model.pips.settings.value,
            min: 0,
            max: 10,
            step: 1,
            disabled: model.isDisabled,
          },
          model.isCompact ? 'default' : 'compact',
        ),
      }),
      S0.requestSettings({
        settings: sliderPresentationSettings(
          {
            id: model.scrubber.id,
            value: model.scrubber.settings.value,
            variant: 'scrubber',
            disabled: model.isDisabled,
          },
          model.isCompact ? 'default' : 'compact',
        ),
      }),
    ]),
  ),
  ClickedShape: SliderAskExampleBlock.makeStep.fromMessage(
    (message: typeof Message.ClickedShape.Type) =>
      Update.combineSteps([
        SliderAskExampleBlock.makeFieldsStep(() => ({ shape: () => message.value })),
        Ask.requestRadius({ radius: shapeMap[message.value].mergedRadius }),
      ]),
  ),
  ClickedDisabled: SliderAskExampleBlock.makeStep((model) =>
    Update.combineSteps([
      SliderAskExampleBlock.makeFieldsStep(() => ({ isDisabled: Boolean.not })),
      R0.requestSettings({ settings: { ...model.radix.settings, disabled: !model.isDisabled } }),
      B0.requestSettings({ settings: { ...model.base.settings, disabled: !model.isDisabled } }),
      P0.requestSettings({ settings: { ...model.pips.settings, disabled: !model.isDisabled } }),
      S0.requestSettings({ settings: { ...model.scrubber.settings, disabled: !model.isDisabled } }),
    ]),
  ),
  ClickedExternal: SliderAskExampleBlock.makeStep((model) =>
    Update.combineSteps([
      R0.requestSettings({ settings: { ...model.radix.settings, value: [10, 90] } }),
      B0.requestSettings({ settings: { ...model.base.settings, value: 1.1 } }),
      P0.requestSettings({ settings: { ...model.pips.settings, value: 8 } }),
      S0.requestSettings({ settings: { ...model.scrubber.settings, value: 80 } }),
    ]),
  ),
})

const motion = createMotionScope('slider-ask')

const radixMotion = createSliderMotionScope('radix')

const baseMotion = createSliderMotionScope('base')

const pipsMotion = createSliderMotionScope('pips')

const scrubberMotion = createSliderMotionScope('scrubber')

const view = SliderAskExampleComposition.makeView((model, h) => {
  const context = createPresentationContext({
    shape: model.shape,
    size: model.isCompact ? 'compact' : 'default',
  })
  const animate = motion.node

  return {
    title: 'Fluid Slider and AskUserQuestions',
    body: h.main(
      [h.Class('p-6')],
      [
        sliderAskToolbar(Message, h),
        model.isMounted
          ? h.form(
              [h.Id('slider-ask-form'), h.OnSubmit(Message.Submitted())],
              [
                h.div(
                  [h.Class('grid grid-cols-[320px_320px] gap-8')],
                  [
                    h.section(
                      [],
                      [
                        h.h2([h.Class('m-[0_0_16px] text-[13px] font-normal')], ['Radix range']),
                        h.block(
                          Radix.embedView({
                            slotId: model.radix.id,
                            model: model.radix,
                            viewInputs: {
                              label: 'Volume',
                              animate,
                              motionValues: radixMotion.node,
                              context,
                            },
                          }),
                        ),
                      ],
                    ),
                    h.section(
                      [],
                      [
                        h.h2([h.Class('m-[0_0_16px] text-[13px] font-normal')], ['Base list']),
                        h.block(
                          Base.embedView({
                            slotId: model.base.id,
                            model: model.base,
                            viewInputs: {
                              label: 'Speed',
                              formatValue: (value) => `${value}×`,
                              animate,
                              motionValues: baseMotion.node,
                              context,
                            },
                          }),
                        ),
                      ],
                    ),
                    h.section(
                      [],
                      [
                        h.h2(
                          [h.Class('m-[0_0_16px] text-[13px] font-normal')],
                          ['Comfortable pips'],
                        ),
                        h.block(
                          Pips.embedView({
                            slotId: model.pips.id,
                            model: model.pips,
                            viewInputs: {
                              label: 'Level',
                              animate,
                              motionValues: pipsMotion.node,
                              context,
                            },
                          }),
                        ),
                      ],
                    ),
                    h.section(
                      [],
                      [
                        h.h2(
                          [h.Class('m-[0_0_16px] text-[13px] font-normal')],
                          ['Comfortable scrubber'],
                        ),
                        h.block(
                          Scrubber.embedView({
                            slotId: model.scrubber.id,
                            model: model.scrubber,
                            viewInputs: {
                              label: 'Opacity',
                              animate,
                              motionValues: scrubberMotion.node,
                              context,
                            },
                          }),
                        ),
                      ],
                    ),
                  ],
                ),
                h.div(
                  [h.Class('w-130 mt-8')],
                  [
                    h.block(
                      Ask.embedView({
                        slotId: model.ask.id,
                        model: model.ask,
                        viewInputs: {
                          animate,
                          animateHighlight: hoverHighlightAnimation(motion),
                          animateSelection: selectionBackgroundAnimation(motion),
                          context,
                        },
                      }),
                    ),
                  ],
                ),
                Button.view(
                  {
                    type: 'reset',
                    toView: (attributes) =>
                      h.button(
                        [
                          h.Class('p-[4px_8px] [border:1px_solid_var(--border)]'),
                          ...attributes.button,
                          h.Id('form-reset'),
                        ],
                        ['Reset'],
                      ),
                  },
                  h,
                ),
              ],
            )
          : null,
        h.output(
          [h.Class('block mt-6 text-[12px] wrap-anywhere'), h.Id('slider-ask-state')],
          [
            JSON.stringify({
              radix: model.radix.settings.value,
              base: model.base.settings.value,
              pips: model.pips.settings.value,
              scrubber: model.scrubber.settings.value,
              answers: model.answers,
              index: model.index,
              events: model.events,
            }),
          ],
        ),
      ],
    ),
  }
})

export const SliderAskExampleLayer = SliderAskExampleBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.merge(sliderLayer, askLayer)),
)

export const SliderAskMotionLayer = Layer.mergeAll(
  motion.layer,
  radixMotion.layer,
  baseMotion.layer,
  pipsMotion.layer,
  scrubberMotion.layer,
)

export const sliderAskEnvironment = (
  document: Document | undefined,
  platform: string,
): ReturnType<typeof createAskUserQuestionsLayer> =>
  createAskUserQuestionsLayer({
    document,
    platform,
    validators: {
      ask: { text: (value) => (value.length < 4 ? 'Use at least four characters.' : null) },
    },
  })
