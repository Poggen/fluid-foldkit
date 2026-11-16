import { Button } from '@foldkit/ui'
import { modifyFields } from 'foldkit/struct'
import { examplePresentation } from './example-presentation.js'
import { Context, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { Tooltip } from '@foldkit/ui'
import { createLayoutMotionScope } from '@foldkit-visuals/fluid/motion/layout'
import { EXIT_COMPLETE_EVENT } from '@foldkit-visuals/fluid/motion/target'
import { InputMessageQueueRow } from '@foldkit-visuals/fluid/input-message-queue'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'

const Row = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  present: Schema.Boolean,
  secondary: Schema.Boolean,
  initial: Schema.Boolean,
  generation: Schema.Natural,
})
const initialRows = [
  {
    id: 'research',
    text: 'Review the research notes',
    present: true,
    secondary: false,
    initial: false,
    generation: 0,
  },
  {
    id: 'summary',
    text: 'Summarize the findings',
    present: true,
    secondary: false,
    initial: false,
    generation: 0,
  },
  {
    id: 'share',
    text: 'Share the next steps',
    present: true,
    secondary: false,
    initial: false,
    generation: 0,
  },
]
const Model = Schema.Struct({
  rows: Schema.Array(Row),
  pending: Schema.Array(Row),
  revision: Schema.Natural,
  researchTip: Tooltip.TooltipBlock.Model,
  researchSecondaryTip: Tooltip.TooltipBlock.Model,
  summaryTip: Tooltip.TooltipBlock.Model,
  shareTip: Tooltip.TooltipBlock.Model,
})
const Message = defineMessageUnion({
  ClickedReverse: {},
  ClickedTransfer: {},
  ClickedRestore: {},
  ClickedRemove: { id: Schema.String },
  CompletedRowExit: { id: Schema.String, generation: Schema.Natural },
  CompletedCapture: { revision: Schema.Natural },
  Completed: {},
})
const key = Symbol('InputQueueLayoutExample')
export const InputQueueLayoutExampleBlock = Block.make('InputQueueLayoutExample', {
  key,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<never>(),
})
const Root = InputQueueLayoutExampleBlock
class LayoutScope extends Context.Service<
  LayoutScope,
  ReturnType<typeof createLayoutMotionScope>
>()('InputQueueLayoutExample/Motion') {}
const Capture = Root.makeCommand('Capture', {
  args: { revision: Schema.Natural },
  messages: [Message.CompletedCapture],
  *handler() {
    const motion = yield* LayoutScope
    return ({ revision }) =>
      motion.capture(revision).pipe(Effect.as(Message.CompletedCapture({ revision })))
  },
})
const Commit = Root.makeCommand('Commit', {
  args: { revision: Schema.Natural },
  messages: [Message.Completed],
  *handler() {
    const motion = yield* LayoutScope
    return ({ revision }) => motion.commit(revision).pipe(Effect.as(Message.Completed()))
  },
})
const Cancel = Root.makeCommand('Cancel', {
  args: { revision: Schema.Natural },
  messages: [Message.Completed],
  *handler() {
    const motion = yield* LayoutScope
    return ({ revision }) => motion.cancel(revision).pipe(Effect.as(Message.Completed()))
  },
})
const fold = Root.makeOutMessageFold(Tooltip.TooltipBlock, {
  Shown: () => Root.makeNoopStep(),
  Hidden: () => Root.makeNoopStep(),
})
const Research = Root.makeRequiredFieldBinding(Tooltip.TooltipBlock, {
  field: 'researchTip',
  init: { contextToArgs: () => [{ id: 'queue-research' }] },
}).withOutMessagePolicy({ fold })
const ResearchSecondary = Root.makeRequiredFieldBinding(Tooltip.TooltipBlock, {
  field: 'researchSecondaryTip',
  init: { contextToArgs: () => [{ id: 'queue-research-secondary' }] },
}).withOutMessagePolicy({ fold })
const Summary = Root.makeRequiredFieldBinding(Tooltip.TooltipBlock, {
  field: 'summaryTip',
  init: { contextToArgs: () => [{ id: 'queue-summary' }] },
}).withOutMessagePolicy({ fold })
const Share = Root.makeRequiredFieldBinding(Tooltip.TooltipBlock, {
  field: 'shareTip',
  init: { contextToArgs: () => [{ id: 'queue-share' }] },
}).withOutMessagePolicy({ fold })
const composition = Root.makeComposition({
  bindings: [Research, ResearchSecondary, Summary, Share],
})
const init = composition.makeInit(() => ({
  model: { rows: initialRows, pending: initialRows, revision: 0 },
}))
function request(model: Model, pending: ReadonlyArray<Row>) {
  const revision = model.revision + 1
  return {
    model: modifyFields(model, { pending: () => pending, revision: () => revision }),
    commands: [Capture({ revision })],
  }
}
const update = composition.makeUpdate({
  ClickedReverse: (model) => request(model, [...model.pending].reverse()),
  ClickedTransfer: (model) => {
    const current = model.pending.find((row) => row.id === 'research' && row.present)
    if (!current) return Root.makeNoopStep()(model)
    const destination = !current.secondary
    const generation = model.revision + 1
    const pending = model.pending.map((row) =>
      row.id !== 'research'
        ? row
        : {
            ...row,
            present: row.secondary === destination,
            generation,
            initial: false,
          },
    )
    if (!pending.some((row) => row.id === 'research' && row.secondary === destination))
      pending.push(
        modifyFields(current, {
          secondary: () => destination,
          generation: () => generation,
          initial: () => false,
        }),
      )
    return request(model, pending)
  },
  ClickedRestore: (model) =>
    request(
      model,
      initialRows.map((row) => ({
        ...row,
        generation: model.revision + 1,
        initial: !model.rows.some((current) => current.id === row.id),
      })),
    ),
  ClickedRemove: (model, { id }) =>
    request(
      model,
      model.pending.map((row) =>
        row.id === id ? { ...row, present: false, generation: model.revision + 1 } : row,
      ),
    ),
  CompletedRowExit: (model, { id, generation }) =>
    request(
      model,
      model.pending.filter((row) => row.id !== id || row.present || row.generation !== generation),
    ),
  CompletedCapture: (model, { revision }) =>
    revision === model.revision
      ? {
          model: modifyFields(model, { rows: () => model.pending }),
          commands: [Commit({ revision })],
        }
      : { model, commands: [Cancel({ revision })] },
  Completed: Root.makeNoopStep(),
})

