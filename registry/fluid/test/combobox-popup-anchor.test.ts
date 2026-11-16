// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import { ComboboxPopupBlock, layer as PopupLayer } from '../src/combobox-popup.js'
import { DialogResourcesLayer } from '../src/dialog-resources.js'

const RootKey = Symbol('ComboboxPopupAnchor')
const Message = defineMessageUnion({ Opened: {} })
const Root = Block.make('ComboboxPopupAnchor', {
  key: RootKey,
  Model: Schema.Struct({ popup: ComboboxPopupBlock.Model }),
  Message,
  InitArgs: Schema.Tuple([]),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof ComboboxPopupBlock>['programRequirements']
  >(),
  view: { kind: 'Element' },
})
const Popup = Root.makeRequiredFieldBinding(ComboboxPopupBlock, {
  field: 'popup',
  init: { contextToArgs: () => [{ id: 'anchor-popup', anchorId: 'anchor-field' }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(ComboboxPopupBlock, {
    Dismissed: Root.makeNoopStep,
    RowsChanged: Root.makeNoopStep,
  }),
})
const Composition = Root.makeComposition({ bindings: [Popup] })
const init = Composition.makeInit(() => ({ model: {} }))
const update = Composition.makeUpdate({ Opened: Popup.requestVisibility({ open: true }) })
const view = Composition.makeView((model, h) =>
  h.div(
    [],
    [
      h.div([h.Id('anchor-field')], [h.input([h.Role('combobox')])]),
      h.button([h.Id('open-anchor-popup'), h.OnClick(Message.Opened())], ['Open']),
      h.block(
        Popup.embedView({
          slotId: model.popup.id,
          model: model.popup,
          viewInputs: {
            animate: (node) => node,
            content: () => [h.div([h.DataAttribute('combo-value', 'first')], ['First item'])],
          },
        }),
      ),
    ],
  ),
)
const layer = Root.makeLayer({ init, update, view }).pipe(Layer.provide(PopupLayer))

it.live('source popup metadata follows real anchor positioning, flipping and scoped cleanup', () =>
  Effect.gen(function* () {
    const container = document.createElement('div')
    container.id = 'combobox-popup-anchor-regression'
    const host = document.createElement('div')
    host.append(container)
    document.body.append(host)
    const viewportWidth = vi
      .spyOn(document.documentElement, 'clientWidth', 'get')
      .mockReturnValue(window.innerWidth)
    const viewportHeight = vi
      .spyOn(document.documentElement, 'clientHeight', 'get')
      .mockReturnValue(window.innerHeight)
    const program = Runtime.embed(
      Program.makeElement({ block: Root, layer, container }).provide(
        DialogResourcesLayer(document),
      ),
    )
    let top = 100
    let width = 180
    try {
      yield* Effect.promise(() =>
        vi.waitFor(() => expect(host.querySelector('#anchor-field')).not.toBeNull()),
      )
      const anchor = host.querySelector('#anchor-field')
      if (!(anchor instanceof HTMLElement)) throw new Error('Missing anchor')
      Object.defineProperties(anchor, {
        getBoundingClientRect: {
          configurable: true,
          value: () => DOMRect.fromRect({ x: 40, y: top, width, height: 36 }),
        },
        offsetWidth: { configurable: true, get: () => width },
        offsetHeight: { configurable: true, value: 36 },
      })
      const open = host.querySelector('#open-anchor-popup')
      if (!(open instanceof HTMLButtonElement)) throw new Error('Missing open control')
      open.click()
      yield* Effect.promise(() =>
        vi.waitFor(() => expect(document.querySelector('#anchor-popup')).not.toBeNull()),
      )
      const popup = document.querySelector('#anchor-popup')
      if (!(popup instanceof HTMLElement)) throw new Error('Missing popup')
      Object.defineProperties(popup, {
        getBoundingClientRect: {
          configurable: true,
          value: () => DOMRect.fromRect({ x: 40, y: 0, width: 240, height: 120 }),
        },
        offsetWidth: { configurable: true, value: 240 },
        offsetHeight: { configurable: true, value: 120 },
      })
      window.dispatchEvent(new Event('resize'))
      yield* Effect.promise(() =>
        vi.waitFor(() => {
          expect(popup.dataset.placement).toBe('bottom')
          expect(popup.dataset.side).toBe('bottom')
          expect(popup.style.getPropertyValue('--button-width')).toBe('180px')
          expect(getComputedStyle(popup).getPropertyValue('--anchor-width')).toBe('180px')
        }),
      )
      top = window.innerHeight - 40
      width = 210
      window.dispatchEvent(new Event('resize'))
      yield* Effect.promise(() =>
        vi.waitFor(() => {
          expect(popup.dataset.placement).toBe('top')
          expect(popup.dataset.side).toBe('top')
          expect(getComputedStyle(popup).getPropertyValue('--anchor-width')).toBe('210px')
        }),
      )
      yield* Effect.promise(() => program.dispose())
      expect(popup.isConnected).toBe(false)
      popup.setAttribute('data-placement', 'bottom')
      yield* Effect.yieldNow
      expect(popup.dataset.side).toBe('top')
    } finally {
      yield* Effect.promise(() => program.dispose())
      host.remove()
      viewportWidth.mockRestore()
      viewportHeight.mockRestore()
    }
  }),
)
