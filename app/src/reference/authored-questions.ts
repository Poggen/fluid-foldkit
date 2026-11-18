import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import {
  hoverModeOf as questionsHoverModeOf,
  radiusOf as questionsRadiusOf,
} from '@foldkit-visuals/fluid/ask-user-questions'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
/* @license Derived from Fluid Functionalism cc276ca0 AskUserQuestions docs. MIT. */
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { childAttributes } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { AskUserQuestionsBlock, layer as AskLayer } from '@foldkit-visuals/fluid/ask-user-questions'
import type { AskUserQuestion } from '@foldkit-visuals/fluid/ask-user-questions'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { DocumentTooltipBlock, layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import { shapeMap } from '@foldkit-visuals/fluid/tokens'
import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { motion, highlight, target } from '../motion'
import { ComponentPresentation, presentation } from '../settings'
import {
  multipleQuestions,
  multiSelectQuestions,
  otherQuestions,
  freeTextQuestions,
  validateQuestions,
  skipQuestions,
  chipLeftQuestions,
} from './question-data'
import { stackedQuestions } from './stacked-question-data'
import { documentationRuntime } from '../documentation-runtime'
export const questionScenes: ReadonlyArray<{
  readonly key: string
  readonly title: string
  readonly questions: ReadonlyArray<AskUserQuestion>
}> = [
  { key: 'multiple', title: 'Multiple questions', questions: multipleQuestions },
  { key: 'multi-select', title: 'Multi-select', questions: multiSelectQuestions },
  { key: 'other', title: 'With other', questions: otherQuestions },
  { key: 'text', title: 'Free text', questions: freeTextQuestions },
  { key: 'validation', title: 'Free text validation', questions: validateQuestions },
  { key: 'skip', title: 'Skippable', questions: skipQuestions },
  { key: 'chip-left', title: 'Chip on left', questions: chipLeftQuestions },
  { key: 'stacked', title: 'Stacked layout', questions: stackedQuestions },
  { key: 'controlled', title: 'Controlled', questions: multipleQuestions },
]
export const questionValidators = {
  'docs-ask-validation': {
    email: (value: string) =>
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(value)
        ? null
        : 'Please enter a valid email so we can reach out.',
  },
}
const documentationTabsFor = (
  models: Readonly<Record<string, typeof PreviewControlsBlock.Model.Type>>,
  section: string,
) => {
  const child = models[section]
  if (child === undefined) throw new Error(`Missing documentation tabs ${section}`)
  return child
}
const key = Symbol('AuthoredQuestions')
export const AuthoredQuestionsBlock = Block.make('AuthoredQuestions', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    questions: Schema.Record(Schema.String, AskUserQuestionsBlock.Model),
    documentationTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
    tooltips: DocumentTooltipBlock.Model,
  }),
  Message: defineMessageUnion({
    Replayed: { key: Schema.String },
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof AskUserQuestionsBlock>['programRequirements']
    | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredQuestionsBlock
const Tooltips = Root.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DocumentTooltipBlock, { Transaction: Root.makeNoopStep }),
})
const RawQuestions = Root.makeRecordBinding(AskUserQuestionsBlock, { field: 'questions' })
const Questions = RawQuestions.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(AskUserQuestionsBlock, {
      Events: ({ events }) =>
        Root.makeStep((model) => {
          const child = model.questions[key]
          if (key !== 'controlled' || child === undefined) return { model }
          const changed = events.findLast((event) => event._tag === 'CurrentIndexChanged'),
            answers = events.findLast(
              (event) => event._tag === 'AnswersChanged' || event._tag === 'Completed',
            )
          return RawQuestions.requestConfigure(key, {
            config: {
              questions: multipleQuestions,
              currentIndex: events.some((event) => event._tag === 'Completed')
                ? 0
                : (changed?.index ?? child.flow.index),
              answers: answers?.answers ?? child.flow.answers,
            },
          })
        }),
    }),
})
const DocumentationTabs = Root.makeRecordBinding(PreviewControlsBlock, {
  field: 'documentationTabs',
})
const documentationTabsHover = (mode: 'fluid' | 'standard') =>
  Root.makeStep((model) =>
    Update.combineSteps(
      Object.entries(model.documentationTabs).flatMap(([section, child]) =>
        tabsHoverModeOf(child) === mode
          ? []
          : [DocumentationTabs.requestHoverMode(section, { mode: mode })],
      ),
    ),
  )
