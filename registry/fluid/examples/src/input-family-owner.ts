import { Number } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import { Layer, Option, Predicate, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { DocumentTooltipBlock, layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import type { DocumentTooltipOccurrenceViewInputs as TooltipViewInputs } from '@foldkit-visuals/fluid/tooltip'
import {
  InputCopyControlBlock,
  InputCopyConfigSchema,
  controlLayer as CopyLayer,
} from '@foldkit-visuals/fluid/input-copy'
import type { InputCopyConfig, InputCopyControlViewInputs } from '@foldkit-visuals/fluid/input-copy'
import {
  InputMessageBlock,
  InputMessageConfigSchema,
  layer as MessageLayer,
  inputMessageTooltipEntries,
  InputMessageEvent,
} from '@foldkit-visuals/fluid/input-message'
import type {
  InputMessageConfig,
  InputMessageViewInputs,
} from '@foldkit-visuals/fluid/input-message'

export interface InputFamilyConfig {
  readonly copy: InputCopyConfig
  readonly message: InputMessageConfig
  readonly valuePolicy: 'ignore' | 'accept' | 'uppercase'
}

const Message = defineMessageUnion({})

const InMessage = defineInMessageUnion({
  RequestedReconcile: {},
  RequestedStatus: { status: Schema.Literals(['idle', 'streaming']) },
  InformedOfValue: { value: Schema.String },
  RequestedPolicy: { policy: Schema.Literals(['ignore', 'accept', 'uppercase']) },
  RequestedCopyVariant: { variant: Schema.Literals(['icon', 'button']) },
})

const Model = Schema.Struct({
  copy: InputCopyControlBlock.Model,
  message: InputMessageBlock.Model,
  valuePolicy: Schema.Literals(['ignore', 'accept', 'uppercase']),
  tooltips: DocumentTooltipBlock.Model,

  copiedCount: Schema.Natural,
  messageEvents: Schema.Array(InputMessageEvent),
})

export const InputFamilyExampleKey = Symbol('InputFamilyExample')

const effects = Block.makeEffectsContract<
  never,
  | Block.FactsOf<typeof InputCopyControlBlock>['programRequirements']
  | Block.FactsOf<typeof InputMessageBlock>['programRequirements']
  | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
>()

export const InputFamilyExampleBlock = Block.make('InputFamilyExample', {
  key: InputFamilyExampleKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      copy: InputCopyConfigSchema,
      message: InputMessageConfigSchema,
      valuePolicy: Schema.Literals(['ignore', 'accept', 'uppercase']),
    }),
  ]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<InputFamilyViewInputs>() },
  effects,
})

const InputExampleDefinition = InputFamilyExampleBlock

const Copy = InputExampleDefinition.makeRequiredFieldBinding(InputCopyControlBlock, {
  field: 'copy',
  init: { contextToArgs: (config: InputFamilyConfig) => [config.copy] },
})

const MessageInput = InputExampleDefinition.makeRequiredFieldBinding(InputMessageBlock, {
  field: 'message',
  init: {
    contextToArgs: (config: InputFamilyConfig) => [{ ...config.message, ...exampleHoverConfig }],
  },
})

const Tooltips = InputExampleDefinition.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
})

const reconcile = () =>
  InputExampleDefinition.makeStep((model) => {
    const entries = inputMessageTooltipEntries(model.message)
    const wanted = new Set(entries.map((entry) => entry.key))

    return Update.combineSteps([
      ...Object.keys(model.tooltips.rows)
        .filter((key) => !wanted.has(key))
        .map((key) => Tooltips.requestRemove({ key })),
      ...entries
        .filter((entry) => model.tooltips.rows[entry.key] === undefined)
        .map((entry) =>
          Tooltips.requestAdd({
            key: entry.key,

            options: { side: entry.side },
          }),
        ),
    ])
  })

const CopySelected = Copy.withOutMessagePolicy({
  fold: InputExampleDefinition.makeOutMessageFold(InputCopyControlBlock, {
    Copied: () => InputExampleDefinition.makeFieldsStep(() => ({ copiedCount: Number.increment })),
  }),
})

const changeStatus = (status: 'idle' | 'streaming') =>
  InputExampleDefinition.makeStep((model) => {
    const {
      value,
      disabled,
      files,
      queue,
      supportsFiles,
      supportsQueue,
      showQueue,
      supportsStop,
      accept,
      maxFiles,
      filePreviewSize,
      minRows,
      maxRows,
      clickToFocus,
      history,
      suggestions,
      placeholderSuggestion,
    } = model.message

    return MessageInput.requestConfigure({
      value,
      disabled,
      files,
      queue,
      status,
      supportsFiles,
      supportsQueue,
      showQueue,
      supportsStop,
      accept,
      maxFiles: Option.getOrNull(maxFiles),
      filePreviewSize,
      minRows,
      maxRows,
      clickToFocus,
      history,
      suggestions,
      placeholderSuggestion: Option.getOrNull(placeholderSuggestion),
    })
  })

