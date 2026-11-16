import { Button } from '@foldkit/ui'
import { Boolean, Number } from 'effect'
import { examplePresentation } from './example-presentation.js'
import { Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineMessageUnion } from 'foldkit/message'
import {
  ThinkingIndicatorBlock,
  thinkingIndicatorAnimations,
  layer as indicatorLayer,
} from '@foldkit-visuals/fluid/thinking-indicator'
import { ThinkingStepBlock, layer as stepLayer } from '@foldkit-visuals/fluid/thinking-step'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { ThinkingDemoBlock } from './thinking-example-playback.js'
import { layer as demoLayer, targetMotion, motion } from './thinking-example-block.js'
import { demos } from './thinking-example-data.js'
import './thinking-example.css'

const Model = Schema.Struct({
  indicator: ThinkingIndicatorBlock.Model,
  step: ThinkingStepBlock.Model,
  demos: Schema.Record(Schema.String, ThinkingDemoBlock.Model),
  isIconVisible: Schema.Boolean,
  isCompact: Schema.Boolean,
  isMounted: Schema.Boolean,
  generation: Schema.Natural,
})

const Message = defineMessageUnion({
  ClickedIcon: {},
  ClickedSize: {},
  ClickedMount: {},
  ClickedStep: {},
})

export const ThinkingExampleKey = Symbol('ThinkingExample')

const effects = Block.makeEffectsContract()

const ThinkingExampleBlock = Block.make('ThinkingExample', {
  key: ThinkingExampleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  effects,
  view: { kind: 'Document' },
})

const Indicator = ThinkingExampleBlock.makeRequiredFieldBinding(ThinkingIndicatorBlock, {
  field: 'indicator',
  init: {
    contextToArgs: () => [
      {
        id: 'thinking-indicator',
        reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      },
    ],
  },
})

const Step = ThinkingExampleBlock.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'step',
  init: { contextToArgs: () => [{ id: 'thinking-current-step' }] },
})

const Demos = ThinkingExampleBlock.makeRecordBinding(ThinkingDemoBlock, { field: 'demos' })

const ThinkingExampleComposition = ThinkingExampleBlock.makeComposition({
  bindings: [Indicator, Step, Demos],
})

const initDemos = ThinkingExampleBlock.makeStep((model) =>
  Update.combineSteps(
    demos.map((demo) =>
      ThinkingExampleBlock.makeStep((current) =>
        initAndInsert(Demos, current, { key: `${demo.id}-${model.generation}`, args: [demo.id] }),
      ),
    ),
  ),
)

const rootInit = ThinkingExampleComposition.makeInit(() => ({
  model: { demos: {}, isIconVisible: true, isCompact: false, isMounted: true, generation: 0 },
  steps: [initDemos],
}))

const rootUpdate = ThinkingExampleComposition.makeUpdate({
  ClickedIcon: ThinkingExampleBlock.makeFieldsStep(() => ({ isIconVisible: Boolean.not })),
  ClickedSize: ThinkingExampleBlock.makeFieldsStep(() => ({ isCompact: Boolean.not })),
  ClickedStep: ThinkingExampleBlock.makeStep((model) =>
    Step.requestConfigure({ status: model.step.status === 'pending' ? 'complete' : 'pending' }),
  ),
  ClickedMount: ThinkingExampleBlock.makeStep((model) =>
    Update.combineSteps([
      ThinkingExampleBlock.makeFieldsStep(() => ({
        isMounted: Boolean.not,
        generation: Number.increment,
        demos: () => ({}),
      })),
      ...(model.isMounted ? [] : [initDemos]),
    ]),
  ),
})

const rootView = ThinkingExampleComposition.makeView((model, h) => ({
  title: 'Thinking Steps',
  body: h.main(
    [
      h.Class(
        "max-w-170 m-[0_auto] p-[48px_24px_96px] [&_h1]:text-[28px] [&_h1]:leading-[34px] [&_h1]:mb-2 [&_h1]:[font-variation-settings:'wght'_700,'opsz'_25] [&_>_p]:text-[13px] [&_>_p]:leading-[20px] [&_>_p]:[color:var(--muted-foreground)] [&_>_p]:mb-6",
      ),
    ],
    [
      h.h1([], ['Thinking Steps']),
      h.p([], ['Collapsible steps with streaming text, sources, details, and images.']),
      h.div(
        [h.Class('flex gap-2 flex-wrap m-[16px_0]')],
        [
          Button.view(
            {
              onClick: Message.ClickedIcon(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('toggle-icon')], ['Toggle indicator icon']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedSize(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('toggle-size')], ['Toggle indicator size']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedMount(),
              toView: (attributes) =>
                h.button(
                  [...attributes.button, h.Id('toggle-mount')],
                  [model.isMounted ? 'Unmount examples' : 'Mount examples'],
                ),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedStep(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('toggle-step')], ['Toggle completed step']),
            },
            h,
          ),
        ],
      ),
      ...(model.isMounted
        ? [
            h.block(
              Indicator.embedView({
                slotId: 'indicator',
                model: model.indicator,
                viewInputs: {
                  ...thinkingIndicatorAnimations(targetMotion),
                  showIcon: model.isIconVisible,
                  size: model.isCompact ? 'compact' : 'default',
                  ...examplePresentation,
                },
              }),
            ),
            h.block(
              Step.embedView({
                slotId: 'standalone-step',
                model: model.step,
                viewInputs: {
                  animate: targetMotion.node,
                  label: 'Reviewed evidence',
                  description: 'Source step enter and exit',
                  showIcon: model.isIconVisible,
                  isLast: true,
                  context: createPresentationContext({
                    size: model.isCompact ? 'compact' : 'default',
                    reducedMotion: 'user',
                    ...examplePresentation,
                  }),
                  ...examplePresentation,
                },
              }),
            ),
            ...demos.map((demo) => {
              const key = `${demo.id}-${model.generation}`
              const child = model.demos[key]

              if (child === undefined) {
                throw new Error(`Missing Thinking demo: ${key}`)
              }

              return h.block(Demos.embedView({ key, slotId: key, model: child }))
            }),
          ]
        : []),
    ],
  ),
}))

const layer = ThinkingExampleBlock.makeLayer({
  init: rootInit,
  update: rootUpdate,
  view: rootView,
}).pipe(Layer.provide(Layer.mergeAll(demoLayer, indicatorLayer, stepLayer)))

Runtime.run(
  Program.make({
    block: ThinkingExampleBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide({ services: Layer.empty, runtime: Layer.mergeAll(targetMotion.layer, motion.layer) }),
)
