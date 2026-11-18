// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Program, Runtime } from 'foldkit'
import { expect, vi } from 'vitest'
import {
  InputQueueLayoutExampleBlock,
  createInputQueueLayoutLayer,
} from '../examples/src/input-queue-layout-block.js'

it.live(
  'reorders real queue rows, retains survivors, and creates fresh physical rows after disposal',
  () =>
    Effect.gen(function* () {
      const host = document.createElement('div')
      document.body.append(host)
      const mount = () => {
        const container = document.createElement('div')
        container.id = 'queue-layout-test'
        host.replaceChildren(container)
        return Runtime.embed(
          Program.makeElement({
            block: InputQueueLayoutExampleBlock,
            layer: createInputQueueLayoutLayer(),
            container,
          }),
        )
      }
      const row = (id: string) => host.querySelector(`[data-queue-id="${id}"]`)
      const order = () =>
        [...host.querySelectorAll('[data-queue-id]')].map((element) =>
          element.getAttribute('data-queue-id'),
        )
      const click = (id: string) => {
        const element = host.querySelector(`#${id}`)
        if (element === null) throw new Error(`Missing ${id}`)
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }
      const first = mount()
      let original: Element | null = null
      try {
        yield* Effect.promise(() =>
          vi.waitFor(() => expect(order()).toEqual(['research', 'summary', 'share'])),
        )
        original = row('research')
        click('queue-reverse')
        yield* Effect.promise(() =>
          vi.waitFor(() => expect(order()).toEqual(['share', 'summary', 'research'])),
        )
        expect(row('research')).toBe(original)
        click('queue-reverse')
        click('queue-restore')
        yield* Effect.promise(() =>
          vi.waitFor(() => expect(order()).toEqual(['research', 'summary', 'share'])),
        )
        expect(row('research')).toBe(original)

        click('queue-reverse')
      } finally {
        yield* Effect.promise(() => first.dispose())
      }
      expect(original?.isConnected).toBe(false)
      const second = mount()
      try {
        yield* Effect.promise(() =>
          vi.waitFor(() => expect(order()).toEqual(['research', 'summary', 'share'])),
        )
        expect(row('research')).not.toBe(original)
        click('queue-reverse')
        yield* Effect.promise(() =>
          vi.waitFor(() => expect(order()).toEqual(['share', 'summary', 'research'])),
        )
      } finally {
        yield* Effect.promise(() => second.dispose())
        host.remove()
      }
    }),
)
