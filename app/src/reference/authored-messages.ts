import { MessageAssetsQuery } from './message-assets-query'
import { Query } from 'foldkit/experimental'
import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import { hoverModeOf as composerHoverModeOf } from '@foldkit-visuals/fluid/input-message'
import { Number } from 'effect'
import { modifyFields } from 'foldkit/struct'
/* @license Fluid Functionalism cc276ca0 InputMessage page and QueuedChatDemo. MIT. */
import { Layer, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { layer as ComposerLayer } from '@foldkit-visuals/fluid/input-message'
import { layer as ChatLayer } from '@foldkit-visuals/fluid/chat-message'
import { layer as StackLayer } from '@foldkit-visuals/fluid/queued-stack'
import { layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import { layer as ThinkingLayer } from '@foldkit-visuals/fluid/thinking-indicator'
import { layer as PreviewControlsLayer } from '../../../components/docs/preview-controls'
import { previewCodeTabId } from '../../../components/docs/preview-code-tabs'
import {
  AuthoredMessagesBlock as Root,
  ReadPlaybackDeadline,
  ReadRemainingPlaybackTime,
  Delay,
  WaitBeforeMorph,
  ObserveTranscript,
} from './authored-message-definition'
import {
  Composition,
  Composers,
  Stack,
  configure,
  seed,
  DocumentationTabs,
  AssetsBinding,
  Tooltips,
} from './authored-message-composition'
import { sections, suggestions } from './message-scenes'
import { authoredMessageView } from './authored-message-view'
export { AuthoredMessagesBlock } from './authored-message-definition'
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: {
      composers: {},
      documentationTabs: {},
      chats: {},
      turns: [],
      sequence: 0,
      isPaused: true,
      generation: 0,
      remaining: 4000,
      due: 0,
      reply: '',
      word: 0,
      morphId: null,
      revision: 0,
    },
    steps: [
      ...['queued', 'attachments', 'handler'].map((section) =>
        Tooltips.requestAdd({ key: `docs-message-playback-${section}`, options: { side: 'top' } }),
      ),
      ...sections.map(({ key }) =>
        Root.makeStep((model) =>
          initAndInsert(DocumentationTabs, model, {
            key,
            args: [
              {
                id: previewCodeTabId('input-message', key),
                idPrefix: previewCodeTabId('input-message', key),
                selectedIndex: 0,
              },
            ],
          }),
        ),
      ),
      ...sections.map(({ key }) =>
        Root.makeStep((model) =>
          initAndInsert(Composers, model, {
            key,
            args: [
              {
                id: `docs-message-${key}`,
                value: key === 'disabled' ? 'This composer is disabled' : '',
                disabled: key === 'disabled',
                reduceMotion: false,
                ...(key === 'suggestions'
                  ? { suggestions, placeholderSuggestion: 'Why is every other input box so stiff?' }
                  : {}),
                ...(key === 'attachments' ? { supportsFiles: true } : {}),
                ...(key === 'queued'
                  ? {
                      status: 'streaming',
                      supportsQueue: true,
                      showQueue: false,
                      supportsStop: true,
                    }
                  : {}),
              },
            ],
          }),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({
    MeasuredComposer: Root.makeStep((model, { section, height }) =>
      section !== 'queued'
        ? { model }
        : Stack.requestConfigure({
            queue: model.stack.queue,
            compact: model.stack.compact,
            bottom: height + 8,
          }),
    ),
    Mounted: AssetsBinding.requestLoadIfMissing(),
    ClickedClear: Root.makeStep((model, { section }) =>
      section === 'queued'
        ? seed()
        : Update.combineSteps([
            Root.makeFieldsStep(() => ({
              turns: (turns) => turns.filter((turn) => turn.section !== section),
            })),
            ...(section === 'attachments'
              ? [
                  configure(section, {
                    files: Option.match(
                      AsyncData.getData(MessageAssetsQuery.read(model.assetsQuery)),
                      {
                        onNone: () => [],
                        onSome: ({ attachments }) => attachments,
                      },
                    ),
                    value: '',
                  }),
                ]
              : []),
          ]),
    ),
    ClickedPlayback: Root.makeStep((model) => {
      const streaming =
        Option.getOrNull(model.composers.queued?.status ?? Option.none()) === 'streaming'
      return !streaming
        ? seed()
        : model.isPaused
          ? {
              model: modifyFields(model, {
                isPaused: () => false,
                generation: Number.increment,
              }),
              commands: [
                ReadPlaybackDeadline({ generation: model.generation + 1, delay: model.remaining }),
              ],
            }
          : {
              model: modifyFields(model, { isPaused: () => true }),
              commands: [
                ReadRemainingPlaybackTime({ generation: model.generation, due: model.due }),
              ],
            }
    }),
    CompletedReadRemainingPlaybackTime: (model, { generation, remaining }) => ({
      model:
        generation === model.generation && model.isPaused
          ? modifyFields(model, { remaining: () => remaining, generation: () => generation + 1 })
          : model,
    }),
    CompletedReadPlaybackDeadline: (model, { generation, due }) => ({
      model: generation === model.generation ? modifyFields(model, { due: () => due }) : model,
      commands:
        generation === model.generation && !model.isPaused
          ? [Delay({ generation, delay: model.remaining })]
          : [],
    }),
    CompletedDelay: Root.makeStep((model, { generation }) => {
      if (generation !== model.generation || model.isPaused) return { model }
      const words = model.reply.split(' '),
        next = model.word + 1
      const assistant = model.turns.findLast((turn) => turn.section === 'queued')
      return Update.combineSteps([
        Root.makeFieldsStep(() => ({
          word: () => next,
          remaining: () => 150,
          turns: (turns) =>
            turns.map((turn) =>
              turn.key === assistant?.key
                ? { ...turn, text: words.slice(0, next).join(' '), thinking: false }
                : turn,
            ),
        })),
        ...(next >= words.length
          ? [configure('queued', { status: 'idle' })]
          : [
              Root.makeStep((current) => ({
                model: current,
                commands: [ReadPlaybackDeadline({ generation, delay: 150 })],
              })),
            ]),
      ])
    }),
    CompletedWaitBeforeMorph: (model, { generation }) => ({
      model: generation === model.generation ? modifyFields(model, { morphId: () => null }) : model,
    }),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        ...Object.entries(model.documentationTabs).flatMap(([key, child]) =>
          tabsHoverModeOf(child) === settings.hover
            ? []
            : [DocumentationTabs.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...Object.entries(model.composers).flatMap(([key, child]) =>
          composerHoverModeOf(child) === settings.hover
            ? []
            : [Composers.requestHoverMode(key, { mode: settings.hover })],
        ),
        ...(model.stack.compact === (settings.size === 'compact')
          ? []
          : [
              Stack.requestConfigure({
                queue: model.stack.queue,
                compact: settings.size === 'compact',
                bottom: model.stack.bottom,
              }),
            ]),
      ]),
    ),
  }),
  view: authoredMessageView(Root.Message),
  EffectsLayer: Layer.mergeAll(
    ObserveTranscript.layer,
    ReadPlaybackDeadline.layer,
    ReadRemainingPlaybackTime.layer,
    Delay.layer,
    WaitBeforeMorph.layer,
  ),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      Query.layer,
      ComposerLayer,
      ChatLayer,
      StackLayer,
      TooltipLayer,
      ThinkingLayer,
      PreviewControlsLayer,
    ),
  ),
)
