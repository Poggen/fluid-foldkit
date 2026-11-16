// oxlint-disable no-comments/no-comments -- Vitest needs the actual DOM for native Nav ownership and visibility observations.
// @vitest-environment happy-dom
// oxlint-enable no-comments/no-comments -- Resume comment policy after required test metadata.
import { it } from '@effect/vitest'
import { Effect, Option, Schema } from 'effect'
import { expect } from 'vitest'
import { NavMenuBlock } from '../src/nav-menu.js'
import { rectAt } from '../src/lib/indexed-geometry.js'
import { acquireAuthoredNav, eventually } from './nav-menu-authored-program.js'

it.live(
  'authored Subs retain rows while one atomic observation excludes closed ancestry and preserves sibling scopes',
  () =>
    Effect.scoped(
      Effect.gen(function* closedAncestry() {
        const app = yield* acquireAuthoredNav
        const before = app.snapshot()
        const child = app.row('child')
        const deep = app.row('deep')
        const rows = Option.getOrThrow(before.menu.hover.rowLayout)
        const childScope = rows.find((row) => row.index === 1)?.scopeKey
        const childKey = rows.find((row) => row.index === 1)?.rowKey
        const peerScope = rows.find((row) => row.index === 4)?.scopeKey
        expect(childScope).toBeDefined()
        expect(peerScope).toBeDefined()
        expect(childScope).not.toBe(peerScope)
        expect(childKey).toBeDefined()
        expect(childKey).not.toBe(
          Option.getOrThrow(before.sibling.hover.rowLayout).find((row) => row.index === 1)?.rowKey,
        )
        expect(rectAt(before.menu.hover.itemRects, 0)?.height).toBe(32)
        expect(app.row('parent').closest('li')?.offsetHeight).toBe(300)
        expect(app.element('#parent-action').parentElement?.parentElement).toBe(
          app.row('parent').parentElement,
        )
        expect(app.row('parent').parentElement?.contains(app.row('child'))).toBe(false)

        const peerIndicator = before.menu.indicators.find(
          (slot) => slot.kind === 'route' && slot.rect.top === 128,
        )

        expect(peerIndicator).toBeDefined()

        app.makeUnavailable('tail')
        yield* app.click('measure')
        yield* Effect.sleep('80 millis')
        expect(app.snapshot().menu.hover.isMeasured).toBe(false)
        expect(rectAt(app.snapshot().menu.hover.itemRects, 5)?.height).toBe(32)
        app.installLayout()
        yield* app.click('measure')
        yield* eventually(() => {
          expect(app.snapshot().menu.hover.isMeasured).toBe(true)
        })

        yield* app.move('deep')
        yield* eventually(() => {
          expect(app.snapshot().menu.hover.activeIndex).toBe(2)
        })
        yield* app.click('toggle')
        yield* eventually(() => {
          const state = app.snapshot()
          const layout = Option.getOrThrow(state.menu.hover.rowLayout)
          expect(state.menu.hover.activeIndex).toBeNull()
          expect(layout.find((row) => row.index === 1)?.visible).toBe(false)
          expect(layout.find((row) => row.index === 2)?.visible).toBe(false)
          expect(layout.find((row) => row.index === 4)?.visible).toBe(true)
          expect(rectAt(state.menu.hover.itemRects, 1)).toBeUndefined()
          expect(rectAt(state.menu.hover.itemRects, 4)?.height).toBe(32)
          expect(
            state.menu.indicators.filter(
              (slot) => slot.kind === 'route' && slot.phase === 'Present',
            ),
          ).toHaveLength(1)
          expect(
            state.menu.indicators.some(
              (slot) => slot.key === peerIndicator?.key && slot.phase === 'Present',
            ),
          ).toBe(true)
        })
        expect(app.row('child')).toBe(child)
        expect(app.row('deep')).toBe(deep)
        expect(app.element('#authored-deep').dataset.state).toBe('open')
        expect(app.element('#authored-sub').dataset.state).toBe('closed')
        expect(child.getAttribute('aria-current')).toBe('page')
        expect(child.dataset.active).toBe('true')
        yield* eventually(() => {
          expect(child.tabIndex).toBe(-1)
        })
        expect(deep.tabIndex).toBe(-1)
        expect(app.element('#authored-sub').hasAttribute('inert')).toBe(false)

        yield* app.click('toggle')
        yield* eventually(() => {
          expect(
            Option.getOrThrow(app.snapshot().menu.hover.rowLayout).find((row) => row.index === 1)
              ?.scopeKey,
          ).toBe(childScope)
          expect(rectAt(app.snapshot().menu.hover.itemRects, 2)?.height).toBe(32)
          expect(child.tabIndex).toBe(0)
          expect(
            Option.getOrThrow(app.snapshot().menu.hover.rowLayout).find((row) => row.index === 1)
              ?.rowKey,
          ).toBe(childKey)
        })
        expect(app.row('child')).toBe(child)
        const codec = Schema.fromJsonString(NavMenuBlock.Model)
        const encoded = yield* Schema.encodeEffect(codec)(app.snapshot().menu)
        const decoded = yield* Schema.decodeEffect(codec)(encoded)
        expect(decoded).toEqual(app.snapshot().menu)
      }),
    ),
)

