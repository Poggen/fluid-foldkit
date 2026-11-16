import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { defineMessageUnion } from 'foldkit/message'
import {
  BannerBlock,
  layer as BannerLayer,
  BannerTitle,
  BannerDescription,
  BannerActions,
  createBannerMotionScope,
} from '../src/banner.js'
import { Button } from '../src/button.js'
import { defaultIcons } from '../src/icons.js'
import { tablerIcons } from '../src/icons-tabler.js'
import { createPresentationContext } from '../src/presentation.js'
import { useIcons } from '../src/presentation-context.js'

const Model = Schema.Struct({ inherited: BannerBlock.Model, explicit: BannerBlock.Model })

const Message = defineMessageUnion({ Noop: {} })

const PresentationBannerKey = Symbol('PresentationBanner')

const effects = Block.makeEffectsContract()

const PresentationBannerBlock = Block.make('PresentationBanner', {
  key: PresentationBannerKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Document' },
})

const Inherited = PresentationBannerBlock.makeRequiredFieldBinding(BannerBlock, {
  field: 'inherited',
  init: { contextToArgs: () => [{ id: 'inherited-banner', reduceMotion: false }] },
}).withOutMessagePolicy({
  fold: PresentationBannerBlock.makeOutMessageFold(BannerBlock, {
    Dismissed: PresentationBannerBlock.makeNoopStep,
    Exited: PresentationBannerBlock.makeNoopStep,
  }),
})

const Explicit = PresentationBannerBlock.makeRequiredFieldBinding(BannerBlock, {
  field: 'explicit',
  init: { contextToArgs: () => [{ id: 'explicit-banner', reduceMotion: false }] },
}).withOutMessagePolicy({
  fold: PresentationBannerBlock.makeOutMessageFold(BannerBlock, {
    Dismissed: PresentationBannerBlock.makeNoopStep,
    Exited: PresentationBannerBlock.makeNoopStep,
  }),
})

const PresentationBannerComposition = PresentationBannerBlock.makeComposition({
  bindings: [Inherited, Explicit],
})

const init = PresentationBannerComposition.makeInit(() => ({ model: {} }))

const update = PresentationBannerComposition.makeUpdate({
  Noop: PresentationBannerBlock.makeNoopStep(),
})

const context = createPresentationContext({ shape: 'pill', size: 'compact', icons: tablerIcons })

const motion = createBannerMotionScope()

const view = PresentationBannerComposition.makeView((model, h) => ({
  title: 'Banner presentation',
  body: h.main(
    [],
    [
      h.section(
        [h.Id('case-inherited')],
        [
          h.block(
            Inherited.embedView({
              slotId: model.inherited.id,
              model: model.inherited,
              viewInputs: {
                context,
                animate: motion.node,
                dismissible: true,
                children: (child) => [
                  BannerTitle(
                    {
                      ...child,
                      children: ['Inherited'],
                    },
                    h,
                  ),
                  BannerDescription(
                    {
                      ...child,
                      children: ['Description'],
                    },
                    h,
                  ),
                  BannerActions(
                    {
                      ...child,
                      children: ['Actions'],
                    },
                    h,
                  ),
                  Button(
                    {
                      ...child,
                      leadingIcon: useIcons(child.context).mail,
                      children: ['Nested action'],
                    },
                    h,
                  ),
                ],
              },
            }),
          ),
        ],
      ),
      h.section(
        [h.Id('case-explicit')],
        [
          h.block(
            Explicit.embedView({
              slotId: model.explicit.id,
              model: model.explicit,
              viewInputs: {
                context,
                animate: motion.node,
                dismissible: true,
                getIcons: () => ({ x: defaultIcons.check }),
                children: (child) => [BannerTitle({ ...child, children: ['Explicit reset'] }, h)],
              },
            }),
          ),
        ],
      ),
    ],
  ),
}))

const layer = PresentationBannerBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(BannerLayer),
)

test.effect(
  'Banner inherits icon roles and propagates context while an explicit partial icon map resets missing roles',
  () =>
    Effect.gen(function* bannerPresentation() {
      const { html } = yield* renderToString(
        { block: PresentationBannerBlock, layer },
        {},
        { isHydratable: false },
      )

      const inherited =
        /id="case-inherited"(?<section>[\s\S]*?)<\/section>/u.exec(html)?.groups?.section ?? ''

      const explicit =
        /id="case-explicit"(?<section>[\s\S]*?)<\/section>/u.exec(html)?.groups?.section ?? ''

      expect(inherited).toContain('tabler-icon-info-circle')
      expect(inherited).toContain('tabler-icon-x')
      expect(inherited).toContain('tabler-icon-mail')
      expect(inherited).toContain('rounded-[20px]')
      expect(inherited).toContain('h-7')
      expect(inherited).toContain('text-[length:var(--fs-subtitle-compact,13px)]')
      expect(inherited).toContain('-my-[5px]')
      expect(explicit).toContain('lucide-info')
      expect(explicit).toContain('lucide-check')
      expect(explicit).not.toContain('tabler-icon-info-circle')
    }),
)
