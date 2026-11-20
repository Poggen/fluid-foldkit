import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Window } from 'happy-dom'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { defineMessageUnion } from 'foldkit/message'
import { Config, Environment, LightboxBlock, layer as LightboxLayer } from '../src/index.js'

const Key = Symbol('InitialGalleryServer')
const Parent = Block.make('InitialGalleryServer', {
  key: Key,
  Model: Schema.Struct({ gallery: LightboxBlock.Model }),
  effects: Block.makeEffectsContract<never, Environment>(),
  Message: defineMessageUnion({ Noop: {} }),
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
const Gallery = Parent.makeRequiredFieldBinding(LightboxBlock, {
  field: 'gallery',
  init: {
    contextToArgs: () =>
      [
        {
          id: 'server-gallery',
          items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
          defaultOpen: true,
          defaultValue: 2,
          options: { dir: 'rtl', preload: 1 },
        },
      ] satisfies [Config],
  },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(LightboxBlock, {
    Changed: Parent.makeNoopStep,
    OpenChanged: Parent.makeNoopStep,
    ValueChanged: Parent.makeNoopStep,
    OpenChangeCompleted: Parent.makeNoopStep,
    ZoomChanged: Parent.makeNoopStep,
    Failed: Parent.makeNoopStep,
  }),
})
const Composition = Parent.makeComposition({ bindings: [Gallery] })
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({ Noop: Parent.makeNoopStep() }),
  view: Composition.makeView((model, h) => ({
    title: 'Initial gallery',
    body: h.block(
      Gallery.embedView({
        slotId: 'gallery',
        model: model.gallery,
        viewInputs: {
          label: 'Gallery',
          carouselLabel: 'Three items',
          item: (index) => h.p([], [`Item ${index}`]),
        },
      }),
    ),
  })),
}).pipe(Layer.provide(LightboxLayer))

it.effect(
  'server render carries the actual initial index, count, inert panels, morph target and RTL shift',
  () =>
    Effect.gen(function* () {
      const result = yield* renderToString({ block: Parent, layer }, {}, { isHydratable: false })
      const window = new Window()
      const root = window.document.createElement('div')
      root.innerHTML = result.html
      expect(root.querySelector('dialog')?.hasAttribute('open')).toBe(true)
      expect(root.querySelector('[data-ramka-counter]')?.textContent).toBe('3 / 3')
      expect(root.querySelector('[data-ramka-item][data-active]')?.getAttribute('data-index')).toBe(
        '2',
      )
      expect(root.querySelector('[data-ssr-active]')?.getAttribute('data-index')).toBe('2')
      const slides = root.querySelector('[data-ssr-shift]')
      if (!(slides instanceof window.HTMLElement)) throw new Error('SSR shifted scrollport missing')
      expect(slides.style.getPropertyValue('--lightbox-ssr-index').trim()).toBe('2')
      expect(slides.style.getPropertyValue('--lightbox-ssr-shift-sign').trim()).toBe('1')
      expect(root.querySelectorAll('[data-ramka-slide]')).toHaveLength(3)
      expect(
        root.querySelector('[data-ramka-item]:not([data-active])')?.hasAttribute('inert'),
      ).toBe(true)
      expect(root.querySelector('[data-ramka-item][data-active]')?.getAttribute('role')).toBe(
        'tabpanel',
      )
      expect(
        root.querySelector('#server-gallery-trigger-2')?.hasAttribute('data-morph-target'),
      ).toBe(true)
      expect(root.querySelectorAll('[aria-expanded="true"]')).toHaveLength(0)
      yield* Effect.promise(() => window.happyDOM.abort())
    }),
)
