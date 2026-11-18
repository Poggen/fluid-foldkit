import { Effect, Schema } from 'effect'
import { Server } from 'foldkit/experimental'
import { Story } from 'foldkit'
import { BarLoadingSkeletonBlock } from '@foldkit-visuals/charts/bar-skeleton'
import { it as effectIt } from '@effect/vitest'
import { expect } from 'vitest'
import {
  PublicBarSkeletonHostBlock,
  PublicBarSkeletonHostLayer,
  SkeletonBinding,
} from '../../../../examples/src/bar-skeleton-public'

effectIt.effect(
  'routes a genuine child Message through the registered standalone Binding without a parent tick mirror',
  () =>
    Story.story(
      { block: PublicBarSkeletonHostBlock, layer: PublicBarSkeletonHostLayer },
      Story.init(false),
      Story.messageIn(SkeletonBinding, BarLoadingSkeletonBlock.Message.ObservedSweepCycle()),
      Story.model((model) => {
        expect(model.skeleton.tick).toBe(1)
        expect(Object.keys(model)).toEqual(['skeleton'])
      }),
    ),
)

effectIt.effect(
  'renders one caller-owned SVG with either the Source mask or the reduced-motion bars',
  () =>
    Effect.gen(function* standaloneSkeletonInitialPaint() {
      const animated = yield* Server.renderToString(
        { block: PublicBarSkeletonHostBlock, layer: PublicBarSkeletonHostLayer },
        { Flags: Schema.Boolean },
        {
          flags: false,
          isHydratable: false,
        },
      )

      const reduced = yield* Server.renderToString(
        { block: PublicBarSkeletonHostBlock, layer: PublicBarSkeletonHostLayer },
        { Flags: Schema.Boolean },
        {
          flags: true,
          isHydratable: false,
        },
      )

      expect(animated.html.match(/<svg\b/gu)).toHaveLength(1)
      expect(reduced.html.match(/<svg\b/gu)).toHaveLength(1)
      expect(animated.html.match(/<rect\b/gu)).toHaveLength(13)
      expect(reduced.html.match(/<rect\b/gu)).toHaveLength(12)
      expect(animated.html).toContain('bar-sweep-standalone-bars-mask')
      expect(animated.html).toContain('--bkm-sweep-duration:2s')
      expect(reduced.html).not.toContain('bar-sweep-standalone-bars-mask')
      expect(reduced.html).toContain('var(--bkm-foreground)')
      expect(reduced.html).toContain('fill-opacity="0.45"')
      expect(reduced.html).toContain('rx="2"')
    }),
)
