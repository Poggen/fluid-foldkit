import { InputFileUnavailable } from './input-file-error.js'
import { Context, Effect, Function, Layer, Queue, Stream } from 'effect'
import type { MessageFile } from './input-message-domain.js'
import { createInputMessageFileRegistry } from './input-message-file-registry.js'
import type { InputMessageFileRegistry } from './input-message-file-registry.js'

export { MessageFile as InputFile } from './input-message-domain.js'

export type { InputMessageFileRegistry as InputFileRegistry } from './input-message-file-registry.js'

export { InputFileUnavailable } from './input-file-error.js'

export class InputFileResources extends Context.Service<
  InputFileResources,
  {
    readonly readFile: (id: string) => Effect.Effect<File, InputFileUnavailable>
    readonly observeFiles: (
      element: Element,
      states: Stream.Stream<'Live' | 'Paused'>,
    ) => Stream.Stream<ReadonlyArray<MessageFile>>
  }
>()('FluidInputFileResources') {}

/** Share the existing file registry with InputMessage and thumbnail resources. */
export function makeInputFileResourcesLayer(registry: InputMessageFileRegistry) {
  return Layer.succeed(
    InputFileResources,
    InputFileResources.of({
      readFile: Effect.fn('InputFileResources.readFile')((id: string) =>
        Effect.try({ try: () => registry.file(id), catch: () => new InputFileUnavailable({ id }) }),
      ),
      observeFiles: (element, states) =>
        states.pipe(
          Stream.switchMap((state) => {
            const input =
              element instanceof HTMLInputElement ? element : element.querySelector('input')

            if (state !== 'Live' || !(input instanceof HTMLInputElement) || input.type !== 'file') {
              return Stream.never
            }

            return Stream.callback<ReadonlyArray<MessageFile>>((queue) =>
              Effect.acquireRelease(
                Effect.sync(() => {
                  let batchId: string | undefined
                  let live = true

                  const publish = (selected: ReadonlyArray<File>) => {
                    const next = registry.stage(selected, Function.constVoid)

                    if (batchId !== undefined) {
                      registry.settle(batchId, [])
                    }

                    ;({ batchId } = next)
                    Queue.offerUnsafe(queue, next.files)
                  }

                  const reset = (event: Event) => {
                    queueMicrotask(() => {
                      if (live && !event.defaultPrevented) {
                        publish([])
                      }
                    })
                  }

                  const change = () => {
                    publish([...(input.files ?? [])])
                  }

                  input.addEventListener('change', change)
                  input.form?.addEventListener('reset', reset)

                  change()

                  return () => {
                    live = false
                    input.removeEventListener('change', change)
                    input.form?.removeEventListener('reset', reset)

                    if (batchId !== undefined) {
                      registry.settle(batchId, [])
                    }
                  }
                }),
                (release) => Effect.sync(release),
              ).pipe(Effect.flatMap(() => Effect.never)),
            )
          }),
        ),
    }),
  )
}

/** Owns the registry for a complete form lifetime; injected registries remain host-owned. */
export const inputFileResourcesLayer = Layer.unwrap(
  Effect.acquireRelease(Effect.sync(createInputMessageFileRegistry), (registry) =>
    Effect.sync(() => {
      registry.dispose()
    }),
  ).pipe(Effect.map(makeInputFileResourcesLayer)),
)
