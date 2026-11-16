import { Context, Effect, Layer, Stream } from 'effect'
import type { Scope } from 'effect'
import type { DialogBranch } from './dialog-branches.js'
import type { DialogPointerBarrier } from './dialog-pointer-barrier.js'
import type { DialogObservation } from './dialog-observation.js'
import type { DialogResourceOptions } from './dialog-resource-contract.js'
import { createDialogRuntime } from './dialog-runtime.js'

export type { DialogCallbacks, DialogResourceOptions } from './dialog-resource-contract.js'

export type { DialogLifecycleEvent } from './dialog-focus.js'

export type { DialogBranch } from './dialog-branches.js'

export type { DialogPointerBarrier } from './dialog-pointer-barrier.js'

export class DialogResources extends Context.Service<
  DialogResources,
  {
    readonly leasePointerBarrier: (
      input: DialogPointerBarrier,
    ) => Effect.Effect<void, never, Scope.Scope>
    readonly registerBranch: (input: DialogBranch) => Effect.Effect<void, never, Scope.Scope>
    readonly mountPortal: (
      element: Element,
      id: string,
      targetId: string,
    ) => Effect.Effect<boolean, never, Scope.Scope>
    readonly resolveContainer: (id: string, targetId: string) => Effect.Effect<boolean>
    readonly observeRoot: (element: Element, id: string) => Stream.Stream<DialogObservation>
  }
>()('FluidDialogResources') {}

/** Construction captures policy; DOM acquisition belongs to each physical Mount. */
export const DialogResourcesLayer = (document: Document, options: DialogResourceOptions = {}) =>
  Layer.effect(
    DialogResources,
    Effect.sync(() => createDialogRuntime(document, options)),
  )

export const DialogResourcesServerLayer = Layer.succeed(
  DialogResources,
  DialogResources.of({
    leasePointerBarrier: () => Effect.void,
    registerBranch: () => Effect.void,
    mountPortal: () => Effect.succeed(false),
    resolveContainer: () => Effect.succeed(false),
    observeRoot: () => Stream.never,
  }),
)
