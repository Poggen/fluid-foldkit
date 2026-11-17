import { Effect, Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { ThinkingStepsBlock, ThinkingStepsLayer } from '@foldkit-visuals/fluid/thinking-steps'
import { ThinkingStepBlock, layer as StepLayer } from '@foldkit-visuals/fluid/thinking-step'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs'
import {
  documentationFields,
  documentationDefaults,
  documentationInMessages,
} from './documentation.js'
import { docSection } from './doc-section.js'
import source from './thinking-trace.ts?raw'

const Message = defineMessageUnion({ ClickedRun: {}, CompletedRun: { generation: Schema.Natural } })
const key = Symbol('ThinkingTrace')
export const ThinkingTraceBlock = Block.make('ThinkingTrace', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    ...documentationFields,
    running: Schema.Boolean,
    generation: Schema.Natural,
    reasoning: ThinkingStepsBlock.Model,
    tools: ThinkingStepsBlock.Model,
    plan: ThinkingStepsBlock.Model,
    search: ThinkingStepBlock.Model,
    read: ThinkingStepBlock.Model,
    failure: ThinkingStepBlock.Model,
    imports: ThinkingStepBlock.Model,
    props: ThinkingStepBlock.Model,
    checker: ThinkingStepBlock.Model,
    tabs: PreviewControlsBlock.Model,
  }),
  Message,
  InMessage: defineInMessageUnion(documentationInMessages),
  view: { kind: 'Element' },
})
const Root = ThinkingTraceBlock
const Reasoning = Root.makeRequiredFieldBinding(ThinkingStepsBlock, {
  field: 'reasoning',
  init: { contextToArgs: () => [{ id: 'trace-reasoning', running: false }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(ThinkingStepsBlock, { OpenChanged: Root.makeNoopStep }),
})
const Tools = Root.makeRequiredFieldBinding(ThinkingStepsBlock, {
  field: 'tools',
  init: { contextToArgs: () => [{ id: 'trace-tools' }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(ThinkingStepsBlock, { OpenChanged: Root.makeNoopStep }),
})
const Plan = Root.makeRequiredFieldBinding(ThinkingStepsBlock, {
  field: 'plan',
  init: { contextToArgs: () => [{ id: 'trace-plan' }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(ThinkingStepsBlock, { OpenChanged: Root.makeNoopStep }),
})
const Search = Root.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'search',
  init: { contextToArgs: () => [{ id: 'trace-search' }] },
})
const Read = Root.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'read',
  init: { contextToArgs: () => [{ id: 'trace-read' }] },
})
const Failure = Root.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'failure',
  init: { contextToArgs: () => [{ id: 'trace-failure', status: 'error' as const }] },
})
const Imports = Root.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'imports',
  init: { contextToArgs: () => [{ id: 'trace-imports' }] },
})
const Props = Root.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'props',
  init: { contextToArgs: () => [{ id: 'trace-props', status: 'active' as const }] },
})
const Checker = Root.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'checker',
  init: { contextToArgs: () => [{ id: 'trace-checker', status: 'upcoming' as const }] },
})
const tabsId = previewCodeTabId('thinking-steps', 'trace')
const Tabs = Root.makeRequiredFieldBinding(PreviewControlsBlock, {
  field: 'tabs',
  init: { contextToArgs: () => [{ id: tabsId, idPrefix: tabsId, selectedIndex: 0 }] },
})
const Composition = Root.makeComposition({
  bindings: [Reasoning, Tools, Plan, Search, Read, Failure, Imports, Props, Checker, Tabs],
})
export const FinishThinkingTrace = Root.makeCommand('FinishThinkingTrace', {
  args: { generation: Schema.Natural },
  messages: [Message.CompletedRun],
  *handler() {
    return ({ generation }) =>
      Effect.sleep('2400 millis').pipe(Effect.as(Message.CompletedRun({ generation })))
  },
})
const init = Composition.makeInit(() => ({
  model: { ...documentationDefaults, running: false, generation: 0 },
}))
const update = Composition.makeUpdate({
  ClickedRun: Root.makeStep((model) =>
    model.running
      ? Root.makeNoopStep()
      : Update.combineSteps([
          Root.makeFieldsStep(() => ({
            running: () => true,
            generation: () => model.generation + 1,
          })),
          Reasoning.requestConfigure({ open: null, disabled: false, running: true }),
          Root.makeCommandsStep(() => [FinishThinkingTrace({ generation: model.generation + 1 })]),
        ]),
  ),
  CompletedRun: Root.makeStep((model, { generation }) =>
    generation !== model.generation
      ? Root.makeNoopStep()
      : Update.combineSteps([
          Root.makeFieldsStep(() => ({ running: () => false })),
          Reasoning.requestConfigure({ open: null, disabled: false, running: false }),
        ]),
  ),
})
const inMessageUpdate = Composition.makeInMessageUpdate({
  InformedOfDocumentation: Root.makeStep((_model, { shape, size, hoverMode, embedded }) =>
    Update.combineSteps([
      Root.makeFieldsStep(() => ({
        docShape: () => shape,
        docSize: () => size,
        docHover: () => hoverMode,
        isDocEmbedded: () => embedded,
      })),
      Tabs.requestHoverMode({ mode: hoverMode }),
    ]),
  ),
})
const makeView = (motion: ReturnType<typeof createTargetMotionScope>) =>
  Composition.makeView((model, h) => {
    const context = createPresentationContext({
      shape: model.docShape,
      size: model.docSize,
      hoverMode: model.docHover,
    })
    const animate = motion.node
    return docSection(h, {
      title: 'Reasoning, tools and plans',
      source,
      presentation: { context },
      pane: model.tabs.tabs.selectedIndex === 1 ? 'code' : 'preview',
      tabsId,
      tabs: h.block(
        Tabs.embedView({
          slotId: tabsId,
          model: model.tabs,
          viewInputs: previewCodeTabsViewInputs(h, {
            context,
            animate,
            ariaLabel: 'trace example view',
          }),
        }),
      ),
      children: [
        h.div(
          [h.Id('thinking-trace'), h.Class('flex w-full max-w-[360px] flex-col gap-4')],
          [
            h.div(
              [h.Class('flex flex-col items-start gap-1')],
              [
                h.block(
                  Reasoning.embedView({
                    slotId: 'reasoning',
                    model: model.reasoning,
                    viewInputs: {
                      context,
                      animate,
                      label: () => (model.running ? 'Thinking' : 'Thought'),
                      ...(model.running ? {} : { meta: () => '12s' }),
                      content: () => [
                        'The build is slow because image optimization runs on every deploy: its cache key includes the commit hash, so nothing is ever reused.',
                      ],
                    },
                  }),
                ),
                h.button(
                  [
                    h.Type('button'),
                    h.Disabled(model.running),
                    h.OnClick(Message.ClickedRun()),
                    h.Class(
                      'ml-3 cursor-pointer text-site-caption text-muted-foreground underline underline-offset-2 outline-none hover:text-foreground disabled:cursor-default disabled:opacity-50 focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                    ),
                  ],
                  ['Think again'],
                ),
              ],
            ),
            h.block(
              Tools.embedView({
                slotId: 'tools',
                model: model.tools,
                viewInputs: {
                  context,
                  animate,
                  label: () => 'Worked',
                  meta: () => '3 steps',
                  content: () => [
                    h.block(
                      Search.embedView({
                        slotId: 'search',
                        model: model.search,
                        viewInputs: {
                          context,
                          animate,
                          label: 'Searched the docs',
                          icon: 'search',
                          meta: () => '0.4s',
                        },
                      }),
                    ),
                    h.block(
                      Read.embedView({
                        slotId: 'read',
                        model: model.read,
                        viewInputs: {
                          context,
                          animate,
                          label: 'Read the Image component docs',
                          icon: 'globe',
                          href: 'https://nextjs.org/docs/app/api-reference/components/image',
                        },
                      }),
                    ),
                    h.block(
                      Failure.embedView({
                        slotId: 'failure',
                        model: model.failure,
                        viewInputs: {
                          context,
                          animate,
                          label: 'Failed to run pnpm lint',
                          icon: 'circle-alert',
                          isLast: true,
                        },
                      }),
                    ),
                  ],
                },
              }),
            ),
            h.block(
              Plan.embedView({
                slotId: 'plan',
                model: model.plan,
                viewInputs: {
                  context,
                  animate,
                  label: () => 'Plan',
                  meta: () => '1 of 3 done',
                  content: () => [
                    h.block(
                      Imports.embedView({
                        slotId: 'imports',
                        model: model.imports,
                        viewInputs: {
                          context,
                          animate,
                          label: 'Replace the imports',
                          icon: 'check',
                        },
                      }),
                    ),
                    h.block(
                      Props.embedView({
                        slotId: 'props',
                        model: model.props,
                        viewInputs: {
                          context,
                          animate,
                          label: 'Renaming the props',
                          icon: 'loader',
                        },
                      }),
                    ),
                    h.block(
                      Checker.embedView({
                        slotId: 'checker',
                        model: model.checker,
                        viewInputs: {
                          context,
                          animate,
                          label: 'Run the type checker',
                          icon: 'circle',
                          isLast: true,
                        },
                      }),
                    ),
                  ],
                },
              }),
            ),
          ],
        ),
      ],
    })
  })
export const layer = Root.makeLayer(
  Effect.gen(function* () {
    const children = yield* Composition.acquireChildren()
    const motion = createTargetMotionScope('thinking-trace')
    yield* Layer.build(motion.layer)
    return {
      children,
      init,
      update,
      inMessageUpdate,
      view: makeView(motion),
      EffectsLayer: FinishThinkingTrace.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(ThinkingStepsLayer, StepLayer, PreviewControlsLayer)))
