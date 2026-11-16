import { Button } from '@foldkit-visuals/fluid/button'
import { observeQueueEnvironment, QueueEnvironment } from './input-queue-example-environment.js'
import { Array, Boolean, Number } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { examplePresentation } from './example-presentation.js'
import type {
  TooltipDom,
  DocumentTooltipOccurrenceViewInputs,
} from '@foldkit-visuals/fluid/tooltip'
import type { InputMessageQueueNative } from '@foldkit-visuals/fluid/input-message-queue'
import type { FileThumbnailResources } from '@foldkit-visuals/fluid/file-thumbnail'
import type { TouchPrimaryResources } from '@foldkit-visuals/fluid/touch-primary'
import type { QueuedStackFrames } from '@foldkit-visuals/fluid/queued-stack'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  InputMessageQueueBlock,
  layer as QueueLayer,
  QueuedMessage,
  inputMessageRemoveTooltipKey,
} from '@foldkit-visuals/fluid/input-message-queue'
import { QueuedStackBlock, layer as StackLayer } from '@foldkit-visuals/fluid/queued-stack'
import { DocumentTooltipBlock, layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { createReorderScope } from '@foldkit-visuals/fluid/reorder'
import { ChatMessageBlock, layer as ChatLayer } from '@foldkit-visuals/fluid/chat-message'

const initialQueue = [
  { id: 'research', text: 'Review the research notes', files: [] },
  { id: 'summary', text: 'Summarize the findings', files: [] },
  { id: 'share', text: 'Share the next steps', files: [] },
]

const attachment = {
  id: 'attachment',
  text: 'Review the attachment',
  files: [
    { id: 'queue-image', name: 'notes.svg', type: 'image/svg+xml', size: 112, lastModified: 0 },
  ],
}

const items = [...initialQueue, attachment]

const Model = Schema.Struct({
  environment: QueueEnvironment,
  queue: Schema.Array(QueuedMessage),
  isHoldOrder: Schema.Boolean,
  maybePendingOrder: Schema.Option(Schema.Array(Schema.String)),
  sent: Schema.Array(QueuedMessage),
  messages: Schema.Record(Schema.String, ChatMessageBlock.Model),
  maybeMorph: Schema.Option(Schema.Struct({ id: Schema.String, generation: Schema.Natural })),
  morphGeneration: Schema.Natural,
  revision: Schema.Natural,
  isMounted: Schema.Boolean,
  edit: Schema.String,
  inline: InputMessageQueueBlock.Model,
  stack: QueuedStackBlock.Model,
  tooltips: DocumentTooltipBlock.Model,
})

const Message = defineMessageUnion({
  ObservedEnvironment: { environment: QueueEnvironment },
  ClickedReverse: {},
  ClickedHoldOrder: {},
  ClickedAcceptOrder: {},
  ClickedRestore: {},
  ClickedClear: {},
  ClickedDispatch: {},
  ClickedAttachment: {},
  ClickedMount: {},
  CompletedWaitBeforeMorph: { generation: Schema.Natural },
  InterruptedMorph: {},
})

const InputQueueExampleKey = Symbol('InputQueueExample')

const effects = Block.makeEffectsContract<
  never,
  | InputMessageQueueNative
  | TooltipDom
  | FileThumbnailResources
  | TouchPrimaryResources
  | QueuedStackFrames
>()

export const InputQueueExampleBlock = Block.make('InputQueueExample', {
  key: InputQueueExampleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Element' },
  effects,
})

const Root = InputQueueExampleBlock

const ObserveEnvironment = Root.makeMountStream('ObserveEnvironment', {
  messages: [Message.ObservedEnvironment],
  *handler() {
    return ({ element, viewStateChanges }) =>
      observeQueueEnvironment(element, viewStateChanges, (environment) =>
        Message.ObservedEnvironment({ environment }),
      )
  },
})

const WaitBeforeMorph = Root.makeCommand('WaitBeforeMorph', {
  args: { generation: Schema.Natural },
  messages: [Message.CompletedWaitBeforeMorph],
  interrupt: { keyFields: ['generation'], toKey: ({ generation }) => String(generation) },
  *handler() {
    return ({ generation }) =>
      Effect.sleep('450 millis').pipe(Effect.as(Message.CompletedWaitBeforeMorph({ generation })))
  },
})

const Chats = Root.makeRecordBinding(ChatMessageBlock, { field: 'messages' })

const Inline = Root.makeRequiredFieldBinding(InputMessageQueueBlock, {
  field: 'inline',
  init: { contextToArgs: () => [{ id: 'queue-inline', items: initialQueue }] },
})

const Stack = Root.makeRequiredFieldBinding(QueuedStackBlock, {
  field: 'stack',
  init: { contextToArgs: () => [{ id: 'queue-stack', queue: initialQueue, bottom: 16 }] },
})

const Tooltips = Root.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DocumentTooltipBlock, { Transaction: () => Root.makeNoopStep() }),
})

