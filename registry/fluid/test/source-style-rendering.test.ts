// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { renderToString } from 'foldkit/experimental/server'
import { expect, vi } from 'vitest'
import { BannerTitle } from '../src/banner.js'
import { CardEyebrow } from '../src/card.js'
import { MobileDrawerBlock, mobileDrawerLayer } from '../src/mobile-drawer.js'
import { DialogResourcesLayer, DialogResourcesServerLayer } from '../src/dialog-resources.js'

const RootKey = Symbol('SourceStyleRendering')
const Root = Block.make('SourceStyleRendering', {
  key: RootKey,
  Model: Schema.Struct({ drawer: MobileDrawerBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof MobileDrawerBlock>['programRequirements']
  >(),
})
const Drawer = Root.makeRequiredFieldBinding(MobileDrawerBlock, {
  field: 'drawer',
  init: { contextToArgs: () => [{ id: 'source-style-drawer', defaultOpen: true }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(MobileDrawerBlock, {
    CloseRequested: Root.makeNoopStep,
    OpenChanged: Root.makeNoopStep,
  }),
})
const Composition = Root.makeComposition({ bindings: [Drawer] })
const init = Composition.makeInit(() => ({ model: {} }))
const update = Composition.makeUpdate({})
const view = Composition.makeView((model, h) => ({
  title: 'Source style rendering',
  body: h.div(
    [],
    [
      h.block(
        Drawer.embedView({
          slotId: 'drawer',
          model: model.drawer,
          viewInputs: {
            panelStyle: { width: '18rem' },
            panelClassName: 'p-0',
            animate: (node) => node,
            content: () => ['Navigation contents'],
          },
        }),
      ),
      BannerTitle(
        { children: ['Notice'], attributes: [h.Id('notice'), h.Style({ color: 'red' })] },
        h,
      ),
      BannerTitle(
        {
          children: ['Override'],
          attributes: [
            h.Id('override'),
            h.Style({ color: 'blue', fontVariationSettings: "'wght' 700, 'opsz' 25" }),
          ],
        },
        h,
      ),
      CardEyebrow(
        {
          children: ['Category'],
          attributes: [h.Id('category'), ...childAttributes([h.Style({ color: 'green' })])],
        },
        h,
      ),
    ],
  ),
}))
const layer = Root.makeLayer({ init, update, view }).pipe(Layer.provide(mobileDrawerLayer))

it.effect(
  'public parts merge caller CSS with source typography and preserve explicit overrides',
  () =>
    Effect.gen(function* () {
      const { html } = yield* renderToString(
        { block: Root, layer: layer.pipe(Layer.provide(DialogResourcesServerLayer)) },
        {},
        { isHydratable: false },
      )
      const container = document.createElement('div')
      container.innerHTML = html
      document.body.append(container)
      try {
        const style = (id: string) => {
          const element = container.querySelector(`#${id}`)
          if (!(element instanceof HTMLElement)) throw new Error(`Missing ${id}`)
          return getComputedStyle(element)
        }
        expect(style('notice').color).toBe('red')
        expect(style('notice').fontVariationSettings).toBe("'wght' 550, 'opsz' 18")
        expect(style('override').color).toBe('blue')
        expect(style('override').fontVariationSettings).toBe("'wght' 700, 'opsz' 25")
        expect(style('category').color).toBe('green')
        expect(style('category').fontVariationSettings).toBe("'wght' 550, 'opsz' 18")
      } finally {
        container.remove()
      }
    }),
)

it.live('drawer panel styling preserves native dialog attributes on the actual panel', () =>
  Effect.gen(function* () {
    const host = document.createElement('div')
    const container = document.createElement('div')
    container.id = 'source-style-drawer-regression'
    host.append(container)
    document.body.append(host)
    const program = Runtime.embed(
      Program.make({ block: Root, layer, container }).provide(DialogResourcesLayer(document)),
    )
    try {
      yield* Effect.promise(() =>
        vi.waitFor(() => {
          const drawer = document.querySelector('[data-mobile-drawer-panel]')
          if (!(drawer instanceof HTMLElement)) throw new Error('Missing mobile drawer panel')
          expect(drawer.style.width).toBe('18rem')
          expect(drawer.classList.contains('p-0')).toBe(true)
          expect(drawer.classList.contains('p-4')).toBe(false)
          expect(drawer.getAttribute('aria-labelledby')).toBe('source-style-drawer-dialog-title')
          expect(drawer.getAttribute('tabindex')).toBe('-1')
        }),
      )
    } finally {
      yield* Effect.promise(program.dispose)
      host.remove()
    }
  }),
)
