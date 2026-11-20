/* @license Ramka Foldkit port. MIT. Copyright (c) 2026 Artur Bień. */
import { Effect, Queue, Schema, Stream } from 'effect'
import { Render } from 'foldkit'
import { LightboxBlock, RamkaLightboxNamespace } from './block.js'
import { Environment } from './environment.js'
import { attachGallery } from './runtime.js'

export const Observe = RamkaLightboxNamespace.makeMountStream('Observe', {
  args: { id: Schema.String },
  messages: [
    LightboxBlock.Message.Opened,
    LightboxBlock.Message.Dismissed,
    LightboxBlock.Message.Navigated,
    LightboxBlock.Message.PoseRequested,
    LightboxBlock.Message.PullChanged,
    LightboxBlock.Message.ScrollingChanged,
    LightboxBlock.Message.DraggingChanged,
    LightboxBlock.Message.ZoomingChanged,
    LightboxBlock.Message.InitialPaintRetired,
    LightboxBlock.Message.Settled,
    LightboxBlock.Message.VisibilityCommitted,
    LightboxBlock.Message.ThumbnailStateChanged,
    LightboxBlock.Message.ZoomedIn,
    LightboxBlock.Message.ZoomedOut,
    LightboxBlock.Message.ZoomReset,
    LightboxBlock.Message.AvailabilityChanged,
    LightboxBlock.Message.MaximumMeasured,
    LightboxBlock.Message.HostFailed,
    LightboxBlock.Message.MorphTargetChanged,
    LightboxBlock.Message.OpenerResolved,
    LightboxBlock.Message.TriggerRegistryChanged,
    LightboxBlock.Message.PlaceholdersChanged,
  ],
  *handler() {
    const environment = yield* Environment
    const services = yield* Effect.context<never>()
    const flushRender = () => Effect.runSyncWith(services)(Render.flushSync)
    return ({ element, id, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof LightboxBlock.Message.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() =>
                    attachGallery(
                      element,
                      environment.forInstance(id),
                      (message) => {
                        Queue.offerUnsafe(queue, message)
                      },
                      flushRender,
                    ),
                  ),
                  (release) => Effect.sync(release),
                ),
              )
            : Stream.never,
        ),
      )
  },
})