const initDocumentationTabs = Root.makeStep(() =>
  Update.combineSteps(
    questionScenes
      .map((scene) => scene.key)
      .map((section) =>
        Root.makeStep((model) =>
          initAndInsert(DocumentationTabs, model, {
            key: section,
            args: [
              {
                id: previewCodeTabId('ask-user-questions', section),
                idPrefix: previewCodeTabId('ask-user-questions', section),
                selectedIndex: 0,
              },
            ],
          }),
        ),
      ),
  ),
)
const Composition = Root.makeComposition({ bindings: [DocumentationTabs, Questions, Tooltips] })
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: { questions: {}, documentationTabs: {} },
    steps: [
      initDocumentationTabs,
      ...questionScenes.map((scene) =>
        Tooltips.requestAdd({ key: `docs-ask-replay-${scene.key}`, options: { side: 'top' } }),
      ),
      ...questionScenes.map((scene) =>
        Root.makeStep((model) =>
          initAndInsert(Questions, model, {
            key: scene.key,
            args: [
              {
                id: `docs-ask-${scene.key}`,
                questions: scene.questions,
                ...(scene.key === 'controlled' ? { currentIndex: 0, answers: {} } : {}),
              },
            ],
          }),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({
    Replayed: Root.makeStep.fromMessage(({ key }) => {
      const scene = questionScenes.find((scene) => scene.key === key)
      return scene === undefined
        ? Root.makeNoopStep()
        : Questions.requestReset(key, {
            config: {
              questions: scene.questions,
              ...(key === 'controlled' ? { currentIndex: 0, answers: {} } : {}),
            },
          })
    }),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        documentationTabsHover(settings.hover),
        ...Object.entries(model.questions).flatMap(([key, child]) => [
          ...(questionsHoverModeOf(child) === settings.hover
            ? []
            : [Questions.requestHoverMode(key, { mode: settings.hover })]),
          ...(questionsRadiusOf(child) === shapeMap[settings.shape].mergedRadius
            ? []
            : [Questions.requestRadius(key, { radius: shapeMap[settings.shape].mergedRadius })]),
        ]),
      ]),
    ),
  }),
  view: Composition.makeView.withInputs((model, { settings, ready }, h) => {
    if (!ready) return h.empty
    const context = presentation(settings)
    return h.block(
      Tooltips.embedView({
        slotId: 'docs-ask-tooltips',
        model: model.tooltips,
        viewInputs: {
          renderDocument: (content, popups) => h.div([h.Class('contents')], [content, ...popups]),
          renderTrigger: (key, { button }) =>
            Button(
              {
                context,
                variant: 'ghost',
                buttonSize: 'icon',
                children: [defaultIcons['rotate-ccw']({ size: 16, strokeWidth: 1.5 }, h)],
                attributes: [
                  h.AriaLabel('Replay'),
                  h.OnClick(Root.Message.Replayed({ key: key.replace(/^docs-ask-replay-/u, '') })),
                ],
                render: (attributes, children) =>
                  button(
                    attributes.flatMap((attribute) =>
                      '__childAttribute' in attribute ? [attribute] : childAttributes([attribute]),
                    ),
                    children,
                  ),
              },
              h,
            ),
          render: ({ tooltip }) =>
            h.div(
              [],
              questionScenes.flatMap((scene) => {
                const child = model.questions[scene.key]
                return child === undefined
                  ? []
                  : [
                      docSection(h, {
                        title: scene.title,
                        source: documentationRuntime().sources['authored-questions'],
                        presentation: { context },
                        pane:
                          model.documentationTabs[scene.key]?.tabs.selectedIndex === 1
                            ? 'code'
                            : 'preview',
                        tabsId: previewCodeTabId('ask-user-questions', scene.key),
                        tabs: h.block(
                          DocumentationTabs.embedView({
                            key: scene.key,
                            slotId: previewCodeTabId('ask-user-questions', scene.key),
                            model: documentationTabsFor(model.documentationTabs, scene.key),
                            viewInputs: previewCodeTabsViewInputs(h, {
                              context,
                              animate: target.node,
                              ariaLabel: `${scene.key} example view`,
                            }),
                          }),
                        ),
                        previewMinHeight: 560,
                        previewAlign: 'bottom',
                        className: 'w-full',
                        actions: [
                          tooltip(`docs-ask-replay-${scene.key}`, {
                            content: 'Replay',
                            shapeClass: settings.shape === 'sharp' ? 'rounded-none' : 'rounded-lg',
                            animate: target.node,
                            reducedMotion: 'user',
                          }),
                        ],
                        children: [
                          h.block(
                            Questions.embedView({
                              key: scene.key,
                              slotId: child.id,
                              model: child,
                              viewInputs: {
                                context,
                                animate: motion.node,
                                animateHighlight: highlight,
                                animateSelection: selectionBackgroundAnimation(motion),
                              },
                            }),
                          ),
                        ],
                      }),
                    ]
              }),
            ),
        },
      }),
    )
  }),
}).pipe(Layer.provide(Layer.mergeAll(AskLayer, PreviewControlsLayer, TooltipLayer)))