/** Maintained public queue-row consumer. Pointer drag remains a separate Reorder migration. */
export function createInputQueueLayoutLayer(options: { readonly reduceMotion?: boolean } = {}) {
  const motion = createLayoutMotionScope('input-queue-layout')
  const context = createPresentationContext({
    reducedMotion: options.reduceMotion ? 'always' : 'user',
    ...examplePresentation,
  })
  const view = composition.makeView((model, h) =>
    motion.root(
      h.section(
        [h.Class('w-100 max-w-[calc(100vw-48px)] m-[48px_auto]'), h.AriaLabel('Queued messages')],
        [
          h.div(
            [h.Class('flex gap-4 mb-5 [&_button]:cursor-pointer')],
            [
              Button.view(
                {
                  onClick: Message.ClickedReverse(),
                  toView: (attributes) =>
                    h.button([...attributes.button, h.Id('queue-reverse')], ['Reverse order']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedRestore(),
                  toView: (attributes) =>
                    h.button([...attributes.button, h.Id('queue-restore')], ['Restore messages']),
                },
                h,
              ),
              Button.view(
                {
                  onClick: Message.ClickedTransfer(),
                  toView: (attributes) =>
                    h.button([...attributes.button, h.Id('queue-transfer')], ['Move research row']),
                },
                h,
              ),
            ],
          ),
          ...[false, true].map((secondary) =>
            h.ul(
              [
                h.Class('flex flex-col gap-2 mt-(--fluid-margin-top) ml-(--fluid-margin-left)'),
                h.Id(secondary ? 'queue-secondary' : 'queue-rows'),
                h.Style({
                  '--fluid-margin-top': secondary ? '120px' : '0px',
                  '--fluid-margin-left': secondary ? '80px' : '0px',
                }),
              ],
              model.rows
                .filter((row) => row.secondary === secondary)
                .map((row, index) => {
                  const binding =
                    row.id === 'research'
                      ? row.secondary
                        ? ResearchSecondary
                        : Research
                      : row.id === 'summary'
                        ? Summary
                        : Share
                  const tooltipModel =
                    row.id === 'research'
                      ? row.secondary
                        ? model.researchSecondaryTip
                        : model.researchTip
                      : row.id === 'summary'
                        ? model.summaryTip
                        : model.shareTip
                  return InputMessageQueueRow(
                    {
                      context,
                      animate: (node, options) =>
                        motion.node(node, { ...options, layoutId: row.id }),
                      tooltipKey: row.id,
                      item: { id: row.id, text: row.text, files: [] },
                      index,
                      total: model.rows.length,
                      present: row.present,
                      initial: row.initial,
                      reduceMotion: options.reduceMotion ?? false,
                      isTouch: true,
                      attributes: [
                        h.DataAttribute('queue-id', row.id),
                        h.DataAttribute('queue-location', row.secondary ? 'secondary' : 'primary'),
                        h.DataAttribute('present', String(row.present)),
                        {
                          _tag: 'OnCustomEvent',
                          name: EXIT_COMPLETE_EVENT,
                          f: () =>
                            Option.some(
                              Message.CompletedRowExit({ id: row.id, generation: row.generation }),
                            ),
                        },
                      ],
                      removeAttributes: childAttributes([
                        h.OnClick(Message.ClickedRemove({ id: row.id })),
                      ]),
                      labelNode: h.span([h.Class('min-w-0 flex-1 truncate')], [row.text]),
                      tooltip: ({ trigger }, options) =>
                        h.block(
                          binding.embedView({
                            slotId: tooltipModel.id,
                            model: tooltipModel,
                            viewInputs: {
                              anchor: { placement: 'top', gap: 6 },
                              toView: ({ trigger: attributes, panel, isVisible }) =>
                                h.div(
                                  [h.Class('contents')],
                                  [
                                    trigger({
                                      button: (own, children, buttonKey) =>
                                        h.button(
                                          [
                                            ...own,
                                            ...attributes,
                                            ...(buttonKey === undefined ? [] : [h.Key(buttonKey)]),
                                          ],
                                          children,
                                        ),
                                    }),
                                    isVisible
                                      ? h.div(
                                          [
                                            ...panel,
                                            h.Class(
                                              'rounded bg-foreground px-2 py-1 text-background text-xs',
                                            ),
                                          ],
                                          [options.content],
                                        )
                                      : null,
                                  ],
                                ),
                              ...examplePresentation,
                            },
                          }),
                        ),
                    },
                    h,
                  )
                }),
            ),
          ),
        ],
      ),
    ),
  )
  return Root.makeLayer({
    init,
    update,
    view,
    EffectsLayer: Layer.mergeAll(Capture.layer, Commit.layer, Cancel.layer).pipe(
      Layer.provide(Layer.succeed(LayoutScope, motion)),
    ),
  }).pipe(Layer.provide(Layer.mergeAll(motion.layer, Tooltip.layer)))
}

type Model = typeof Model.Type
type Row = typeof Row.Type
