import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  FileThumbnailBlock,
  layer as ThumbnailLayer,
  makeFileThumbnailResourcesLayer,
} from '../../registry/fluid/src/file-thumbnail'
import {
  ChatMessageBlock,
  type ChatMessageConfig,
  layer as ChatLayer,
  TouchPrimaryServerLayer,
} from '../../registry/fluid/src/chat-message'

declare global {
  interface Window {
    remoteFilesReceipt: string[]
    remoteFilesCallerUrl: string
  }
}

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#438868"/></svg>'
const local = new File([svg], 'local.svg', { type: 'image/svg+xml' })
const pdf = new File(['pending'], 'local.pdf', { type: 'application/pdf' })
const localFile = {
  id: 'local',
  name: local.name,
  type: local.type,
  size: local.size,
  lastModified: 0,
}
const pdfFile = { id: 'pdf', name: pdf.name, type: pdf.type }
const remote = {
  url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
  mediaType: 'image',
  filename: 'Remote image',
}
const broken = { ...remote, url: 'data:image/png;base64,broken', filename: 'Failed image' }
const documentFile = {
  url: 'https://example.test/never-fetch.pdf',
  mediaType: 'application/pdf',
  filename: 'Remote PDF',
}
const callerUrl = URL.createObjectURL(local)
const receipt: Array<string> = []
Object.assign(window, { remoteFilesReceipt: receipt, remoteFilesCallerUrl: callerUrl })
const resources = makeFileThumbnailResourcesLayer({
  file: (id) => {
    receipt.push(`lookup:${id}`)
    return id === 'pdf' ? pdf : local
  },
  createObjectURL: (file) => {
    const url = URL.createObjectURL(file)
    receipt.push(`create:${url}`)
    return url
  },
  revokeObjectURL: (url) => {
    receipt.push(`revoke:${url}`)
    URL.revokeObjectURL(url)
  },
  renderPdf: () =>
    Effect.acquireRelease(
      Effect.sync(() => {
        receipt.push('pdf:start')
      }),
      () =>
        Effect.sync(() => {
          receipt.push('pdf:cancel')
        }),
    ).pipe(
      Effect.flatMap(() => Effect.never),
      Effect.scoped,
    ),
})
const Message = defineMessageUnion({
  Caller: {},
  RemovedChat: {},
  Remote: {},
  Pdf: {},
  Failed: {},
  Renamed: {},
  Replaced: {},
  Returned: {},
  Mixed: {},
})
const key = Symbol('RemoteFilesProof')
const Parent = Block.make('RemoteFilesProof', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ thumbnail: FileThumbnailBlock.Model, chat: ChatMessageBlock.Model }),
  Message,
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof ChatMessageBlock>['programRequirements']
  >(),
})
const Thumbnail = Parent.makeRequiredFieldBinding(FileThumbnailBlock, {
  field: 'thumbnail',
  init: { contextToArgs: () => [{ id: 'standalone', file: localFile, size: 64 }] },
})
const Chat = Parent.makeRequiredFieldBinding(ChatMessageBlock, {
  field: 'chat',
  init: {
    contextToArgs: (): [ChatMessageConfig] => [
      { id: 'mixed-chat', from: 'user', files: [localFile, remote, documentFile] },
    ],
  },
})
const Composition = Parent.makeComposition({ bindings: [Thumbnail, Chat] })
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({
    Caller: Thumbnail.requestConfigure({
      file: { ...remote, url: callerUrl, filename: 'Caller blob' },
      size: 64,
    }),
    RemovedChat: Chat.requestConfigure({ from: 'user', files: [], thumbnailSize: 64 }),
    Remote: Thumbnail.requestConfigure({ file: remote, size: 64 }),
    Pdf: Thumbnail.requestConfigure({ file: pdfFile, size: 64 }),
    Failed: Thumbnail.requestConfigure({ file: broken, size: 64 }),
    Renamed: Thumbnail.requestConfigure({
      file: { ...broken, filename: 'Renamed failure' },
      size: 96,
    }),
    Replaced: Chat.requestConfigure({
      from: 'user',
      files: [localFile, { ...remote, url: `${remote.url}#replacement` }, documentFile],
      thumbnailSize: 96,
    }),
    Returned: Thumbnail.requestConfigure({ file: broken, size: 64 }),
    Mixed: Chat.requestConfigure({
      from: 'user',
      files: [localFile, remote, documentFile],
      thumbnailSize: 64,
    }),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [h.Class('flex flex-col gap-4 p-4')],
      [
        h.h1([], ['Remote attachment lifecycle']),
        h.div(
          [h.Class('flex flex-wrap gap-2')],
          [
            h.button([h.OnClick(Message.Caller())], ['Caller blob']),
            h.button([h.OnClick(Message.RemovedChat())], ['Remove chat files']),
            h.button([h.OnClick(Message.Remote())], ['Remote image']),
            h.button([h.OnClick(Message.Pdf())], ['Pending local PDF']),
            h.button([h.OnClick(Message.Failed())], ['Broken remote image']),
            h.button([h.OnClick(Message.Renamed())], ['Rename failed image']),
            h.button([h.OnClick(Message.Replaced())], ['Replace chat URL']),
            h.button([h.OnClick(Message.Returned())], ['Return failed URL']),
            h.button([h.OnClick(Message.Mixed())], ['Mixed files']),
          ],
        ),
        h.block(
          Thumbnail.embedView({ slotId: 'standalone', model: model.thumbnail, viewInputs: {} }),
        ),
        h.block(
          Chat.embedView({
            slotId: 'mixed-chat',
            model: model.chat,
            viewInputs: {
              animate: (node) => node,
              children: () => 'Mixed local and remote attachments',
            },
          }),
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(Layer.merge(ThumbnailLayer, ChatLayer)))
const container = document.querySelector<HTMLElement>('#style-contract-root')
if (container === null) throw new Error('Remote file fixture container required')
const runtime = Runtime.embed(
  Program.makeElement({ block: Parent, layer, container, devTools: false }).provide(
    Layer.merge(resources, TouchPrimaryServerLayer),
  ),
)
window.addEventListener(
  'dispose-remote-files',
  () => {
    void runtime.dispose()
  },
  { once: true },
)