const configure = (queue: ReadonlyArray<QueuedMessage>) =>
  Update.combineSteps([
    Root.makeFieldsStep(() => ({
      queue: () => queue,
      revision: Number.increment,
      maybePendingOrder: () => Option.none(),
    })),
    Inline.requestConfigure({ items: queue, animateNew: true, reset: false }),
    Stack.requestConfigure({ queue, compact: false }),
  ])

const remove = (id: string, edit: boolean) =>
  Root.makeStep((model) =>
    Update.combineSteps([
      configure(model.queue.filter((item) => item.id !== id)),
      Root.makeFieldsStep(() => ({
        edit: () => (edit ? (model.queue.find((item) => item.id === id)?.text ?? '') : model.edit),
      })),
    ]),
  )

const acceptOrder = (ids: ReadonlyArray<string>) =>
  Root.makeStep((model) =>
    configure(
      ids.map((id) => {
        const item = model.queue.find((candidate) => candidate.id === id)

        if (item === undefined) {
          throw new Error(`Unknown queue item ${id}`)
        }

        return item
      }),
    ),
  )

const InlinePolicy = Inline.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(InputMessageQueueBlock, {
    Retired: () => Root.makeNoopStep(),
    EditRequested: ({ id }) => remove(id, true),
    RemoveRequested: ({ id }) => remove(id, false),
    OrderRequested: ({ ids }) =>
      Root.makeStep((model) =>
        model.isHoldOrder
          ? Root.makeFieldsStep(() => ({ maybePendingOrder: () => Option.some(ids) }))
          : acceptOrder(ids),
      ),
  }),
})

const StackPolicy = Stack.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(QueuedStackBlock, {
    PresentationChanged: () => Root.makeNoopStep(),
    QueueChanged: ({ queue }) => configure(queue),
    EditRequested: ({ item }) => remove(item.id, true),
    RemoveRequested: ({ item }) => remove(item.id, false),
  }),
})

const composition = Root.makeComposition({
  bindings: [InlinePolicy, StackPolicy, Tooltips, Chats],
  mounts: [ObserveEnvironment],
})

const tooltipKeys = [
  'queue-stack/count',
  'queue-stack/collapse',
  ...items.flatMap((item) => [
    inputMessageRemoveTooltipKey('queue-inline', item.id),
    `queue-stack/edit/${item.id}`,
    `queue-stack/remove/${item.id}`,
  ]),
]

const init = composition.makeInit(() => ({
  model: {
    environment: { isTouch: false, isReducedMotion: false },
    queue: initialQueue,
    isHoldOrder: false,
    maybePendingOrder: Option.none(),
    sent: [],
    messages: {},
    maybeMorph: Option.none(),
    morphGeneration: 0,
    revision: 0,
    isMounted: true,
    edit: '',
  },
  steps: tooltipKeys.map((key) =>
    Tooltips.requestAdd({
      key,

      groupKey: 'queue-tooltips',
      options: { side: key.endsWith('/count') || key.endsWith('/collapse') ? 'left' : 'top' },
    }),
  ),
}))

