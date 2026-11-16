import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Story } from 'foldkit'
import { Effect, Schema } from 'effect'
import {
  NavMenuBlock as Nav,
  navMenuLayer,
  NavItemConfig,
  test as navTest,
} from '../src/nav-menu.js'
import { HoverBlock, test as hoverTest } from '../src/hover.js'
import { geometryFromEntries } from '../src/lib/indexed-geometry.js'

const subject = { block: Nav, layer: navMenuLayer }
const items = ['one', 'two'].map((value) =>
  NavItemConfig.make({
    value,
    label: value,
    href: `#${value}`,
    disabled: false,
    status: null,
    badge: null,
    level: 0,
  }),
)
const measure = (secondTop = 32) =>
  Story.messageIn(
    navTest.Hover,
    HoverBlock.Message.Measured({
      ready: true,
      itemRects: geometryFromEntries([
        { index: 0, rect: { left: 0, top: 0, width: 200, height: 32 } },
        { index: 1, rect: { left: 0, top: secondTop, width: 200, height: 32 } },
      ]),
      rowLayout: items.map((_item, index) => ({
        index,
        scopeKey: 'root',
        rowKey: `row-${index}`,
        visible: true,
        disabled: false,
      })),
    }),
  )
const configure = (activeSlug: string | null) =>
  Story.steps(
    Story.inMessage(Nav.InMessage.RequestedConfigure({ items, activeSlug })),
    Story.Command.expectExact(hoverTest.ControlHover),
    Story.Command.resolve(hoverTest.ControlHover, HoverBlock.Message.CompletedControl()),
  )

test.effect(
  'route removal retains its last rectangle and a reversal rejects an obsolete exit',
  () =>
    Effect.gen(function* () {
      const closing = yield* Story.story(
        subject,
        Story.init({ id: 'nav', items, activeSlug: '#one' }),
        measure(),
        configure('#one'),
        configure('#two'),
        Story.model((m) => {
          expect(m.indicators).toHaveLength(1)
          expect(m.indicators[0]?.rect.top).toBe(32)
        }),
        configure(null),
      )
      const exiting = closing.indicators[0]
      if (exiting === undefined) throw new Error('missing retained route')
      expect(exiting.phase).toBe('Exiting')
      expect(exiting.rect.top).toBe(32)
      const codec = Schema.fromJsonString(Nav.Model)
      const replayed = yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(closing))
      const closingAgain = yield* Story.story(
        subject,
        Story.given(replayed),
        configure('#one'),
        Story.message(
          Nav.Message.CompletedIndicator({ key: exiting.key, generation: exiting.generation }),
        ),
        Story.model((m) => {
          expect(m.indicators[0]?.phase).toBe('Present')
          expect(m.indicators[0]?.rect.top).toBe(0)
        }),
        configure(null),
      )
      const final = closingAgain.indicators[0]
      if (final === undefined) throw new Error('missing final route exit')
      yield* Story.story(
        subject,
        Story.given(closingAgain),
        Story.message(
          Nav.Message.CompletedIndicator({ key: final.key, generation: final.generation }),
        ),
        Story.model((m) => {
          expect(m.indicators).toEqual([])
        }),
        Story.Command.expectNone(),
      )
    }),
)

test.effect('keyboard focus survives blur until its own exit completes', () =>
  Effect.gen(function* () {
    const blurred = yield* Story.story(
      subject,
      Story.init({ id: 'nav', items, activeSlug: '#one' }),
      measure(),
      Story.message(Nav.Message.Focused({ index: 1, keyboard: true })),
      Story.message(Nav.Message.Focused({ index: null, keyboard: false })),
    )
    const focus = blurred.indicators.find((slot) => slot.kind === 'focus')
    if (focus === undefined) throw new Error('missing retained focus ring')
    expect(focus.phase).toBe('Exiting')
    expect(focus.rect.top).toBe(32)
    yield* Story.story(
      subject,
      Story.given(blurred),
      Story.message(
        Nav.Message.CompletedIndicator({ key: focus.key, generation: focus.generation }),
      ),
      Story.model((m) => {
        expect(m.indicators.some((slot) => slot.kind === 'focus')).toBe(false)
        expect(m.indicators.some((slot) => slot.kind === 'route')).toBe(true)
      }),
      Story.Command.expectNone(),
    )
  }),
)

test.effect('focus motion keeps row-change intent until the same physical row reflows', () =>
  Story.story(
    subject,
    Story.init({ id: 'focus-reflow', items }),
    measure(),
    Story.message(Nav.Message.Focused({ index: 1, keyboard: true })),
    Story.model((m) => {
      expect(m.indicators.find((slot) => slot.kind === 'focus')?.rowChanged).toBe(true)
    }),
    Story.message(Nav.Message.Focused({ index: 1, keyboard: true })),
    Story.model((m) => {
      expect(m.indicators.find((slot) => slot.kind === 'focus')?.rowChanged).toBe(true)
    }),
    measure(64),
    Story.message(Nav.Message.Focused({ index: 1, keyboard: true })),
    Story.model((m) => {
      expect(m.indicators.find((slot) => slot.kind === 'focus')?.rowChanged).toBe(false)
    }),
    Story.message(Nav.Message.Focused({ index: 1, keyboard: true })),
    Story.model((m) => {
      expect(m.indicators.find((slot) => slot.kind === 'focus')?.rowChanged).toBe(false)
    }),
    Story.message(Nav.Message.Focused({ index: 0, keyboard: true })),
    Story.model((m) => {
      expect(m.indicators.find((slot) => slot.kind === 'focus')?.rowChanged).toBe(true)
    }),
    Story.Command.expectNone(),
  ),
)
