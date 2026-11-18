// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { afterEach, describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { observeMessageScroller } from '../src/message-scroller-observer.js'

let release: () => void = () => undefined
afterEach(() => {
  release()
  document.body.replaceChildren()
})
const changed = Effect.sleep(0)
const wait = (ms: number) => Effect.sleep(ms)

function fixture(reduced = true) {
  const root = document.createElement('div')
  root.setAttribute('data-message-auto-scroll', 'true')
  root.setAttribute('data-message-peek', '16')
  root.setAttribute('data-message-scroll-request', '0')
  root.setAttribute('data-message-reduced-motion', reduced ? 'always' : 'never')
  const viewport = document.createElement('div')
  viewport.setAttribute('data-message-viewport', '')
  const content = document.createElement('div')
  content.setAttribute('data-message-content', '')
  const history = document.createElement('div')
  history.setAttribute('data-message-anchor', '')
  content.append(history)
  const spacer = document.createElement('div')
  spacer.setAttribute('data-message-spacer', '')
  viewport.append(content, spacer)
  root.append(viewport)
  document.body.append(root)
  let height = 600
  let top = 0
  Object.defineProperties(viewport, {
    clientHeight: { get: () => 200 },
    scrollHeight: { get: () => height + (Number.parseFloat(spacer.style.height) || 0) },
    scrollTop: {
      get: () => top,
      set: (value: number) => {
        top = Math.max(0, Math.min(value, viewport.scrollHeight - 200))
      },
    },
  })
  Object.defineProperties(content, {
    offsetTop: { get: () => 0 },
    offsetHeight: { get: () => height },
    offsetParent: { get: () => viewport },
  })
  const positions: Array<{ atEnd: boolean; following: boolean }> = []
  release = observeMessageScroller(root, {
    position: (atEnd, following) => positions.push({ atEnd, following }),
    buttonExited: () => undefined,
  })
  return {
    root,
    viewport,
    content,
    spacer,
    positions,
    grow: (next: number) => {
      height = next
      content.append(document.createTextNode('reply'))
    },
    anchor: (offset: number) => {
      const row = document.createElement('div')
      Object.defineProperties(row, {
        offsetTop: { get: () => offset },
        offsetParent: { get: () => content },
      })
      row.setAttribute('data-message-anchor', '')
      content.append(row)
      return row
    },
  }
}

describe('MessageScroller', () => {
  it.live(
    'opens history at the end, follows growth, and releases when the reader scrolls away',
    () =>
      Effect.gen(function* () {
        const f = fixture()
        expect(f.viewport.scrollTop).toBe(400)
        expect(f.spacer.style.height).toBe('')
        f.grow(800)
        yield* changed
        expect(f.viewport.scrollTop).toBe(600)
        f.viewport.scrollTop = 100
        f.viewport.dispatchEvent(new Event('scroll'))
        f.grow(1000)
        yield* changed
        expect(f.viewport.scrollTop).toBe(100)
        expect(f.positions.at(-1)).toEqual({ atEnd: false, following: false })
        f.viewport.scrollTop = 790
        f.viewport.dispatchEvent(new Event('scroll'))
        f.grow(1100)
        yield* changed
        expect(f.viewport.scrollTop).toBe(900)
        expect(f.positions.at(-1)).toEqual({ atEnd: true, following: true })
      }),
  )
  it.live(
    'anchors only a new user turn with a shrinking spacer, then follows an overflowing reply',
    () =>
      Effect.gen(function* () {
        const f = fixture()
        f.grow(640)
        const row = f.anchor(600)
        yield* changed
        expect(f.spacer.style.height).toBe('144px')
        expect(f.viewport.scrollTop).toBe(584)
        f.grow(700)
        yield* changed
        expect(f.spacer.style.height).toBe('84px')
        expect(f.viewport.scrollTop).toBe(584)
        f.grow(1000)
        yield* changed
        expect(f.spacer.style.height).toBe('0px')
        expect(f.viewport.scrollTop).toBe(800)
        row.remove()
        yield* changed
        expect(f.spacer.style.height).toBe('0px')
      }),
  )
  it.live(
    'resumes via the imperative request with reduced motion and honors autoScroll false afterward',
    () =>
      Effect.gen(function* () {
        const f = fixture()
        f.viewport.scrollTop = 20
        f.viewport.dispatchEvent(new Event('scroll'))
        f.root.setAttribute('data-message-scroll-request', '1')
        yield* changed
        expect(f.viewport.scrollTop).toBe(400)
        expect(f.positions.at(-1)).toEqual({ atEnd: true, following: true })
        f.viewport.scrollTop = 20
        f.viewport.dispatchEvent(new Event('scroll'))
        const button = document.createElement('button')
        button.setAttribute('data-message-jump', '')
        f.root.append(button)
        button.click()
        expect(f.viewport.scrollTop).toBe(400)
        f.root.setAttribute('data-message-auto-scroll', 'false')
        yield* changed
        f.grow(800)
        yield* changed
        expect(f.viewport.scrollTop).toBe(400)
      }),
  )
  it.live('re-reads a growing target during the actual spring glide', () =>
    Effect.gen(function* () {
      const f = fixture(false)
      f.viewport.scrollTop = 20
      f.viewport.dispatchEvent(new Event('scroll'))
      f.root.setAttribute('data-message-scroll-request', '1')
      yield* wait(40)
      f.grow(1000)
      yield* wait(500)
      expect(f.viewport.scrollTop).toBe(800)
      expect(f.positions.at(-1)).toEqual({ atEnd: true, following: true })
    }),
  )
  it.live(
    'interrupts a spring glide on manual scroll input and never resumes on subsequent growth',
    () =>
      Effect.gen(function* () {
        const f = fixture(false)
        f.viewport.scrollTop = 20
        f.viewport.dispatchEvent(new Event('scroll'))
        f.root.setAttribute('data-message-scroll-request', '1')
        yield* wait(40)
        f.viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
        const before = f.viewport.scrollTop
        yield* wait(30)
        expect(f.viewport.scrollTop).toBeGreaterThan(before)
        f.viewport.dispatchEvent(new Event('wheel'))
        const stopped = f.viewport.scrollTop
        f.grow(1000)
        yield* wait(300)
        expect(f.viewport.scrollTop).toBe(stopped)
        expect(f.positions.at(-1)).toEqual({ atEnd: false, following: false })
      }),
  )
  it.live('disconnects every observation and stops an in-flight glide when released', () =>
    Effect.gen(function* () {
      const f = fixture(false)
      f.viewport.scrollTop = 20
      f.root.setAttribute('data-message-scroll-request', '1')
      yield* wait(30)
      release()
      const top = f.viewport.scrollTop
      const count = f.positions.length
      f.grow(1000)
      f.root.setAttribute('data-message-scroll-request', '2')
      f.viewport.dispatchEvent(new Event('scroll'))
      yield* wait(300)
      expect(f.viewport.scrollTop).toBe(top)
      expect(f.positions).toHaveLength(count)
    }),
  )
})