it.live(
  'one owner traverses visible DOM order, ignores subtree gutters, and respects parent refusal',
  () =>
    Effect.scoped(
      Effect.gen(function* visibleTraversal() {
        const app = yield* acquireAuthoredNav
        yield* app.click('accepts')
        app.row('parent').click()
        yield* eventually(() => {
          expect(app.snapshot().accepts).toBe(false)
        })
        expect(app.snapshot().open).toBe(true)
        expect(app.element('#authored-sub').dataset.state).toBe('open')
        yield* app.click('toggle')
        yield* eventually(() => {
          expect(
            Option.getOrThrow(app.snapshot().menu.hover.rowLayout).find((row) => row.index === 1)
              ?.visible,
          ).toBe(false)
        })
        const parent = app.row('parent')
        parent.focus()

        const arrow = new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          cancelable: true,
        })

        parent.dispatchEvent(arrow)
        expect(arrow.defaultPrevented).toBe(true)
        expect(document.activeElement).toBe(app.row('peer'))
        const end = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })
        app.row('peer').dispatchEvent(end)
        expect(document.activeElement).toBe(app.row('tail'))
        const home = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })
        app.row('tail').dispatchEvent(home)
        expect(document.activeElement).toBe(parent)
        yield* app.move('peer-child')
        yield* eventually(() => {
          expect(app.snapshot().menu.hover.activeIndex).toBe(4)
        })
        parent
          .closest('li')
          ?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 20, clientY: 80 }))
        yield* eventually(() => {
          expect(app.snapshot().menu.hover.activeIndex).toBeNull()
        })
        yield* app.move('child', true)
        yield* eventually(() => {
          expect(app.snapshot().sibling.hover.activeIndex).toBe(1)
        })
        expect(app.snapshot().menu.hover.activeIndex).toBeNull()
      }),
    ),
)

it.live(
  'physical reordering, conditional retirement and remount keep identity and reject detached actions',
  () =>
    Effect.scoped(
      Effect.gen(function* physicalRetirement() {
        const app = yield* acquireAuthoredNav
        const parent = app.row('parent')
        const child = app.row('child')
        const deep = app.row('deep')

        const beforeKey = Option.getOrThrow(app.snapshot().menu.hover.rowLayout).find(
          (row) => row.index === 2,
        )?.rowKey

        yield* app.click('swap')
        yield* eventually(() => {
          expect(
            Option.getOrThrow(app.snapshot().menu.hover.rowLayout).map((row) => row.index),
          ).toEqual([5, 3, 4, 0, 1, 2])
        })
        expect(app.row('parent')).toBe(parent)
        expect(app.row('child')).toBe(child)
        yield* app.click('retire')
        yield* eventually(() => {
          expect(
            Option.getOrThrow(app.snapshot().menu.hover.rowLayout).map((row) => row.index),
          ).toEqual([5, 3, 4, 0, 1])
        })
        expect(deep.isConnected).toBe(false)
        deep.click()
        expect(Option.isNone(app.snapshot().menu.activeSlug)).toBe(true)
        yield* app.click('retire')
        yield* eventually(() => {
          expect(app.row('deep').isConnected).toBe(true)
        })
        expect(app.row('child')).toBe(child)
        expect(app.row('deep')).not.toBe(deep)
        yield* eventually(() => {
          const rowKey = Option.getOrThrow(app.snapshot().menu.hover.rowLayout).find(
            (row) => row.index === 2,
          )?.rowKey

          expect(rowKey).toBeDefined()
          expect(rowKey).not.toBe(beforeKey)
        })
        yield* app.click('measure')
        yield* app.click('visible')
        yield* eventually(() => {
          expect(parent.isConnected).toBe(false)
        })
        yield* app.click('visible')
        yield* eventually(() => {
          expect(app.row('parent').isConnected).toBe(true)
        })
        expect(app.row('parent')).not.toBe(parent)
        app.installLayout()
        yield* app.click('measure')
        yield* eventually(() => {
          expect(app.snapshot().menu.hover.isMeasured).toBe(true)
        })
        expect(
          Option.getOrThrow(app.snapshot().menu.hover.rowLayout).map((row) => row.index),
        ).toEqual([5, 3, 4, 0, 1, 2])
      }),
    ),
)

it.live(
  'same-row submenu reflow snaps public overlay targets while authored row changes retain springs',
  () =>
    Effect.scoped(
      Effect.gen(function* reflowIntent() {
        const app = yield* acquireAuthoredNav
        const peerChild = app.row('peer-child')
        yield* app.move('peer-child')
        yield* eventually(() => {
          expect(app.element('[data-hover-present="true"]').dataset.hoverTransition).toBe('spring')
          expect(app.element('[data-hover-present="true"]').dataset.hoverTargetTop).toBe('128')
          expect(app.element('[data-nav-target-top="128"]').dataset.navTransition).toContain(
            '"opacity"',
          )
        })

        yield* app.click('toggle')
        yield* eventually(() => {
          expect(rectAt(app.snapshot().menu.hover.itemRects, 4)?.top).toBe(64)
          expect(app.element('[data-hover-present="true"]').dataset.hoverTransition).toBe('snap')
          expect(app.element('[data-hover-present="true"]').dataset.hoverTargetTop).toBe('64')
          expect(app.element('[data-nav-target-top="64"]').dataset.navTransition).toBe(
            '{"duration":0}',
          )
        })
        expect(app.row('peer-child')).toBe(peerChild)
        yield* app.click('accepts')
        yield* eventually(() => {
          expect(app.element('[data-hover-present="true"]').dataset.hoverTransition).toBe('snap')
          expect(app.element('[data-nav-target-top="64"]').dataset.navTransition).toBe(
            '{"duration":0}',
          )
        })

        yield* app.move('tail')
        yield* eventually(() => {
          expect(app.element('[data-hover-present="true"]').dataset.hoverTargetTop).toBe('96')
          expect(app.element('[data-hover-present="true"]').dataset.hoverTransition).toBe('spring')
        })
      }),
    ),
)
