import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { Server } from 'foldkit/experimental'
import { expect } from 'vitest'
import { fluidPages } from '../../../lib/catalogue'
import { motion, target } from '../motion'
import { defaults, resolveSettings } from '../settings'
import { previewAdmitted, previewBody, previewCard } from './card'

const key = Symbol('GallerySourceFlow87')
const Flags = Schema.Struct({ ready: Schema.Boolean, admitted: Schema.Boolean })
const SourceFlowBlock = Block.make('GallerySourceFlow87', {
  key,
  InitArgs: Schema.Tuple([Flags]),
  Model: Flags,
  Message: Schema.Never,
  isMessageFree: true,
  view: { kind: 'Document' },
})
const composition = SourceFlowBlock.makeComposition({ bindings: [] })
const layer = SourceFlowBlock.makeLayer({
  init: composition.makeInit((flags) => ({ model: flags })),
  update: composition.makeUpdate({}),
  view: composition.makeView((model, h) => {
    const page = fluidPages[0]
    if (page === undefined) throw new Error('Expected gallery page')
    const inputs = { ready: model.ready, admitted: model.admitted ? [page.href] : [] }
    return {
      title: 'Gallery source flow',
      body: previewCard(
        page,
        resolveSettings(defaults),
        previewBody(page, inputs, () => h.button([], ['Live preview']), h),
        h,
        !previewAdmitted(page, inputs),
      ),
    }
  }),
})

it.effect('helper output keeps pre-ready and lazy stages empty and admitted markup intrinsic', () =>
  Effect.gen(function* () {
    for (const flags of [
      { ready: false, admitted: true },
      { ready: true, admitted: false },
      { ready: true, admitted: true },
    ]) {
      const rendered = yield* Server.renderToString(
        { block: SourceFlowBlock, layer },
        { Flags },
        { flags, isHydratable: false },
      )
      const document = new DOMParser().parseFromString(rendered.html, 'text/html')
      const card = document.querySelector('.showcase-card')
      expect(card).not.toBeNull()
      if (card === null) throw new Error('Expected preview card')
      const admitted = flags.ready && flags.admitted
      expect(card.getAttribute('data-deferred')).toBe(String(!admitted))
      expect(card.getAttribute('style') ?? '').not.toMatch(/(?:^|;)\s*height\s*:/)
      const content = card.querySelector('.preview-content')
      expect(content).not.toBeNull()
      if (content === null) throw new Error('Expected preview stage')
      if (admitted) {
        expect(content.children).toHaveLength(1)
        expect(content.querySelector('button')?.textContent).toBe('Live preview')
      } else {
        expect(content.children).toHaveLength(0)
        expect(content.textContent).toBe('')
      }
    }
  }).pipe(Effect.provide(Layer.mergeAll(motion.layer, target.layer))),
)
