// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment node
import { it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { expect } from 'vitest'
import { createTargetMotionScope } from '../src/motion-target.js'

it.effect('can acquire the same motion layer across successive server renders', () => {
  const motion = createTargetMotionScope('server-rendered-tabs')
  return Effect.gen(function* () {
    expect(globalThis.document).toBeUndefined()
    yield* Effect.scoped(Layer.build(motion.layer))
    yield* Effect.scoped(Layer.build(motion.layer))
  })
})
