import { MessageTranscriptExampleBlock } from './message-transcript-example'
import { MessageAssetsQuery } from './message-assets-query'
import { Result } from 'effect'
import { Number } from 'effect'
// Native child owners for the cc276ca0 InputMessage demos.
import { Option } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import {
  InputMessageEvent,
  InputMessageBlock,
  inputMessageTooltipEntries,
} from '@foldkit-visuals/fluid/input-message'
import type { MessageFile, QueuedMessage } from '@foldkit-visuals/fluid/input-message'
import { ChatMessageBlock } from '@foldkit-visuals/fluid/chat-message'
import {
  QueuedStackBlock,
  queuedStackTooltipDescriptors,
} from '@foldkit-visuals/fluid/queued-stack'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { ThinkingIndicatorBlock } from '@foldkit-visuals/fluid/thinking-indicator'
import { PreviewControlsBlock } from '../../../components/docs/preview-controls'

import {
  AuthoredMessagesBlock as Root,
  ReadPlaybackDeadline,
  WaitBeforeMorph,
  ObserveTranscript,
} from './authored-message-definition'
import { replyFor } from './message-scenes'
export const Transcript = Root.makeRequiredFieldBinding(MessageTranscriptExampleBlock, {
  field: 'transcript',
  init: { contextToArgs: () => [] },
})
export const RawComposers = Root.makeRecordBinding(InputMessageBlock, { field: 'composers' })
export const Chats = Root.makeRecordBinding(ChatMessageBlock, { field: 'chats' })
export const DocumentationTabs = Root.makeRecordBinding(PreviewControlsBlock, {
  field: 'documentationTabs',
})
export const Tooltips = Root.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DocumentTooltipBlock, { Transaction: Root.makeNoopStep }),
})
export const RawStack = Root.makeRequiredFieldBinding(QueuedStackBlock, {
  field: 'stack',
  init: { contextToArgs: () => [{ id: 'docs-message-stack', queue: [], bottom: 100 }] },
})
export const Thinking = Root.makeRequiredFieldBinding(ThinkingIndicatorBlock, {
  field: 'thinking',
  init: { contextToArgs: () => [{ id: 'docs-message-thinking', reduceMotion: false }] },
})
type Control = Omit<typeof InputMessageBlock.InMessage.RequestedConfigure.Type, '_tag'>
export const configure = (key: string, changes: Partial<Control>) =>
  Root.makeStep((model) => {
    const child = model.composers[key]
    if (child === undefined) return { model }
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
      filePreviewSize,
      minRows,
      maxRows,
      clickToFocus,
      history,
      suggestions,
    } = child
    return RawComposers.requestConfigure(key, {
      value,
      disabled,
      files,
      queue,
      supportsFiles,
      supportsQueue,
      showQueue,
      supportsStop,
      accept,
      filePreviewSize,
      minRows,
      maxRows,
      clickToFocus,
      history,
      suggestions,
      status: Option.getOrNull(child.status),
      maxFiles: Option.getOrNull(child.maxFiles),
      placeholderSuggestion: Option.getOrNull(child.placeholderSuggestion),
      ...changes,
    })
  })
export const reconcile = () =>
  Root.makeStep((model) => {
    const entries = [
      ...['queued', 'attachments', 'handler'].map((section) => ({
        key: `docs-message-playback-${section}`,
        side: 'top' as const,
      })),
      ...Object.values(model.composers).flatMap(inputMessageTooltipEntries),
      ...queuedStackTooltipDescriptors(model.stack),
    ]
    const wanted = new Set(entries.map((entry) => entry.key))
    return Update.combineSteps([
      ...Object.keys(model.tooltips.rows)
        .filter((key) => !wanted.has(key))
        .map((key) => Tooltips.requestRemove({ key })),
      ...entries
        .filter((entry) => model.tooltips.rows[entry.key] === undefined)
        .map((entry) => Tooltips.requestAdd({ key: entry.key, options: { side: entry.side } })),
    ])
  })
export const acceptQueue = (queue: ReadonlyArray<QueuedMessage>) =>
  Root.makeStep((model) =>
    Update.combineSteps([
      configure('queued', { queue }),
      RawStack.requestConfigure({
        queue,
        compact: model.stack.compact,
        bottom: model.stack.bottom,
      }),
      Root.makeFieldsStep(() => ({ revision: Number.increment })),
      reconcile(),
    ]),
  )
export const appendTurn = (
  section: string,
  from: 'user' | 'assistant',
  text: string,
  files: ReadonlyArray<MessageFile> = [],
  seeded = false,
  thinking = false,
  queueId: string | null = null,
) =>
  Root.makeStep((model) => {
    const key = `docs-${section}-turn-${model.sequence}`
    return Update.combineSteps([
      Root.makeStep((current) =>
        initAndInsert(Chats, current, { key, args: [{ id: key, from, files }] }),
      ),
      Root.makeFieldsStep(() => ({
        sequence: Number.increment,
        turns: (turns) => [...turns, { key, section, text, seeded, thinking, queueId }],
      })),
    ])
  })
