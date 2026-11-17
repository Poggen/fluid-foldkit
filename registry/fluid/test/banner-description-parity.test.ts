import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { renderToString } from 'foldkit/experimental/server'
import {
  BannerBlock,
  BannerTitle,
  BannerDescription,
  BannerActions,
  BannerAction,
  layer as BannerLayer,
} from '../src/banner.js'

const RootKey = Symbol('BannerDescriptionParity')
const effects = Block.makeEffectsContract()
const Root = Block.make('BannerDescriptionParity', {
  key: RootKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ banner: BannerBlock.Model }),
  Message: defineMessageUnion({ Noop: {} }),
  effects,
  view: { kind: 'Document' },
})
const Banner = Root.makeRequiredFieldBinding(BannerBlock, {
  field: 'banner',
  init: { contextToArgs: () => [{ id: 'description-banner', reduceMotion: true }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(BannerBlock, {
    Dismissed: Root.makeNoopStep,
    Exited: Root.makeNoopStep,
  }),
})
const composition = Root.makeComposition({ bindings: [Banner] })
const init = composition.makeInit(() => ({ model: {} }))
const update = composition.makeUpdate({ Noop: Root.makeNoopStep() })
for (const description of ['direct', 'nested', 'none'] as const) {
  const view = composition.makeView((model, h) => ({
    title: 'Banner description parity',
    body: h.block(
      Banner.embedView({
        slotId: 'banner',
        model: model.banner,
        viewInputs: {
          animate: (node) => node,
          children: (context) => [
            BannerTitle({ ...context, children: ['Notice'] }, h),
            description === 'none'
              ? null
              : description === 'direct'
                ? BannerDescription({ ...context, children: ['Details'] }, h)
                : h.div([], [BannerDescription({ ...context, children: ['Details'] }, h)]),
            BannerActions(
              { ...context, children: [BannerAction({ ...context, children: ['Continue'] }, h)] },
              h,
            ),
          ],
        },
      }),
    ),
  }))
  const layer = Root.makeLayer({ init, update, view }).pipe(Layer.provide(BannerLayer))
  it.effect(
    `Banner ${description} description uses the original direct-child layout contract`,
    () =>
      Effect.gen(function* () {
        const { html } = yield* renderToString({ block: Root, layer }, {}, { isHydratable: false })
        const body = /<div[^>]*data-slot="banner"[^>]*>/u.exec(html)?.[0]
        expect(body).toBeDefined()
        expect(body?.includes('data-described=""')).toBe(description === 'direct')
        expect(body).toContain('data-described:items-start')
        expect(html).toContain('group-data-described/banner:col-start-2')
        expect(html).not.toContain('has-data-[slot=banner-description]')
      }),
  )
}
