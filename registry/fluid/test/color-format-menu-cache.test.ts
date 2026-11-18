// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Cause, Effect, Exit, Layer, Schema } from 'effect'
import { Block, Program, Runtime, Scene, Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { inertHtml } from 'foldkit/html'
import type { ColorFormatMenuConfig } from '../src/color-picker-format-menu.js'
import { expect, expectTypeOf, test, vi } from 'vitest'
import { ColorFormatMenuBlock, layer as menuLayer } from '../src/color-picker-format-menu.js'
import {
  ColorPopupBlock,
  layer as popupLayer,
  test as popupTest,
} from '../src/color-picker-popup.js'
import type { ClosedColorPopupInputs } from '../src/color-picker-popup.js'
import type { ColorPickerProps } from '../src/color-picker-parts.js'
import { createColorPickerLayer } from '../src/color-picker-environment.js'
import { createPresentationContext } from '../src/presentation.js'
import { defaultIcons } from '../src/icons.js'
import { createMotionScope } from '../src/motion.js'
import { createSliderMotionScope } from '../src/slider-motion.js'
import { hoverHighlightAnimation } from '../src/hover-highlight.js'

const waitFor = (assertion: () => void) => Effect.promise(() => vi.waitFor(assertion))
const closedInputs: ClosedColorPopupInputs = {
  body: 'absent',
  triggerContent: () => [inertHtml.span([], ['Format'])],
}

test('closed popup inputs cannot carry animation or body callbacks', () => {
  expectTypeOf<ClosedColorPopupInputs['animate']>().toEqualTypeOf<undefined>()
  expectTypeOf<ClosedColorPopupInputs['content']>().toEqualTypeOf<undefined>()
})

it.effect('trigger-only popup inputs reject both open and retained-exit bodies', () =>
  Effect.gen(function* () {
    const subject = { block: ColorPopupBlock, layer: popupLayer }
    const open = yield* Effect.exit(
      Scene.scene(
        { ...subject, viewInputs: closedInputs },
        Scene.init({ id: 'invalid-open', kind: 'menu', defaultOpen: true }),
      ),
    )
    expect(Exit.isFailure(open)).toBe(true)
    if (Exit.isFailure(open)) expect(Cause.pretty(open.cause)).toContain('trigger-only ColorPopup')
    const snapshots: Array<typeof ColorPopupBlock.Model.Type> = []
    yield* Story.story(
      subject,
      Story.init({ id: 'invalid-retained', kind: 'menu', defaultOpen: true }),
      Story.inMessage(ColorPopupBlock.InMessage.RequestedOpen({ open: false })),
      Story.model((model) => {
        snapshots.push(model)
      }),
      Story.Command.resolve(
        popupTest.FinishExit,
        ColorPopupBlock.Message.CompletedExit({ generation: 1 }),
      ),
    )
    const retained = snapshots[0]
    if (retained === undefined) throw new Error('Missing retained model snapshot')
    expect(retained.open).toBe(false)
    expect(retained.present).toBe(true)
    const exit = yield* Effect.exit(
      Scene.scene({ ...subject, viewInputs: closedInputs }, Scene.given(retained)),
    )
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) expect(Cause.pretty(exit.cause)).toContain('trigger-only ColorPopup')
  }).pipe(Effect.provide(createColorPickerLayer())),
)

const useJsMotion = Effect.acquireRelease(
  Effect.sync(() => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
    if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
      throw new Error('Menu test requires scoped WAAPI capability removal')
    }
    return descriptor
  }),
  (descriptor) =>
    Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
)

