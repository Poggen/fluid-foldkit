/* @license Derived from Fluid Functionalism f8014098 InputMessage TranscriptDemo. MIT. */
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineMessageUnion } from 'foldkit/message'
import {
  InputMessageBlock,
  InputMessageEvent,
  layer as InputLayer,
} from '@foldkit-visuals/fluid/input-message'
import type { InputMessageViewInputs } from '@foldkit-visuals/fluid/input-message'
import { ChatMessageBlock, layer as ChatLayer } from '@foldkit-visuals/fluid/chat-message'
import {
  ThinkingIndicatorBlock,
  layer as ThinkingLayer,
  thinkingIndicatorAnimations,
} from '@foldkit-visuals/fluid/thinking-indicator'
import {
  MessageScrollerBlock,
  MessageScrollerItem,
  layer as ScrollerLayer,
} from '../../../registry/fluid/src/message-scroller'
import { target } from '../motion'

const Row = Schema.Struct({
  id: Schema.String,
  from: Schema.Literals(['user', 'assistant']),
  text: Schema.String,
})
const history: ReadonlyArray<typeof Row.Type> = [
  { id: 'h1', from: 'user', text: 'Why do chat apps scroll so badly?' },
  {
    id: 'h2',
    from: 'assistant',
    text: 'Mostly because the page has two jobs that pull against each other. It has to keep up with text that is still arriving, and it has to stay still while you read.',
  },
  { id: 'h3', from: 'user', text: 'What does a good one do?' },
  {
    id: 'h4',
    from: 'assistant',
    text: 'It follows the reply only while you are at the bottom. The moment you scroll up it lets go, and it gives you one button to come back.',
  },
]
const reply =
  'Your message moves to the top of the view, with a sliver of the last reply above it so you keep your place. The answer then grows underneath without pushing anything. Once it is longer than the view, the page starts following it, and it keeps following until you scroll away. Scroll up now and the text keeps arriving, but the view stays where you put it. The button brings you back to the latest line.'
const words = reply.split(' ')
const Message = defineMessageUnion({ WordArrived: { generation: Schema.Natural } })
const effects = Block.makeEffectsContract<
  never,
  | Block.FactsOf<typeof InputMessageBlock>['programRequirements']
  | Block.FactsOf<typeof ChatMessageBlock>['programRequirements']