export const respond = (
  text: string,
  files: ReadonlyArray<MessageFile>,
  queuedId: string | null,
  seeded = false,
) =>
  Root.makeStep((model) => {
    const generation = model.generation + 1
    return Update.combineSteps([
      appendTurn('queued', 'user', text, files, seeded, false, queuedId),
      appendTurn('queued', 'assistant', '', [], seeded, true),
      Root.makeFieldsStep(() => ({
        generation: () => generation,
        reply: () => replyFor(text),
        word: () => 0,
        remaining: () => 4000,
        morphId: () => (queuedId !== null && files.length === 0 ? queuedId : null),
        revision: Number.increment,
      })),
      configure('queued', {
        status: 'streaming',
        history: [...(model.composers.queued?.history ?? []), text],
      }),
      Root.makeStep((current) => ({
        model: current,
        commands: [
          ...(current.isPaused ? [] : [ReadPlaybackDeadline({ generation, delay: 4000 })]),
          ...(queuedId !== null && files.length === 0 ? [WaitBeforeMorph({ generation })] : []),
        ],
      })),
    ])
  })
export const seed = () =>
  Root.makeStep((model) =>
    Update.combineSteps([
      Root.makeFieldsStep(() => ({
        turns: (turns) => turns.filter((turn) => turn.section !== 'queued'),
        isPaused: () => true,
      })),
      configure('queued', { value: '', files: [], history: [] }),
      respond('Help me polish the dashboard design', [], null, true),
      acceptQueue([
        {
          id: `docs-seed-${model.sequence}-mockups`,
          text: 'Match these mockups',
          files: Option.match(AsyncData.getData(MessageAssetsQuery.read(model.assetsQuery)), {
            onNone: () => [],
            onSome: ({ queue }) => queue,
          }),
        },
        { id: `docs-seed-${model.sequence}-spacing`, text: 'Tighten the spacing', files: [] },
        {
          id: `docs-seed-${model.sequence}-contrast`,
          text: 'Audit the color contrast across the dashboard and suggest accessible token values',
          files: [],
        },
      ]),
    ]),
  )
const receive = (key: string, event: InputMessageEvent) =>
  Root.makeStep((model) =>
    InputMessageEvent.match(event, {
      ValueChanged: ({ value }) => RawComposers.informOfValue(key, { value }),
      FilesChanged: ({ files }) => configure(key, { files }),
      QueueChanged: ({ queue }) => acceptQueue(queue),
      Sent: ({ text, files, queuedId }) =>
        Update.combineSteps([
          ...(key === 'queued'
            ? [respond(text, files, queuedId)]
            : key === 'attachments' || key === 'handler'
              ? [appendTurn(key, 'user', text, files)]
              : []),
          ...(queuedId === null ? [configure(key, { value: '', files: [] })] : []),
          reconcile(),
        ]),
      Stopped: () =>
        Update.combineSteps([
          Root.makeFieldsStep(() => ({
            generation: Number.increment,
            isPaused: () => false,
            turns: (turns) =>
              turns.map((turn) =>
                turn.section === 'queued' && turn.thinking
                  ? { ...turn, thinking: false, text: 'Stopped.' }
                  : turn,
              ),
          })),
          configure('queued', { status: 'idle' }),
        ]),
      Focused: () => ({ model }),
      Blurred: () => ({ model }),
    }),
  )
export const Composers = RawComposers.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(InputMessageBlock, {
      Events: ({ events }) => Update.combineSteps(events.map((event) => receive(key, event))),
      PresentationChanged: () => reconcile(),
    }),
})
export const Stack = RawStack.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(QueuedStackBlock, {
    PresentationChanged: () => reconcile(),
    QueueChanged: ({ queue }) => acceptQueue(queue),
    RemoveRequested: ({ item }) =>
      Root.makeStep((model) => acceptQueue(model.stack.queue.filter((row) => row.id !== item.id))),
    EditRequested: ({ item }) =>
      Root.makeStep((model) =>
        Update.combineSteps([
          acceptQueue(model.stack.queue.filter((row) => row.id !== item.id)),
          configure('queued', { value: item.text, files: item.files }),
          RawComposers.requestFill('queued', { text: item.text }),
        ]),
      ),
  }),
})
export const AssetsBinding = Root.makeRequiredFieldBinding(MessageAssetsQuery, {
  field: 'assetsQuery',
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(MessageAssetsQuery, {
    CompletedFetch: ({ result }) =>
      Result.isFailure(result)
        ? Root.makeNoopStep()
        : Update.combineSteps([
            configure('attachments', { files: result.success.attachments }),
            seed(),
            reconcile(),
          ]),
  }),
})

export const Composition = Root.makeComposition({
  bindings: [
    Composers,
    Chats,
    Stack,
    Tooltips,
    Thinking,
    DocumentationTabs,
    AssetsBinding,
    Transcript,
  ],
  mounts: [ObserveTranscript],
})
