import { Effect, Layer } from 'effect'
import { DialogResourcesLayer } from '@foldkit-visuals/fluid/dialog'
import type { DialogCallbacks } from '@foldkit-visuals/fluid/dialog'

function makeDialogHookCallbacks(
  document: Document,
  traceRef: (element: HTMLElement | null) => void,
) {
  const policies: Readonly<Record<string, DialogCallbacks>> = {
    none: {},
    'open-focus': {
      onOpenAutoFocus: (event) => {
        event.preventDefault()
        document.getElementById('lab-secondary-focus')?.focus()
      },
    },
    'close-focus': { onCloseAutoFocus: (event) => event.preventDefault() },
    escape: { onEscapeKeyDown: (event) => event.preventDefault() },
    pointer: { onPointerDownOutside: (event) => event.preventDefault() },
    focus: { onFocusOutside: (event) => event.preventDefault() },
    interact: { onInteractOutside: (event) => event.preventDefault() },
    ref: { contentRef: traceRef },
  }
  return (_id: string, policy?: string) =>
    (policies[policy ?? 'none'] ?? policies.none ?? {}) satisfies DialogCallbacks
}

/** Logging runs synchronously with the construction Layer's captured Effect context. */
export const makeDialogExampleResourcesLayer = (document: Document) =>
  Layer.unwrap(
    Effect.gen(function* () {
      const context = yield* Effect.context<never>()
      const log = Effect.runSyncWith(context)
      const callbacks = makeDialogHookCallbacks(document, (element) => {
        log(Effect.logInfo('Dialog contentRef', element === null ? 'released' : 'acquired'))
      })
      return DialogResourcesLayer(document, { callbacks })
    }),
  )
