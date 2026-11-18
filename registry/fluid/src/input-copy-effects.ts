/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Effect, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Status, Variant } from './input-copy-state.js'
import { InputCopyResources } from './input-copy-resources.js'

export const Message = defineMessageUnion({
  CapturedCopy: {},
  CapturedMount: {},
  CapturedPointerDown: {},
  CapturedEnter: {},
  CapturedLeave: {},
  CompletedCopy: { ok: Schema.Boolean, lifetimeRevision: Schema.Natural },
  ExpiredResult: { copyCount: Schema.Natural, lifetimeRevision: Schema.Natural },
  CompletedGlyphExit: {
    rootRevision: Schema.Natural,
    displayedCount: Schema.Natural,
    displayed: Status,
    displayedVariant: Variant,
  },
})

export const InputCopyNamespace = Block.makeNamespace('InputCopy')

export const Copy = InputCopyNamespace.makeCommand('Copy', {
  args: { value: Schema.String, lifetimeRevision: Schema.Natural },
  messages: [Message.CompletedCopy],
  *handler() {
    const resources = yield* InputCopyResources

    return ({ value, lifetimeRevision }) =>
      resources
        .copy(value)
        .pipe(Effect.map((ok) => Message.CompletedCopy({ ok, lifetimeRevision })))
  },
})

export const Expire = InputCopyNamespace.makeCommand('Expire', {
  args: { id: Schema.String, copyCount: Schema.Natural, lifetimeRevision: Schema.Natural },
  messages: [Message.ExpiredResult],
  *handler() {
    const resources = yield* InputCopyResources

    return ({ id, copyCount, lifetimeRevision }) =>
      resources
        .waitForResultWindow(id)
        .pipe(Effect.as(Message.ExpiredResult({ copyCount, lifetimeRevision })))
  },
})

export const ResultLifetime = InputCopyNamespace.makeMountStream('ResultLifetime', {
  args: { id: Schema.String },
  messages: [Message.CapturedMount],
  *handler() {
    const resources = yield* InputCopyResources

    return ({ id, element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.CapturedMount.Type>((queue) =>
                Effect.acquireRelease(
                  resources.mountResultWindow(id, element).pipe(
                    Effect.tap(({ isNew }) =>
                      Effect.sync(() => {
                        if (isNew) {
                          Queue.offerUnsafe(queue, Message.CapturedMount())
                        }
                      }),
                    ),
                  ),
                  ({ release }) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})