const MessageSelected = MessageInput.withOutMessagePolicy({
  fold: InputExampleDefinition.makeOutMessageFold(InputMessageBlock, {
    Events: ({ events }) =>
      Update.combineSteps([
        InputExampleDefinition.makeFieldsStep(() => ({
          messageEvents: (previous) => [...previous, ...events].slice(-12),
        })),
        ...events
          .filter((event) => Predicate.isTagged(event, 'ValueChanged'))
          .map((event) =>
            InputExampleDefinition.makeStep((model) =>
              model.valuePolicy === 'ignore'
                ? InputExampleDefinition.makeNoopStep()
                : MessageInput.informOfValue({
                    value:
                      model.valuePolicy === 'uppercase' ? event.value.toUpperCase() : event.value,
                  }),
            ),
          ),
        ...events
          .filter((event) => Predicate.isTagged(event, 'Sent'))
          .map(() => MessageInput.informOfValue({ value: '' })),
        ...events
          .filter((event) => Predicate.isTagged(event, 'Stopped'))
          .map(() => changeStatus('idle')),
        reconcile(),
      ]),
    PresentationChanged: () => reconcile(),
  }),
})

const TooltipsSelected = Tooltips.withOutMessagePolicy({
  fold: InputExampleDefinition.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: InputExampleDefinition.makeNoopStep,
  }),
})

const InputExampleComposition = InputExampleDefinition.makeComposition({
  bindings: [CopySelected, MessageSelected, TooltipsSelected],
})

const init = InputExampleComposition.makeInit((config: InputFamilyConfig) => ({
  model: {
    valuePolicy: config.valuePolicy,

    copiedCount: 0,
    messageEvents: [],
  },
  childInitContext: config,
  steps: [reconcile()],
}))

export interface InputFamilyViewInputs {
  readonly getCopy: () => InputCopyControlViewInputs
  readonly getMessage: () => Omit<InputMessageViewInputs, 'tooltip'>
  readonly getTooltip: () => Omit<TooltipViewInputs, 'trigger' | 'content' | 'shapeClass'>
  readonly renderInputs: (copy: Html, message: Html) => Html
  readonly renderDocument: (content: Html, popups: ReadonlyArray<Html>) => Html
}

const view = InputExampleComposition.makeView.withInputs<InputFamilyViewInputs>(
  (model, inputs, h) => {
    const triggers = new Map<string, TooltipViewInputs['trigger']>()

    return h.block(
      Tooltips.embedView({
        slotId: 'tooltips',
        model: model.tooltips,
        viewInputs: {
          renderDocument: inputs.renderDocument,
          renderTrigger: (key, { button, div, anchor, span }) => {
            const trigger = triggers.get(key)

            if (trigger === undefined) {
              throw new Error(`Missing Tooltip trigger ${key}`)
            }

            return trigger({ attributes: [], button, div, anchor, span })
          },
          render: ({ tooltip }) =>
            inputs.renderInputs(
              h.block(
                Copy.embedView({
                  slotId: 'copy',
                  model: model.copy,
                  viewInputs: {
                    ...examplePresentation,
                    ...inputs.getCopy(),
                  },
                }),
              ),
              h.block(
                MessageInput.embedView({
                  slotId: 'message',
                  model: model.message,
                  viewInputs: {
                    ...examplePresentation,
                    ...inputs.getMessage(),
                    tooltip: ({ trigger }, options) => {
                      if (triggers.has(options.key)) {
                        throw new Error(`Duplicate Tooltip trigger ${options.key}`)
                      }

                      triggers.set(options.key, trigger)

                      return tooltip(options.key, {
                        ...inputs.getTooltip(),
                        content: options.content,
                        shapeClass: options.shapeClass,
                      })
                    },
                  },
                }),
              ),
            ),
          ...examplePresentation,
        },
      }),
    )
  },
)

const inMessageUpdate = InputExampleComposition.makeInMessageUpdate({
  RequestedReconcile: reconcile(),
  RequestedStatus: InputExampleDefinition.makeStep.fromMessage(({ status }) =>
    changeStatus(status),
  ),
  InformedOfValue: InputExampleDefinition.makeStep.fromMessage(({ value }) =>
    MessageInput.informOfValue({ value }),
  ),
  RequestedPolicy: (model, { policy }) => ({
    model: modifyFields(model, { valuePolicy: () => policy }),
  }),
  RequestedCopyVariant: InputExampleDefinition.makeStep(
    (model, { variant }: RequestedCopyVariant) =>
      Copy.requestConfigure({
        value: model.copy.copy.value,
        disabled: model.copy.copy.disabled,
        variant,
      }),
  ),
})

export const InputFamilyExampleLayer = InputFamilyExampleBlock.makeLayer({
  init,
  update: InputExampleComposition.makeUpdate({}),
  inMessageUpdate,
  view,
}).pipe(Layer.provide(Layer.mergeAll(CopyLayer, MessageLayer, TooltipLayer)))

type Model = typeof Model.Type
type RequestedCopyVariant = typeof InMessage.RequestedCopyVariant.Type