>()
const key = Symbol('MessageTranscriptExample')
export const MessageTranscriptExampleBlock = Block.make('MessageTranscriptExample', {
  key,
  InitArgs: Schema.Tuple([]),
  Message,
  effects,
  Model: Schema.Struct({
    composer: InputMessageBlock.Model,
    scroller: MessageScrollerBlock.Model,
    thinking: ThinkingIndicatorBlock.Model,
    chats: Schema.Record(Schema.String, ChatMessageBlock.Model),
    rows: Schema.Array(Row),
    streaming: Schema.Boolean,
    word: Schema.Natural,
    generation: Schema.Natural,
  }),
  view: { kind: 'Element', Inputs: Block.makeInputContract<InputMessageViewInputs>() },
})
const Root = MessageTranscriptExampleBlock
const Tick = Root.makeCommand('Tick', {
  args: { generation: Schema.Natural, delay: Schema.Natural },
  messages: [Message.WordArrived],
  *handler() {
    return ({ generation, delay }) =>
      Effect.sleep(delay).pipe(Effect.as(Message.WordArrived({ generation })))
  },
})
const Scroller = Root.makeRequiredFieldBinding(MessageScrollerBlock, {
  field: 'scroller',
  init: { contextToArgs: () => [{ id: 'docs-transcript-scroll' }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(MessageScrollerBlock, {
    PositionChanged: () => Root.makeNoopStep(),
  }),
})
const Thinking = Root.makeRequiredFieldBinding(ThinkingIndicatorBlock, {
  field: 'thinking',
  init: { contextToArgs: () => [{ id: 'docs-transcript-thinking', reduceMotion: false }] },
})
const Chats = Root.makeRecordBinding(ChatMessageBlock, { field: 'chats' })
const RawComposer = Root.makeRequiredFieldBinding(InputMessageBlock, {
  field: 'composer',
  init: {
    contextToArgs: () => [
      {
        id: 'docs-transcript-compose',
        value: '',
        reduceMotion: false,
        supportsStop: true,
        placeholderSuggestion: 'How does the scrolling work?',
      },
    ],
  },
})
const configure = (streaming: boolean, value?: string) =>
  Root.makeStep((model) => {
    const c = model.composer
    return RawComposer.requestConfigure({
      value: value ?? c.value,
      disabled: c.disabled,
      files: c.files,
      queue: c.queue,
      status: streaming ? 'streaming' : 'idle',
      supportsFiles: c.supportsFiles,
      supportsQueue: c.supportsQueue,
      showQueue: c.showQueue,
      supportsStop: true,
      accept: c.accept,
      maxFiles: Option.getOrNull(c.maxFiles),
      filePreviewSize: c.filePreviewSize,
      minRows: c.minRows,
      maxRows: c.maxRows,
      clickToFocus: c.clickToFocus,
      history: c.history,
      suggestions: c.suggestions,
      placeholderSuggestion: Option.getOrNull(c.placeholderSuggestion),
    })
  })
const send = (text: string) =>
  Root.makeStep((model) => {
    if (!text.trim()) return { model }
    const generation = model.generation + 1
    const rows: ReadonlyArray<typeof Row.Type> = [
      { id: `u${generation}`, from: 'user', text },
      { id: `a${generation}`, from: 'assistant', text: '' },
    ]
    return Update.combineSteps([
      ...rows.map((row) =>
        Root.makeStep((current) =>
          initAndInsert(Chats, current, {
            key: row.id,
            args: [{ id: `docs-transcript-${row.id}`, from: row.from }],
          }),
        ),
      ),
      Root.makeStep((current) => ({
        model: {
          ...current,
          rows: [...current.rows, ...rows],
          streaming: true,
          word: 0,
          generation,
        },
        commands: [Tick({ generation, delay: 600 })],
      })),
      configure(true, ''),
    ])
  })
const receive = (event: InputMessageEvent) =>
  Root.makeStep((_model) =>
    InputMessageEvent.match(event, {
      ValueChanged: ({ value }) => RawComposer.informOfValue({ value }),
      Sent: ({ text }) => send(text),
      Stopped: () =>
        Update.combineSteps([
          Root.makeStep((current) => ({
            model: { ...current, streaming: false, generation: current.generation + 1 },
          })),
          configure(false),
        ]),
      FilesChanged: () => Root.makeNoopStep(),
      QueueChanged: () => Root.makeNoopStep(),
      Focused: () => Root.makeNoopStep(),
      Blurred: () => Root.makeNoopStep(),
    }),
  )
const Composer = RawComposer.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(InputMessageBlock, {
    Events: ({ events }) => Update.combineSteps(events.map(receive)),
    PresentationChanged: () => Root.makeNoopStep(),
  }),
})
const MessageTranscriptExampleComposition = Root.makeComposition({
  bindings: [Scroller, Composer, Chats, Thinking],
})
export const MessageTranscriptExampleLayer = Root.makeLayer({
  init: MessageTranscriptExampleComposition.makeInit(() => ({
    model: { chats: {}, rows: history, streaming: false, word: 0, generation: 0 },
    steps: history.map((row) =>
      Root.makeStep((model) =>
        initAndInsert(Chats, model, {
          key: row.id,
          args: [{ id: `docs-transcript-${row.id}`, from: row.from }],
        }),
      ),
    ),
  })),
  update: MessageTranscriptExampleComposition.makeUpdate({
    WordArrived: Root.makeStep((model, { generation }) => {
      if (generation !== model.generation || !model.streaming) return { model }
      const next = model.word + 1,
        streaming = next < words.length
      const steps = Update.combineSteps([
        Root.makeStep((current) => ({
          model: {
            ...current,
            streaming,
            word: next,
            rows: current.rows.map((row) =>
              row.id === `a${generation}` ? { ...row, text: words.slice(0, next).join(' ') } : row,
            ),
          },
          commands: streaming ? [Tick({ generation, delay: 45 })] : [],
        })),
        ...(!streaming ? [configure(false)] : []),
      ])
      return steps
    }),
  }),
  view: MessageTranscriptExampleComposition.makeView.withInputs((model, inputs, h) =>
    h.div(
      [h.Class('flex h-[440px] w-full max-w-[520px] flex-col gap-3')],
      [
        h.block(
          Scroller.embedView({
            slotId: model.scroller.id,
            model: model.scroller,
            viewInputs: {
              ...inputs,
              animate: inputs.animate,
              className: 'flex-1',
              viewportClassName: 'px-1 py-2',
              contentClassName: 'gap-2',
              busy: model.streaming,
              content: () =>
                model.rows.flatMap((row) => {
                  const chat = model.chats[row.id]
                  if (chat === undefined) return []
                  return [
                    h.keyed('div')(
                      row.id,
                      [],
                      [
                        MessageScrollerItem(
                          {
                            anchor: row.from === 'user',
                            children: [
                              h.block(
                                Chats.embedView({
                                  key: row.id,
                                  slotId: chat.id,
                                  model: chat,
                                  viewInputs: {
                                    ...inputs,
                                    animate: inputs.animate,
                                    children: () =>
                                      row.from === 'assistant' && row.text === '' && model.streaming
                                        ? h.block(
                                            Thinking.embedView({
                                              slotId: model.thinking.id,
                                              model: model.thinking,
                                              viewInputs: {
                                                ...inputs,
                                                ...thinkingIndicatorAnimations(target),
                                                showIcon: false,
                                                className: 'px-0 py-0',
                                              },
                                            }),
                                          )
                                        : row.text,
                                  },
                                }),
                              ),
                            ],
                          },
                          h,
                        ),
                      ],
                    ),
                  ]
                }),
            },
          }),
        ),
        h.div(
          [h.Class('shrink-0')],
          [
            h.block(
              Composer.embedView({
                slotId: model.composer.id,
                model: model.composer,
                viewInputs: {
                  ...inputs,
                  textareaLabel: 'Transcript message',
                  placeholder: 'Send a message, then scroll up while the reply streams…',
                },
              }),
            ),
          ],
        ),
      ],
    ),
  ),
  EffectsLayer: Tick.layer,
}).pipe(Layer.provide(Layer.mergeAll(InputLayer, ChatLayer, ScrollerLayer, ThinkingLayer)))
