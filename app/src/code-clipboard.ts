import { modifyFields } from 'foldkit/struct'
import { Effect, Layer, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { SiteEnvironment } from './environment'

const Message = defineMessageUnion({
  RequestedCopy: { text: Schema.String, label: Schema.String },
  CompletedCopy: { revision: Schema.Natural, success: Schema.Boolean, label: Schema.String },
})
const key = Symbol('CodeClipboard')
export const CodeClipboardBlock = Block.make('CodeClipboard', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ revision: Schema.Natural, announcement: Schema.String }),
  Message,
  effects: Block.makeEffectsContract<never, SiteEnvironment>(),
  view: { kind: 'Element' },
})
const Copy = CodeClipboardBlock.makeCommand('Copy', {
  args: { text: Schema.String, label: Schema.String, revision: Schema.Natural },
  messages: [Message.CompletedCopy],
  *handler() {
    const environment = yield* SiteEnvironment
    return ({ text, label, revision }) =>
      environment
        .copy(text)
        .pipe(Effect.map((success) => Message.CompletedCopy({ success, label, revision })))
  },
})
const Requests = CodeClipboardBlock.makeMountStream('Requests', {
  messages: [Message.RequestedCopy],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Paused'
            ? Stream.never
            : Stream.callback<typeof Message.RequestedCopy.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const root = element.closest('.site')
                    const click = (event: Event) => {
                      const target = event.target
                      if (!(target instanceof Element)) return
                      const button = target.closest('[data-code-copy]')
                      const block = button?.closest('[data-code-block]')
                      const source = block?.querySelector('pre code')
                      if (source === null || source === undefined || !root?.contains(block ?? null))
                        return
                      event.preventDefault()
                      Queue.offerUnsafe(
                        queue,
                        Message.RequestedCopy({
                          text: source.textContent ?? '',
                          label:
                            block?.querySelector('.code-block-filename')?.textContent ?? 'code',
                        }),
                      )
                    }
                    root?.addEventListener('click', click)
                    return () => root?.removeEventListener('click', click)
                  }),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              ),
        ),
      )
  },
})
const CodeClipboardComposition = CodeClipboardBlock.makeComposition({ mounts: [Requests] })
export const codeClipboardLayer = CodeClipboardBlock.makeLayer({
  init: CodeClipboardComposition.makeInit(() => ({ model: { revision: 0, announcement: '' } })),
  update: CodeClipboardComposition.makeUpdate({
    RequestedCopy: CodeClipboardBlock.makeStep((model, { text, label }) => ({
      model: { revision: model.revision + 1, announcement: '' },
      commands: [Copy({ text, label, revision: model.revision + 1 })],
    })),
    CompletedCopy: CodeClipboardBlock.makeStep((model, { revision, success, label }) =>
      revision !== model.revision
        ? { model }
        : {
            model: modifyFields(model, {
              announcement: () =>
                success ? `Copied ${label} to clipboard` : `Could not copy ${label}`,
            }),
          },
    ),
  }),
  view: CodeClipboardComposition.makeView((model, h) =>
    h.div(
      [h.Class('sr-only'), h.Role('status'), h.AriaLive('polite'), h.OnMount(Requests())],
      [model.announcement],
    ),
  ),
  EffectsLayer: Layer.mergeAll(Copy.layer, Requests.layer),
})
