import { replaceUrl } from 'foldkit/navigation'
import { configurationUrl, PlaygroundConfiguration } from '../playground/configuration'
import { Effect, Random, Schema, Queue, Stream } from 'effect'
import { pageAt } from '../../../lib/catalogue'
import { controlsFor, initialConfiguration } from '../playground/page'
import { updateConfiguration } from '../playground/configuration'
import { ComponentReferenceBlock } from './block'
export const Shuffle = ComponentReferenceBlock.makeCommand('Shuffle', {
  args: { path: Schema.String, revision: Schema.Natural },
  messages: [ComponentReferenceBlock.Message.CompletedShuffle],
  *handler() {
    return ({ path, revision }) =>
      Effect.gen(function* () {
        const page = pageAt(path)
        if (page === undefined)
          return ComponentReferenceBlock.Message.CompletedShuffle({
            path,
            revision,
            configuration: { _tag: 'none' },
          })
        let configuration = initialConfiguration(page)
        for (const control of controlsFor(page)) {
          const random = yield* Random.next
          const value =
            control.kind === 'choice'
              ? (control.values[Math.floor(random * control.values.length)] ?? control.initial)
              : control.kind === 'toggle'
                ? random > 0.5
                : control.kind === 'number'
                  ? Math.min(
                      control.max,
                      control.min +
                        Math.round((random * (control.max - control.min)) / control.step) *
                          control.step,
                    )
                  : (control.values[Math.floor(random * control.values.length)] ?? control.initial)
          configuration = updateConfiguration(configuration, control.prop, value)
        }
        return ComponentReferenceBlock.Message.CompletedShuffle({ path, revision, configuration })
      })
  },
})
export const ShuffleShortcut = ComponentReferenceBlock.makeMountStream('ShuffleShortcut', {
  messages: [ComponentReferenceBlock.Message.RequestedShuffle],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Paused'
            ? Stream.never
            : Stream.callback<typeof ComponentReferenceBlock.Message.RequestedShuffle.Type>(
                (queue) =>
                  Effect.acquireRelease(
                    Effect.sync(() => {
                      const document = element.ownerDocument
                      const keydown = (event: KeyboardEvent) => {
                        if (
                          event.key.toLowerCase() !== 'x' ||
                          event.metaKey ||
                          event.ctrlKey ||
                          event.altKey ||
                          event.repeat
                        )
                          return
                        const target = event.target
                        if (
                          !(target instanceof Element) ||
                          target.closest(
                            'input,textarea,select,[contenteditable],[role=listbox],[role=menu],[role=dialog],[role=combobox],[role=option]',
                          )
                        )
                          return
                        event.preventDefault()
                        Queue.offerUnsafe(queue, ComponentReferenceBlock.Message.RequestedShuffle())
                      }
                      document.addEventListener('keydown', keydown)
                      return () => document.removeEventListener('keydown', keydown)
                    }),
                    (release) => Effect.sync(release),
                  ).pipe(Effect.flatMap(() => Effect.never)),
              ),
        ),
      )
  },
})

export const SynchronizeConfigurationUrl = ComponentReferenceBlock.makeCommand(
  'SynchronizeConfigurationUrl',
  {
    args: { path: Schema.String, configuration: PlaygroundConfiguration },
    messages: [ComponentReferenceBlock.Message.CompletedSynchronizeConfigurationUrl],
    *handler() {
      return ({ path, configuration }) =>
        Effect.suspend(() =>
          typeof window === 'undefined'
            ? Effect.void
            : replaceUrl(configurationUrl(window.location.href, path, configuration)),
        ).pipe(Effect.as(ComponentReferenceBlock.Message.CompletedSynchronizeConfigurationUrl()))
    },
  },
)
