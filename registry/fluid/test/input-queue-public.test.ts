// @vitest-environment happy-dom -- the maintained queue consumer owns real DOM resources
import { it } from '@effect/vitest'
import { Effect, Layer, Schedule } from 'effect'
import { Program, Runtime } from 'foldkit'
import { expect } from 'vitest'
import {
  InputQueueExampleBlock,
  createInputQueueExampleLayer,
} from '../examples/src/input-queue-example-block.js'
import { createInputMessageQueueNativeLayer } from '@foldkit-visuals/fluid/input-message-queue'
import { createQueuedStackFramesLayer } from '@foldkit-visuals/fluid/queued-stack'
import { makeTouchPrimaryLayer } from '@foldkit-visuals/fluid/touch-primary'
import { makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import { makeFileThumbnailResourcesLayer } from '@foldkit-visuals/fluid/file-thumbnail'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('20 millis') }))

it.live(
  'routes real row keyboard edits and releases thumbnail URLs on consumer unmount and disposal',
  () =>
    Effect.gen(function* queueLifetime() {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

          if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
            throw new Error('Queue resource test requires scoped WAAPI capability removal')
          }

          return descriptor
        }),
        (descriptor) =>
          Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
      )
      const container = document.createElement('div')
      container.id = 'queue-public-test'
      const host = document.createElement('div')
      host.append(container)
      document.body.append(host)
      const revoked: Array<string> = []
      let acquired = 0
      const file = new File(['preview'], 'preview.png', { type: 'image/png' })

      const resources = Layer.mergeAll(
        createInputMessageQueueNativeLayer(window),
        createQueuedStackFramesLayer(window),
        makeTooltipDomLayer(document, window),
        makeTouchPrimaryLayer(window),
        makeFileThumbnailResourcesLayer({
          file: () => file,
          createObjectURL: () => {
            acquired += 1

            return `blob:queue-${acquired}`
          },
          revokeObjectURL: (url) => {
            revoked.push(url)
          },
        }),
      )

      const program = Runtime.embed(
        Program.makeElement({
          block: InputQueueExampleBlock,
          layer: createInputQueueExampleLayer(window),
          container,
        }).provide(resources),
      )

      const click = (id: string) => {
        const button = host.querySelector<HTMLButtonElement>(`#${id}`)

        if (button === null) {
          throw new Error(`Missing ${id}`)
        }

        button.click()
      }

      try {
        yield* eventually(() => {
          expect(host.querySelectorAll('[data-fluid-reorder-item]')).toHaveLength(3)
        })
        const row = host.querySelector<HTMLLIElement>('[data-fluid-reorder-item]')

        if (row === null) {
          throw new Error('Missing first queue row')
        }

        yield* eventually(() => {
          const key = new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true })
          row.dispatchEvent(key)
          expect(key.defaultPrevented).toBe(true)
        })
        yield* eventually(() => {
          expect(host.querySelector('#queue-edit')?.textContent).toBe('Review the research notes')
        })
        click('queue-attachment')
        yield* eventually(() => {
          expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:queue-1')
        })
        const oldImage = host.querySelector('img')
        click('queue-mount')
        yield* eventually(() => {
          expect(revoked).toEqual(['blob:queue-1'])
        })
        expect(oldImage?.isConnected).toBe(false)
        click('queue-mount')
        yield* eventually(() => {
          expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:queue-2')
        })
        expect(host.querySelector('img')).not.toBe(oldImage)
        click('queue-dispatch')
        yield* eventually(() => {
          expect(
            host.querySelector<HTMLDivElement>('#queue-bubble-summary')?.dataset.layoutId,
          ).toBe('input-queue-example:qm-summary')
        })
        yield* Effect.sleep('250 millis')
        click('queue-dispatch')
        yield* eventually(() => {
          expect(host.querySelector<HTMLDivElement>('#queue-bubble-share')?.dataset.layoutId).toBe(
            'input-queue-example:qm-share',
          )
        })
        yield* Effect.sleep('250 millis')
        expect(host.querySelector<HTMLDivElement>('#queue-bubble-share')?.dataset.layoutId).toBe(
          'input-queue-example:qm-share',
        )
        yield* eventually(() => {
          expect(
            host.querySelector<HTMLDivElement>('#queue-bubble-share')?.dataset.layoutId !==
              undefined,
          ).toBe(false)
        })
      } finally {
        yield* Effect.promise(program.dispose)
        host.remove()
      }

      expect(revoked).toEqual(['blob:queue-1', 'blob:queue-2'])
    }).pipe(Effect.scoped),
)
