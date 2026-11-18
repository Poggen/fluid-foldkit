// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { describe, expect } from 'vitest'
import { MIRROR_TARGETS_ATTRIBUTE, observeSelectionMirrors } from '../src/selection-mirrors.js'

const afterChange = (ready: () => boolean, change: () => void) =>
  Effect.callback<void>((resume) => {
    const check = () => {
      if (ready()) resume(Effect.void)
    }
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    })
    change()
    check()
    return Effect.sync(() => observer.disconnect())
  })

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
        yield* afterChange(
          () =>
            host.querySelector<HTMLElement>('[data-selection-mirror] > div')?.style.top === '72px',
          () => {
            shape.style.top = '72px'
          },
        )
        expect(host.querySelector<HTMLElement>('[data-selection-mirror] > div')?.style.top).toBe(
          '72px',
        )
        yield* afterChange(
          () => host.children.length === 0,
          () => source.setAttribute(`data-${MIRROR_TARGETS_ATTRIBUTE}`, '[]'),
        )
        expect(host.children.length).toBe(0)
        yield* afterChange(
          () => host.querySelector('[data-selection-mirror]') !== null,
          () => source.setAttribute(`data-${MIRROR_TARGETS_ATTRIBUTE}`, JSON.stringify([host.id])),
        )
        expect(host.querySelector('[data-selection-mirror]')).not.toBeNull()
        yield* afterChange(
          () => host.children.length === 0,
          () => host.remove(),
        )
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
      const watchdog = new MutationObserver(() => {
        callbacks += 1
        if (callbacks >= 60) {
          capped = true
          for (const release of releases) release()
        }
      })
      watchdog.observe(document.documentElement, { childList: true, subtree: true })
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
        expect(capped).toBe(false)
        const secondCopy = second.host.querySelector('[data-selection-mirror] > div')
        const unrelated = document.createElement('div')
        elements.push(unrelated)
        yield* afterChange(
          () =>
            first.host.querySelector<HTMLElement>('[data-selection-mirror] > div')?.style.top ===
            '24px',
          () => {
            document.body.append(unrelated)
            first.shape.style.top = '24px'
          },
        )
        expect(capped).toBe(false)
        expect(
          first.host.querySelector<HTMLElement>('[data-selection-mirror] > div')?.style.top,
        ).toBe('24px')
        expect(second.host.querySelector('[data-selection-mirror] > div')).toBe(secondCopy)
        const replacement = document.createElement('div')
        replacement.id = first.host.id
        elements.push(replacement)
        yield* afterChange(
          () =>
            replacement.querySelector<HTMLElement>('[data-selection-mirror] > div')?.style.top ===
            '24px',
          () => first.host.replaceWith(replacement),
        )
        expect(first.host.children).toHaveLength(0)
        expect(
          replacement.querySelector<HTMLElement>('[data-selection-mirror] > div')?.style.top,
        ).toBe('24px')
        expect(second.host.querySelector('[data-selection-mirror] > div')).toBe(secondCopy)
        expect(capped).toBe(false)
      } finally {
        watchdog.disconnect()
        for (const release of releases) release()
        for (const element of elements) element.remove()
      }
    }),
  )
})