const update = composition.makeUpdate({
  ObservedEnvironment: Root.makeFieldsStep.fromMessage(({ environment }) => ({
    environment: () => environment,
  })),
  ClickedHoldOrder: Root.makeFieldsStep(() => ({ isHoldOrder: Boolean.not })),
  ClickedAcceptOrder: Root.makeStep((model) =>
    Option.isSome(model.maybePendingOrder)
      ? Update.combineSteps([
          acceptOrder(model.maybePendingOrder.value),
          Root.makeFieldsStep(() => ({ maybePendingOrder: () => Option.none() })),
        ])
      : Root.makeNoopStep(),
  ),
  ClickedReverse: Root.makeStep((model) => configure(model.queue.toReversed())),
  ClickedRestore: Root.makeStep((model) =>
    Update.combineSteps([
      configure(initialQueue),
      Root.makeStep((current) => ({
        model: modifyFields(current, {
          sent: () => [],
          messages: () => ({}),
          maybeMorph: () => Option.none(),
        }),
        commands: Option.isSome(model.maybeMorph)
          ? [
              WaitBeforeMorph.Interrupt({ generation: model.maybeMorph.value.generation }, () =>
                Message.InterruptedMorph(),
              ),
            ]
          : [],
      })),
    ]),
  ),
  CompletedWaitBeforeMorph: (model, { generation }) => ({
    model:
      Option.isSome(model.maybeMorph) && model.maybeMorph.value.generation === generation
        ? modifyFields(model, { maybeMorph: () => Option.none() })
        : model,
  }),
  InterruptedMorph: Root.makeNoopStep(),
  ClickedClear: Root.makeStep(() => configure([])),
  ClickedAttachment: Root.makeStep((model) =>
    model.queue.some((item) => item.id === attachment.id)
      ? Root.makeNoopStep()
      : configure([...model.queue, attachment]),
  ),
  ClickedMount: Root.makeFieldsStep(() => ({ isMounted: Boolean.not })),
  ClickedDispatch: Root.makeStep((model) => {
    const [item] = model.queue

    if (item === undefined) {
      return Root.makeNoopStep()
    }

    const generation = model.morphGeneration + 1

    const commands = Array.match(item.files, {
      onEmpty: () => [
        ...(Option.isSome(model.maybeMorph)
          ? [
              WaitBeforeMorph.Interrupt({ generation: model.maybeMorph.value.generation }, () =>
                Message.InterruptedMorph(),
              ),
            ]
          : []),
        WaitBeforeMorph({ generation }),
      ],
      onNonEmpty: () => [],
    })

    return Update.combineSteps([
      configure(model.queue.slice(1)),
      Root.makeStep((current) =>
        Chats.init({
          key: item.id,
          args: [{ id: `queue-bubble-${item.id}`, from: 'user', files: item.files }],
          toParentModel: (message) =>
            modifyFields(current, {
              messages: () => ({ ...current.messages, [item.id]: message }),
            }),
        }),
      ),
      Root.makeStep((current) => ({
        model: modifyFields(current, {
          sent: () => [...current.sent.filter((entry) => entry.id !== item.id), item],
          morphGeneration: () => generation,
          maybeMorph: (currentMorph) =>
            Array.match(item.files, {
              onEmpty: () => Option.some({ id: item.id, generation }),
              onNonEmpty: () => currentMorph,
            }),
        }),
        commands,
      })),
    ])
  }),
})

