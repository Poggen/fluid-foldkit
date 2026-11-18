import {
  hoverModeOf as controlsHoverModeOf,
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../../components/docs/preview-controls'
import { Button } from '@foldkit-visuals/fluid/button'
import { Array, Number } from 'effect'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs'
import {
  documentationFields,
  documentationInMessages,
  documentationDefaults,
} from './documentation.js'
import { docSection } from './doc-section.js'
import source from './chat-message-example-block.ts?raw'
import { homeRouter } from './input-family-routes'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { examplePresentation } from './example-presentation.js'
import { Effect, Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { ChatMessageBlock, layer as ChatLayer } from '@foldkit-visuals/fluid/chat-message'
import type { FileThumbnailResources } from '@foldkit-visuals/fluid/file-thumbnail'
import type { TouchPrimaryResources } from '@foldkit-visuals/fluid/touch-primary'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { Entry, initialEntries, portrait, streamWords } from './chat-message-example-content.js'

const documentationTabsFor = (
  models: Readonly<Record<string, typeof PreviewControlsBlock.Model.Type>>,
  section: string,
) => {
  const child = models[section]
  if (child === undefined) throw new Error(`Missing documentation tabs ${section}`)
  return child
}
const Model = Schema.Struct({
  ...documentationFields,
  documentationTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  entries: Schema.Array(Entry),
  messages: Schema.Record(Schema.String, ChatMessageBlock.Model),
  isCompact: Schema.Boolean,
  isMounted: Schema.Boolean,
  next: Schema.Natural,
  generation: Schema.Natural,
  streaming: Schema.String,
  status: Schema.String,
})
const Message = defineMessageUnion({
  ClickedAppend: {},
  ClickedRemove: {},
  ClickedStream: {},
  ClickedCompact: {},
  ClickedMount: {},
  ClickedAttachment: {},
  ClickedAttachmentOnly: {},
  CompletedWaitBeforeNextChunk: { generation: Schema.Natural, index: Schema.Natural },
  Interrupted: {},
})
const ChatMessageExampleKey = Symbol('ChatMessageExample')
const effects = Block.makeEffectsContract<never, FileThumbnailResources | TouchPrimaryResources>()
export const ChatMessageExampleBlock = Block.make('ChatMessageExample', {
  key: ChatMessageExampleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  InMessage: defineInMessageUnion(documentationInMessages),
  effects,
  view: { kind: 'Element' },
})
const Root = ChatMessageExampleBlock
const Chats = Root.makeRecordBinding(ChatMessageBlock, { field: 'messages' })
const DocumentationTabs = Root.makeRecordBinding(PreviewControlsBlock, {
  field: 'documentationTabs',
})
const documentationTabsHover = (mode: 'fluid' | 'standard') =>
  Root.makeStep((model) =>
    Update.combineSteps(
      Object.entries(model.documentationTabs).flatMap(([section, child]) =>
        controlsHoverModeOf(child) === mode
          ? []
          : [DocumentationTabs.requestHoverMode(section, { mode: mode })],
      ),
    ),
  )
const initDocumentationTabs = Root.makeStep(() =>
  Update.combineSteps(
    ['conversation', 'roles', 'attachments'].map((section) =>
      Root.makeStep((model) =>
        initAndInsert(DocumentationTabs, model, {
          key: section,
          args: [
            {
              id: previewCodeTabId('chat-message', section),
              idPrefix: previewCodeTabId('chat-message', section),
              selectedIndex: 0,
            },
          ],
        }),
      ),
    ),
  ),
)
const composition = Root.makeComposition({ bindings: [DocumentationTabs, Chats] })
const WaitBeforeNextChunk = Root.makeCommand('WaitBeforeNextChunk', {
  args: { generation: Schema.Natural, index: Schema.Natural },
  messages: [Message.CompletedWaitBeforeNextChunk],
  interrupt: { keyFields: ['generation'], toKey: ({ generation }) => String(generation) },
  *handler() {
    return ({ generation, index }) =>
      Effect.sleep('100 millis').pipe(
        Effect.as(Message.CompletedWaitBeforeNextChunk({ generation, index })),
      )
  },
})
const initChatMessage = (entry: Entry) =>
  Root.makeStep((model) =>
    Chats.init({
      key: entry.id,
      args: [{ id: entry.id, from: entry.from, files: entry.files }],
      toParentModel: (message) =>
        modifyFields(model, { messages: (messages) => ({ ...messages, [entry.id]: message }) }),
    }),
  )
const init = composition.makeInit(() => ({
  model: {
    ...documentationDefaults,
    documentationTabs: {},
    entries: initialEntries,
    messages: {},
    isCompact: false,
    isMounted: true,
    next: 1,
    generation: 0,
    streaming: '',
    status: 'Initial transcript skips entrance motion.',
  },
  steps: [initDocumentationTabs, ...initialEntries.map(initChatMessage)],
}))
const append = (streaming: boolean) =>
  Root.makeStep((model) => {
    if (!model.isMounted) return Root.makeNoopStep()
    const id = `chat-live-${model.next}`
    const generation = model.generation + 1
    const entry = Entry.make({
      id,
      section: 'conversation',
      from: streaming ? 'assistant' : 'user',
      text: streaming ? '' : 'And how does that feel in practice?',
      time: streaming ? '' : 'Wednesday 6:09 PM',
      actions: true,
      files: [],
      entrance: true,
    })
    return Update.combineSteps([
      initChatMessage(entry),
      Root.makeStep((current) => ({
        model: modifyFields(current, {
          entries: () => [...current.entries, entry],
          next: Number.increment,
          generation: () => generation,
          streaming: () => (streaming ? id : ''),
          status: () => (streaming ? 'Streaming assistant response…' : 'Appended user message.'),
        }),
        commands: [
          ...(model.streaming === ''
            ? []
            : [
                WaitBeforeNextChunk.Interrupt({ generation: model.generation }, () =>
                  Message.Interrupted(),
                ),
              ]),
          ...(streaming ? [WaitBeforeNextChunk({ generation, index: 0 })] : []),
        ],
      })),
    ])
  })
const update = composition.makeUpdate({
  ClickedAppend: append(false),
  ClickedStream: append(true),
  Interrupted: Root.makeNoopStep(),
  CompletedWaitBeforeNextChunk: Root.makeStep(
    (model, { generation, index }: typeof Message.CompletedWaitBeforeNextChunk.Type) => {
      if (model.generation !== generation || model.streaming === '' || !model.isMounted)
        return Root.makeNoopStep()
      const finished = index + 1 === streamWords.length
      return Root.makeStep((current) => ({
        model: modifyFields(current, {
          entries: () =>
            current.entries.map((entry) =>
              entry.id === current.streaming
                ? { ...entry, text: streamWords.slice(0, index + 1).join(' ') }
                : entry,
            ),
          streaming: () => (finished ? '' : current.streaming),
          status: () => (finished ? 'Assistant response complete.' : current.status),
        }),
        commands: finished ? [] : [WaitBeforeNextChunk({ generation, index: index + 1 })],
      }))
    },
  ),
  ClickedRemove: Root.makeStep((model) => {
    const entry = model.entries.filter((candidate) => candidate.section === 'conversation').at(-1)
    if (entry === undefined) return Root.makeNoopStep()
    return Root.makeStep((current) => ({
      model: modifyFields(current, {
        entries: () => current.entries.filter((candidate) => candidate.id !== entry.id),
        messages: () =>
          Object.fromEntries(Object.entries(current.messages).filter(([key]) => key !== entry.id)),
        streaming: () => (entry.id === current.streaming ? '' : current.streaming),
        status: () => 'Removed last conversation message.',
      }),
      commands:
        entry.id === model.streaming
          ? [
              WaitBeforeNextChunk.Interrupt({ generation: model.generation }, () =>
                Message.Interrupted(),
              ),
            ]
          : [],
    }))
  }),
  ClickedAttachment: Root.makeStep((model) => {
    if (!model.isMounted) return Root.makeNoopStep()
    const entry = model.entries.find((candidate) => candidate.id === 'chat-attachment-user')
    if (entry === undefined) return Root.makeNoopStep()
    const files = Array.match(entry.files, { onEmpty: () => [portrait], onNonEmpty: () => [] })
    return Update.combineSteps([
      Chats.requestConfigure(entry.id, { from: entry.from, files, thumbnailSize: 64 }),
      Root.makeFieldsStep(() => ({
        entries: (entries) =>
          entries.map((candidate) =>
            candidate.id === entry.id ? { ...candidate, files } : candidate,
          ),
      })),
    ])
  }),
  ClickedAttachmentOnly: Root.makeFieldsStep(() => ({
    entries: (entries) =>
      entries.map((entry) =>
        entry.id === 'chat-attachment-user'
          ? { ...entry, text: entry.text === '' ? 'Can you use this as my new avatar?' : '' }
          : entry,
      ),
  })),
  ClickedCompact: Root.makeFieldsStep(() => ({ isCompact: Boolean.not })),
  ClickedMount: Root.makeStep((model) =>
    model.isMounted
      ? Root.makeStep((current) => ({
          model: modifyFields(current, {
            isMounted: () => false,
            messages: () => ({}),
            entries: () => current.entries.map((entry) => ({ ...entry, entrance: false })),
            streaming: () => '',
            status: () => 'Transcript unmounted; active stream cancelled.',
          }),
          commands:
            model.streaming === ''
              ? []
              : [
                  WaitBeforeNextChunk.Interrupt({ generation: model.generation }, () =>
                    Message.Interrupted(),
                  ),
                ],
        }))
      : Update.combineSteps([
          ...model.entries.map(initChatMessage),
          Root.makeFieldsStep(() => ({
            isMounted: () => true,
            status: () => 'Remounted transcript skips entrance motion.',
          })),
        ]),
  ),
})

export const createChatMessageExampleLayer = () => {
  const motion = createMotionScope('chat-message-example')
  const tabMotion = createTargetMotionScope('chat-message-documentation-tabs')
  const view = composition.makeView((model, h) => {
    const presentation = resolvePresentation({
      ...examplePresentation,
      size: model.isDocEmbedded ? model.docSize : model.isCompact ? 'compact' : 'default',
      ...(model.isDocEmbedded ? { shape: model.docShape, hoverMode: model.docHover } : {}),
    })
    const actions = (entry: Entry) => {
      const button = (label: string, icon: 'copy' | 'pencil' | 'rotate-ccw') =>
        Button(
          {
            variant: 'ghost',
            buttonSize: 'icon-compact',
            attributes: [h.AriaLabel(label)],
            children: [presentation.icons[icon]({ size: 13, strokeWidth: 1.5 }, h)],
            shape: presentation.shape.variant,
            size: presentation.size.variant,
          },
          h,
        )
      return h.span(
        [h.Class('contents')],
        [
          button('Copy message', 'copy'),
          button(
            entry.from === 'user' ? 'Edit message' : 'Regenerate response',
            entry.from === 'user' ? 'pencil' : 'rotate-ccw',
          ),
        ],
      )
    }
    const section = (name: Entry['section'], title: string, minimum: string) =>
      docSection(h, {
        title,
        source,
        presentation: { shape: model.docShape, size: model.docSize, hoverMode: model.docHover },
        pane: model.documentationTabs[name]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
        tabsId: previewCodeTabId('chat-message', name),
        tabs: h.block(
          DocumentationTabs.embedView({
            key: name,
            slotId: previewCodeTabId('chat-message', name),
            model: documentationTabsFor(model.documentationTabs, name),
            viewInputs: previewCodeTabsViewInputs(h, {
              shape: model.docShape,
              size: model.docSize,
              hoverMode: model.docHover,
              animate: tabMotion.node,
              ariaLabel: `${name} example view`,
            }),
          }),
        ),
        className: 'w-full max-w-xl',
        previewMinHeight:
          minimum === 'min-h-[220px]' ? 220 : minimum === 'min-h-[200px]' ? 200 : 160,
        children: [
          h.div(
            [h.Id(`chat-${name}`), h.Class('w-full flex flex-col gap-2')],
            model.entries
              .filter((entry) => entry.section === name)
              .map((entry) => {
                const message = model.messages[entry.id]
                if (message === undefined) throw new Error(`Missing ChatMessage ${entry.id}`)
                return h.block(
                  Chats.embedView({
                    key: entry.id,
                    slotId: entry.id,
                    model: message,
                    viewInputs: {
                      ...examplePresentation,
                      size: model.isDocEmbedded
                        ? model.docSize
                        : model.isCompact
                          ? 'compact'
                          : 'default',
                      ...(model.isDocEmbedded
                        ? { shape: model.docShape, hoverMode: model.docHover }
                        : {}),
                      animate: (node, options) =>
                        motion.node(
                          node,
                          entry.entrance ? options : { ...options, initial: false },
                        ),
                      children: () => entry.text,
                      time: () => (entry.time === '' ? null : entry.time),
                      actions: () => (entry.actions ? actions(entry) : null),
                    },
                  }),
                )
              }),
          ),
        ],
      })
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
    if (model.isDocEmbedded)
      return h.div(
        [],
        [
          section('conversation', 'Conversation', 'min-h-[220px]'),
          section('roles', 'Roles', 'min-h-[160px]'),
          section('attachments', 'Attachments', 'min-h-[200px]'),
        ],
      )
    return h.main(
      [
        h.Class(
          'max-w-190 m-[0_auto] p-[32px_24px_64px] [&_h1]:text-[28px] [&_h1]:leading-[34px] [&_h1]:font-[550] [&_h2]:m-[32px_0_12px] [&_h2]:text-[16px] [&_h2]:leading-[22px] [&_h2]:font-[550] [&_output]:block [&_output]:min-h-5 [&_output]:text-[13px] [&_output]:leading-[20px]',
        ),
      ],
      [
        h.a([h.Href(homeRouter())], ['All components']),
        h.h1([], ['ChatMessage']),
        h.p([], ['A single chat transcript entry with baked-in entrance and layout motion.']),
        h.div(
          [
            h.Class(
              'flex flex-wrap gap-2 m-[20px_0_12px] [&_button]:p-[6px_10px] [&_button]:[border:1px_solid_var(--border)] [&_button]:rounded-[8px] [&_button]:cursor-pointer [&_button:focus-visible]:[outline:2px_solid_var(--focus-ring,#6b97ff)] [&_button:focus-visible]:outline-offset-2',
            ),
          ],
          [
            control('chat-append', 'Append user message', Message.ClickedAppend()),
            control('chat-remove', 'Remove last message', Message.ClickedRemove()),
            control('chat-stream', 'Stream assistant response', Message.ClickedStream()),
            control('chat-attachment', 'Toggle attachment', Message.ClickedAttachment()),
            control(
              'chat-attachment-only',
              'Toggle attachment-only message',
              Message.ClickedAttachmentOnly(),
            ),
            control(
              'chat-compact',
              model.isCompact ? 'Default size' : 'Compact size',
              Message.ClickedCompact(),
            ),
            control(
              'chat-mount',
              model.isMounted ? 'Unmount transcript' : 'Remount transcript',
              Message.ClickedMount(),
            ),
          ],
        ),
        h.output([h.Id('chat-status'), h.AriaLive('polite')], [model.status]),
        ...(model.isMounted
          ? [
              section('conversation', 'Conversation', 'min-h-[220px]'),
              section('roles', 'Roles', 'min-h-[160px]'),
              section('attachments', 'Attachments', 'min-h-[200px]'),
            ]
          : []),
      ],
    )
  })
  const inMessageUpdate = composition.makeInMessageUpdate({
    InformedOfDocumentation: Root.makeStep((model, { embedded, shape, size, hoverMode }) =>
      Update.combineSteps([
        documentationTabsHover(hoverMode),
        Root.makeFieldsStep(() => ({
          isDocEmbedded: () => embedded,
          docShape: () => shape,
          docSize: () => size,
          docHover: () => hoverMode,
        })),
      ]),
    ),
  })
  return Root.makeLayer({
    init,
    update,
    inMessageUpdate,
    view,
    EffectsLayer: WaitBeforeNextChunk.layer,
  }).pipe(
    Layer.provide(Layer.mergeAll(ChatLayer, motion.layer, PreviewControlsLayer, tabMotion.layer)),
  )
}
