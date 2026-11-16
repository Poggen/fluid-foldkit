import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { defineMessageUnion } from 'foldkit/message'
import { Reveal, RevealSkeleton } from '../src/reveal.js'
const Model = Schema.Struct({ loaded: Schema.Boolean })
const Message = defineMessageUnion({ Noop: {} })
const FluidRevealServerDefinition = Block.makeDefinition('FluidRevealServer', { Model, Message })
const FluidRevealServerComposition = FluidRevealServerDefinition.makeComposition()
const init = FluidRevealServerComposition.makeInit(() => ({ model: { loaded: true } }))
const update = FluidRevealServerComposition.makeUpdate({
  Noop: FluidRevealServerDefinition.makeNoopStep(),
})
const view = FluidRevealServerComposition.makeView((model, h) => ({
  title: 'Reveal server content',
  body: Reveal(
    {
      preset: 'reveal-product',
      children: [
        Reveal(
          {
            swap: true,
            children: [
              RevealSkeleton({ className: 'pending' }, h),
              ...(model.loaded
                ? [
                    Reveal(
                      { items: true, children: [h.article([], ['Server-visible content'])] },
                      h,
                    ),
                  ]
                : []),
            ],
          },
          h,
        ),
      ],
    },
    h,
  ),
}))
const prepare = () => FluidRevealServerComposition.prepareBlock({ init, update, view })
const Example: Block.FromAssemblyWithView<typeof Model, typeof prepare> = Block.assemble(prepare)

test.effect(
  'Reveal server output contains authored classes, accessible content and skeleton composition without browser APIs',
  () =>
    Effect.gen(function* () {
      const rendered = yield* renderToString(Example, {}, { isHydratable: false })
      expect(rendered.html).toContain('class="reveal-product"')
      expect(rendered.html).toContain('class="reveal-swap"')
      expect(rendered.html).toContain('class="reveal-items"')
      expect(rendered.html).toContain('data-slot="skeleton"')
      expect(rendered.html).toContain('<article>Server-visible content</article>')
      expect(rendered.html).not.toContain('style="opacity')
    }),
)
