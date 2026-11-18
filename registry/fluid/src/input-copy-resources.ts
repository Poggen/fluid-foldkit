/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Context, Effect, Function, Layer } from 'effect'

const copyViaExecCommand: (document: Document, value: string) => boolean =
  function copyViaExecCommand(document: Document, value: string) {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.readOnly = true
    textarea.className = 'fixed opacity-0 text-[16px]'
    document.body.append(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    try {
      const fallback: CopyFallbackDocument = document

      return fallback.execCommand?.('copy') === true
    } catch {
      return false
    } finally {
      textarea.remove()
    }
  }

export class InputCopyResources extends Context.Service<
  InputCopyResources,
  {
    readonly copy: (value: string) => Effect.Effect<boolean>
    readonly waitForResultWindow: (id: string) => Effect.Effect<void>
    readonly mountResultWindow: (
      id: string,
      element: Element,
    ) => Effect.Effect<{ readonly release: () => void; readonly isNew: boolean }>
  }
>()('FluidInputCopyResources') {}

interface CopyFallbackDocument {
  readonly execCommand?: (commandId: string) => boolean
}

/** Clipboard and timer authority stays inside the acquired handler service. */
export function createInputCopyLayer(document: Document, navigator: Navigator, window: Window) {
  return Layer.effect(
    InputCopyResources,
    Effect.acquireRelease(
      Effect.sync(() => {
        const pending = new Map<string, { readonly cancel: () => void }>()
        const roots = new Map<string, Element>()
        const mounted = new WeakSet<Element>()

        const service = InputCopyResources.of({
          mountResultWindow: (id, element) =>
            Effect.sync(() => {
              const previous = roots.get(id)

              if (previous !== undefined && previous !== element) {
                pending.get(id)?.cancel()
                pending.delete(id)
              }

              roots.set(id, element)
              const isNew = !mounted.has(element)
              mounted.add(element)

              const release = () => {
                if (roots.get(id) !== element) {
                  return
                }

                roots.delete(id)
                pending.get(id)?.cancel()
                pending.delete(id)
              }

              return { release, isNew }
            }),
          waitForResultWindow: (id) =>
            Effect.callback((resume) => {
              pending.get(id)?.cancel()

              const timer = window.setTimeout(() => {
                pending.delete(id)
                resume(Effect.void)
              }, 2000)

              const entry = {
                cancel: () => {
                  window.clearTimeout(timer)
                  resume(Effect.interrupt)
                },
              }

              pending.set(id, entry)

              return Effect.sync(() => {
                window.clearTimeout(timer)

                if (pending.get(id) === entry) {
                  pending.delete(id)
                }
              })
            }),
          copy: (value) =>
            Effect.try(() => navigator.clipboard.writeText.bind(navigator.clipboard)).pipe(
              Effect.flatMap((write) =>
                Effect.tryPromise(Function.flow(Function.constant(value), write)),
              ),
              Effect.matchEffect({
                onSuccess: () => Effect.succeed(true),
                onFailure: () => Effect.sync(() => copyViaExecCommand(document, value)),
              }),
            ),
        })

        return {
          service,
          release: () => {
            for (const entry of pending.values()) {
              entry.cancel()
            }

            pending.clear()
            roots.clear()
          },
        }
      }),
      (owner) => Effect.sync(owner.release),
    ).pipe(Effect.map((owner) => owner.service)),
  )
}