function fixture(id: string) {
  const Message = defineMessageUnion({ Redraw: {}, Replace: {}, Compact: {}, Close: {} })
  const effects = Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof ColorFormatMenuBlock>['programRequirements']
  >()
  const key = Symbol(id)
  const Root = Block.make('FormatCache', {
    key,
    InitArgs: Schema.Tuple([]),
    Model: Schema.Struct({
      menu: ColorFormatMenuBlock.Model,
      tick: Schema.Int,
      alternate: Schema.Boolean,
      compact: Schema.Boolean,
    }),
    Message,
    effects,
    view: { kind: 'Element' },
  })
  const Menu = Root.makeRequiredFieldBinding(ColorFormatMenuBlock, {
    field: 'menu',
    init: { contextToArgs: () => [{ id, format: 'hex' }] satisfies [ColorFormatMenuConfig] },
  }).withOutMessagePolicy({
    fold: Root.makeOutMessageFold(ColorFormatMenuBlock, { Selected: Root.makeNoopStep }),
  })
  const composition = Root.makeComposition({ bindings: [Menu] })
  const motion = createMotionScope(`${id}-motion`)
  const slider = createSliderMotionScope(`${id}-slider`)
  const highlight = hoverHighlightAnimation(motion)
  const calls: string[] = []
  let iconRenders = 0
  const icons = {
    ...defaultIcons,
    'chevron-down': ((options, h) => {
      iconRenders += 1
      return defaultIcons['chevron-down'](options, h)
    }) satisfies (typeof defaultIcons)['chevron-down'],
  }
  const first: ColorPickerProps['animate'] = (node, options) => {
    calls.push('first')
    return motion.node(node, options)
  }
  const second: ColorPickerProps['animate'] = (node, options) => {
    calls.push('second')
    return motion.node(node, options)
  }
  const layer = Root.makeLayer({
    EffectsLayer: Layer.empty,
    init: composition.makeInit(() => ({ model: { tick: 0, alternate: false, compact: false } })),
    update: composition.makeUpdate({
      Redraw: (model) => ({ model: { ...model, tick: model.tick + 1 } }),
      Replace: (model) => ({ model: { ...model, alternate: true } }),
      Compact: (model) => ({ model: { ...model, compact: true } }),
      Close: Menu.requestDismiss({ restore: true }),
    }),
    view: composition.makeView((model, h) =>
      h.div(
        [
          h.DataAttribute('tick', String(model.tick)),
          h.DataAttribute('alternate', String(model.alternate)),
        ],
        [
          h.button([h.Id(`${id}-redraw`), h.OnClick(Message.Redraw())], ['Redraw']),
          h.button([h.Id(`${id}-replace`), h.OnClick(Message.Replace())], ['Replace']),
          h.button([h.Id(`${id}-compact`), h.OnClick(Message.Compact())], ['Compact']),
          h.button([h.Id(`${id}-close`), h.OnClick(Message.Close())], ['Close']),
          h.block(
            Menu.embedView({
              slotId: 'menu',
              model: model.menu,
              viewInputs: {
                context: createPresentationContext({
                  icons,
                  size: model.compact ? 'compact' : 'default',
                  shape: model.compact ? 'sharp' : 'rounded',
                }),
                animate: model.alternate ? second : first,
                sliderMotion: slider.node,
                highlightMotion: highlight,
              },
            }),
          ),
        ],
      ),
    ),
  }).pipe(Layer.provide(Layer.mergeAll(menuLayer, motion.layer, slider.layer)))
  const host = document.createElement('div')
  const container = document.createElement('div')
  container.id = `${id}-mount`
  host.append(container)
  document.body.append(host)
  const program = Runtime.embed(
    Program.makeElement({ block: Root, layer, container }).provide(
      createColorPickerLayer(document),
    ),
  )
  const click = (suffix: string) => {
    const node = host.querySelector(`#${id}-${suffix}`)
    if (node === null) throw new Error(`Missing ${id}-${suffix}`)
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }
  return {
    host,
    program,
    click,
    calls,
    iconRenders: () => iconRenders,
    trigger: () => host.querySelector<HTMLButtonElement>(`#${id}-trigger`),
    body: () => document.querySelector(`#${id}[data-color-popup]`),
  }
}

it.live(
  'closed boundary reuse keeps the trigger live and opening uses replaced animation callbacks',
  () =>
    Effect.gen(function* () {
      yield* useJsMotion
      const f = fixture('closed-format')
      try {
        yield* waitFor(() => expect(f.trigger()).not.toBeNull())
        const original = f.trigger()
        const icons = f.iconRenders()
        f.click('redraw')
        yield* waitFor(() => expect(f.host.querySelector('[data-tick="1"]')).not.toBeNull())
        f.click('replace')
        yield* waitFor(() => expect(f.host.querySelector('[data-alternate="true"]')).not.toBeNull())
        expect(f.iconRenders()).toBe(icons)
        expect(f.calls).toEqual([])
        expect(f.trigger()).toBe(original)
        f.click('compact')
        yield* waitFor(() => expect(f.iconRenders()).toBeGreaterThan(icons))
        expect(f.trigger()).toBe(original)
        original?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
        )
        yield* waitFor(() => {
          expect(f.trigger()?.getAttribute('aria-expanded')).toBe('true')
          expect(f.body()).not.toBeNull()
          expect(f.calls).toContain('second')
        })
        expect(f.calls).not.toContain('first')
        const body = f.body()
        f.click('close')
        yield* waitFor(() => expect(f.trigger()?.getAttribute('aria-expanded')).toBe('false'))
        expect(f.body()).toBe(body)
        f.click('trigger')
        yield* waitFor(() => expect(f.trigger()?.getAttribute('aria-expanded')).toBe('true'))
        expect(f.trigger()).toBe(original)
        expect(f.body()).toBe(body)
        f.click('close')
        yield* waitFor(() => expect(f.body()).toBeNull())
        expect(f.trigger()).toBe(original)
        expect(document.activeElement).toBe(original)
      } finally {
        yield* Effect.promise(() => f.program.dispose())
        f.host.remove()
      }
    }),
)

it.live('separate acquired menu caches dispatch to their own popup', () =>
  Effect.gen(function* () {
    yield* useJsMotion
    const first = fixture('first-format')
    const second = fixture('second-format')
    try {
      yield* waitFor(() => {
        expect(first.trigger()).not.toBeNull()
        expect(second.trigger()).not.toBeNull()
      })
      first.click('redraw')
      second.click('redraw')
      yield* waitFor(() => {
        expect(first.host.querySelector('[data-tick="1"]')).not.toBeNull()
        expect(second.host.querySelector('[data-tick="1"]')).not.toBeNull()
      })
      first.click('trigger')
      yield* waitFor(() => expect(first.trigger()?.getAttribute('aria-expanded')).toBe('true'))
      expect(second.trigger()?.getAttribute('aria-expanded')).toBe('false')
      expect(second.body()).toBeNull()
    } finally {
      yield* Effect.promise(() => first.program.dispose())
      yield* Effect.promise(() => second.program.dispose())
      first.host.remove()
      second.host.remove()
    }
  }),
)