export const createInputQueueExampleLayer = (_window: Window & typeof globalThis) => {
  const motion = createMotionScope('input-queue-example')
  const reorder = createReorderScope(motion)

  const view = composition.makeView((model, h) => {
    const control = (id: string, label: string, message: typeof Message.Type) =>
      Button(
        {
          variant: 'secondary',
          buttonSize: 'compact',
          attributes: [h.Id(id), h.OnClick(message)],
          children: [label],
        },
        h,
      )
    const triggers = new Map<string, DocumentTooltipOccurrenceViewInputs['trigger']>()

    return h.block(
      Tooltips.embedView({
        slotId: 'queue-tooltip-document',
        model: model.tooltips,
        viewInputs: {
          renderTrigger: (key, context) => {
            const trigger = triggers.get(key)

            if (trigger === undefined) {
              throw new Error(`Missing queue tooltip ${key}`)
            }

            return trigger(context)
          },
          renderDocument: (content, popups) =>
            h.div([h.OnMount(ObserveEnvironment())], [content, ...popups]),
          render: ({ tooltip }) => {
            const decorateTooltip = (
              context: { readonly trigger: DocumentTooltipOccurrenceViewInputs['trigger'] },
              options: {
                readonly key: string
                readonly content: string
                readonly shapeClass: string
                readonly side: 'top' | 'left'
              },
            ) => {
              triggers.set(options.key, context.trigger)

              return tooltip(options.key, {
                content: options.content,
                shapeClass: options.shapeClass,
                animate: motion.node,
                reducedMotion: 'user',
              })
            }

            return h.main(
              [h.Class('w-100 max-w-[calc(100vw-48px)] m-[48px_auto]')],
              [
                h.h1([h.Class('text-lg mb-6')], ['Queued messages']),
                h.div(
                  [h.Class('flex gap-4 mb-5 [&_button]:cursor-pointer flex-wrap')],
                  [
                    control('queue-reverse', 'Reverse', Message.ClickedReverse()),
                    control('queue-restore', 'Restore', Message.ClickedRestore()),
                    control('queue-clear', 'Clear', Message.ClickedClear()),
                    control(
                      'queue-hold-order',
                      model.isHoldOrder ? 'Resume automatic acceptance' : 'Hold order proposals',
                      Message.ClickedHoldOrder(),
                    ),
                    control(
                      'queue-accept-order',
                      'Accept pending order',
                      Message.ClickedAcceptOrder(),
                    ),
                    control('queue-dispatch', 'Dispatch first', Message.ClickedDispatch()),
                    control('queue-attachment', 'Add attachment', Message.ClickedAttachment()),
                    control('queue-mount', 'Mount / unmount', Message.ClickedMount()),
                  ],
                ),
                h.output([h.Id('queue-edit')], [model.edit]),
                model.isMounted
                  ? h.div(
                      [],
                      [
                        h.block(
                          InlinePolicy.embedView({
                            slotId: 'inline-queue',
                            model: model.inline,
                            viewInputs: {
                              getReorder: () => reorder,
                              isTouch: model.environment.isTouch,
                              reduceMotion: model.environment.isReducedMotion,
                              tooltip: decorateTooltip,
                              ...examplePresentation,
                            },
                          }),
                        ),
                        h.div(
                          [h.Class('relative mt-12 border border-border rounded-xl h-[360px]')],
                          [
                            h.div(
                              [h.Class('flex flex-col gap-2 p-4 items-end')],
                              model.sent.map((item) => {
                                const message = model.messages[item.id]

                                if (message === undefined) {
                                  throw new Error(`Missing chat message ${item.id}`)
                                }

                                const morphing =
                                  Option.isSome(model.maybeMorph) &&
                                  model.maybeMorph.value.id === item.id

                                return h.block(
                                  Chats.embedView({
                                    key: item.id,
                                    slotId: message.id,
                                    model: message,
                                    viewInputs: {
                                      animate: (node, options) =>
                                        motion.node(
                                          node,
                                          morphing
                                            ? {
                                                ...options,
                                                initial: false,
                                                layout: true,
                                                layoutId: `qm-${item.id}`,
                                              }
                                            : options,
                                        ),
                                      children: () =>
                                        morphing
                                          ? motion.node(
                                              h.span(
                                                [h.Class('inline-block align-top')],
                                                [item.text],
                                              ),
                                              { layout: true, animate: {} },
                                            )
                                          : item.text,
                                      ...examplePresentation,
                                    },
                                  }),
                                )
                              }),
                            ),
                            h.block(
                              StackPolicy.embedView({
                                slotId: 'queued-stack',
                                model: model.stack,
                                viewInputs: {
                                  animate: motion.node,
                                  tooltip: decorateTooltip,
                                  morphLayoutId: (item) => `qm-${item.id}`,
                                  layoutDependency: String(model.revision),
                                  ...examplePresentation,
                                },
                              }),
                            ),
                          ],
                        ),
                      ],
                    )
                  : null,
              ],
            )
          },
          ...examplePresentation,
        },
      }),
    )
  })

  return Root.makeLayer({
    init,
    update,
    view,
    EffectsLayer: Layer.mergeAll(WaitBeforeMorph.layer, ObserveEnvironment.layer),
  }).pipe(
    Layer.provide(
      Layer.mergeAll(QueueLayer, StackLayer, ChatLayer, TooltipLayer, motion.layer, reorder.layer),
    ),
  )
}
