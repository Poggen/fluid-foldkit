// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { describe, expect, vi } from 'vitest'
import { MIRROR_TARGETS_ATTRIBUTE, observeSelectionMirrors } from '../src/selection-mirrors.js'

describe('selection mirror presentation', () => {
  it.live(
    'copies committed shapes without IDs, interaction, independent animation, or leaked nodes',
    () =>
      Effect.gen(function* () {
        const source = document.createElement('div')
        const shape = document.createElement('div')
        shape.id = 'owned-shape'
        shape.style.top = '40px'
        source.append(shape)
        const host = document.createElement('div')
        host.id = 'mirror-host'
        document.body.append(source, host)
        const release = observeSelectionMirrors(source, [host.id])
        expect(host.querySelector('[data-selection-mirror]')?.hasAttribute('inert')).toBe(true)
        expect(host.querySelector('[id]')).toBeNull()
        shape.style.top = '72px'
        yield* Effect.sleep(10)
        expect(host.querySelector<HTMLElement>('[data-selection-mirror] > div')?.style.top).toBe(
          '72px',
        )
        source.setAttribute(`data-${MIRROR_TARGETS_ATTRIBUTE}`, '[]')
        yield* Effect.sleep(10)
        expect(host.children.length).toBe(0)
        source.setAttribute(`data-${MIRROR_TARGETS_ATTRIBUTE}`, JSON.stringify([host.id]))
        yield* Effect.sleep(10)
        expect(host.querySelector('[data-selection-mirror]')).not.toBeNull()
        host.remove()
        yield* Effect.sleep(10)
        expect(host.children.length).toBe(0)
        release()
        source.remove()
      }),
  )
  it.live('two owners settle independently and only host membership changes recreate copies', () =>
    Effect.gen(function* () {
      const releases: Array<() => void> = []
      const elements: Array<HTMLElement> = []
      let callbacks = 0
      let capped = false
      const NativeObserver = MutationObserver
      vi.stubGlobal(
        'MutationObserver',
        class extends NativeObserver {
          constructor(callback: MutationCallback) {
            super((records, observer) => {
              callbacks += 1
              if (callbacks >= 60) {
                capped = true
                for (const release of releases) release()
              } else callback(records, observer)
            })
          }
        },
      )
      try {
        const owners = [0, 1].map((index) => {
          const source = document.createElement('div')
          const shape = document.createElement('div')
          source.append(shape)
          const host = document.createElement('div')
          host.id = `two-owner-${index}`
          document.body.append(source, host)
          elements.push(source, host)
          releases.push(observeSelectionMirrors(source, [host.id]))
          return { source, shape, host }
        })
        const [first, second] = owners
        if (first === undefined || second === undefined) throw new Error('Both owners are required')
        yield* Effect.sleep(10)
        expect(capped).toBe(false)
        const secondCopy = second.host.querySelector('[data-selection-mirror] > div')
        const unrelated = document.createElement('div')
        document.body.append(unrelated)
        elements.push(unrelated)
        first.shape.style.top = '24px'
        yield* Effect.sleep(10)
        expect(capped).toBe(false)
        expect(
          first.host.querySelector<HTMLElement>('[data-selection-mirror] > div')?.style.top,
        ).toBe('24px')
        expect(second.host.querySelector('[data-selection-mirror] > div')).toBe(secondCopy)
        const replacement = document.createElement('div')
        replacement.id = first.host.id
        first.host.replaceWith(replacement)
        elements.push(replacement)
        yield* Effect.sleep(10)
        expect(first.host.children).toHaveLength(0)
        expect(
          replacement.querySelector<HTMLElement>('[data-selection-mirror] > div')?.style.top,
        ).toBe('24px')
        expect(second.host.querySelector('[data-selection-mirror] > div')).toBe(secondCopy)
        expect(capped).toBe(false)
      } finally {
        for (const release of releases) release()
        for (const element of elements) element.remove()
        vi.unstubAllGlobals()
      }
    }),
  )
})
