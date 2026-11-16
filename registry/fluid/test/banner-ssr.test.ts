import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { defineMessageUnion } from 'foldkit/message'
import {
  BannerBlock,
  BannerTitle,
  createBannerMotionScope,
  layer as BannerLayer,
} from '../src/banner.js'

const Model = Schema.Struct({ banner: BannerBlock.Model })

const Message = defineMessageUnion({ Noop: {} })

const FluidBannerServerKey = Symbol('FluidBannerServer')

const FluidBannerServerEffects = Block.makeEffectsContract()

const FluidBannerServerBlock = Block.make('FluidBannerServer', {
  key: FluidBannerServerKey,
  InitArgs: Schema.Tuple([]),
  effects: FluidBannerServerEffects,
  view: { kind: 'Document' },
  Model,
  Message,
})

const Banner = FluidBannerServerBlock.makeRequiredFieldBinding(BannerBlock, {
  field: 'banner',
  init: { contextToArgs: () => [{ id: 'server-banner', reduceMotion: false }] },
}).withOutMessagePolicy({
  fold: FluidBannerServerBlock.makeOutMessageFold(BannerBlock, {
    Dismissed: FluidBannerServerBlock.makeNoopStep,
    Exited: FluidBannerServerBlock.makeNoopStep,
  }),
})

const FluidBannerServerComposition = FluidBannerServerBlock.makeComposition({
  bindings: [Banner],
})

const motion = createBannerMotionScope()

const init = FluidBannerServerComposition.makeInit(() => ({ model: {} }))

const update = FluidBannerServerComposition.makeUpdate({
  Noop: FluidBannerServerBlock.makeNoopStep(),
})

const view = FluidBannerServerComposition.makeView((model, h) => ({
  title: 'Banner server content',
  body: h.block(
    Banner.embedView({
      slotId: model.banner.id,
      model: model.banner,
      viewInputs: {
        animate: motion.node,
        style: { width: '520px', padding: '12px', opacity: '0.8', '--banner-custom-value': '12' },
        children: (context) => [
          BannerTitle({ ...context, children: ['Server-visible notice'] }, h),
        ],
      },
    }),
  ),
}))

const layer = FluidBannerServerBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(BannerLayer),
)

test.effect(
  'initially open Banner server rendering needs no browser or acquired animation resources',
  () =>
    Effect.gen(function* renderInitialBanner() {
      const rendered = yield* renderToString(
        { block: FluidBannerServerBlock, layer },
        {},
        { isHydratable: false },
      )

      expect(rendered.html).toContain('data-slot="banner"')
      expect(rendered.html).toContain('role="status"')
      expect(rendered.html).toMatch(/grid-template-rows:\s*1fr/u)
      expect(rendered.html).toMatch(/opacity:\s*1/u)
      expect(rendered.html).toContain('Server-visible notice')
      expect(rendered.html).toMatch(/width:\s*520px/u)
      expect(rendered.html).toMatch(/padding:\s*12px/u)
      expect(rendered.html).toMatch(/opacity:\s*0.8/u)
      expect(rendered.html).toMatch(/--banner-custom-value:\s*12/u)
    }),
)

const FluidBannerShellKey = Symbol('FluidBannerShell')

const FluidBannerShellEffects = Block.makeEffectsContract()

const FluidBannerShellBlock = Block.make('FluidBannerShell', {
  key: FluidBannerShellKey,
  InitArgs: Schema.Tuple([]),
  effects: FluidBannerShellEffects,
  view: { kind: 'Element' },
  Model,
  Message,
})

const NestedBanner = FluidBannerShellBlock.makeRequiredFieldBinding(BannerBlock, {
  field: 'banner',
  init: { contextToArgs: () => [{ id: 'nested-banner', open: true, reduceMotion: false }] },
}).withOutMessagePolicy({
  fold: FluidBannerShellBlock.makeOutMessageFold(BannerBlock, {
    Dismissed: FluidBannerShellBlock.makeNoopStep,
    Exited: FluidBannerShellBlock.makeNoopStep,
  }),
})

const FluidBannerShellComposition = FluidBannerShellBlock.makeComposition({
  bindings: [NestedBanner],
})

const shellInit = FluidBannerShellComposition.makeInit(() => ({ model: {} }))

const shellUpdate = FluidBannerShellComposition.makeUpdate({
  Noop: FluidBannerShellBlock.makeNoopStep(),
})

const shellView = FluidBannerShellComposition.makeView((model, h) =>
  h.section(
    [h.DataAttribute('shell', 'nested')],
    [
      h.block(
        NestedBanner.embedView({
          slotId: model.banner.id,
          model: model.banner,
          viewInputs: {
            animate: motion.node,
            children: (context) => [
              BannerTitle({ ...context, children: ['Nested controlled notice'] }, h),
            ],
          },
        }),
      ),
    ],
  ),
)

const shellLayer = FluidBannerShellBlock.makeLayer({
  init: shellInit,
  update: shellUpdate,
  view: shellView,
}).pipe(Layer.provide(BannerLayer))

const RootModel = Schema.Struct({ shell: FluidBannerShellBlock.Model })

const FluidBannerNestedServerKey = Symbol('FluidBannerNestedServer')

const FluidBannerNestedServerEffects = Block.makeEffectsContract()

const FluidBannerNestedServerBlock = Block.make('FluidBannerNestedServer', {
  key: FluidBannerNestedServerKey,
  InitArgs: Schema.Tuple([]),
  effects: FluidBannerNestedServerEffects,
  view: { kind: 'Document' },
  Model: RootModel,
  Message,
})

const NestedShell = FluidBannerNestedServerBlock.makeRequiredFieldBinding(FluidBannerShellBlock, {
  field: 'shell',
  init: { contextToArgs: () => [] },
})

const FluidBannerNestedServerComposition = FluidBannerNestedServerBlock.makeComposition({
  bindings: [NestedShell],
})

const nestedInit = FluidBannerNestedServerComposition.makeInit(() => ({ model: {} }))

const nestedUpdate = FluidBannerNestedServerComposition.makeUpdate({
  Noop: FluidBannerNestedServerBlock.makeNoopStep(),
})

const nestedView = FluidBannerNestedServerComposition.makeView((model, h) => ({
  title: 'Nested Banner',
  body: h.main([], [h.block(NestedShell.embedView({ slotId: 'shell', model: model.shell }))]),
}))

const nestedLayer = FluidBannerNestedServerBlock.makeLayer({
  init: nestedInit,
  update: nestedUpdate,
  view: nestedView,
}).pipe(Layer.provide(shellLayer))

test.effect(
  'controlled Banner server rendering survives two registered parent boundaries without engine acquisition',
  () =>
    Effect.gen(function* renderNestedBanner() {
      const rendered = yield* renderToString(
        { block: FluidBannerNestedServerBlock, layer: nestedLayer },
        {},
        { isHydratable: false },
      )

      expect(rendered.html).toContain('<main><section data-shell="nested">')
      expect(rendered.html).toContain('Nested controlled notice')
      expect(rendered.html).toContain('id="nested-banner"')
    }),
)
