import { Effect, Schema } from 'effect'
import { Story } from 'foldkit'
import { it as effectIt } from '@effect/vitest'
import { expect, it } from 'vitest'
import {
  BarLoadingSkeletonBlock,
  BarLoadingSkeletonLayer,
  barLoadingSkeletonConfiguration,
} from '@foldkit-visuals/charts/bar-skeleton'
import { barSkeletonRects } from '../src/kit/loading/sweep-geometry'

const subject = { block: BarLoadingSkeletonBlock, layer: BarLoadingSkeletonLayer }

const configuration = barLoadingSkeletonConfiguration({ innerWidth: 100, innerHeight: 100 })

effectIt.effect(
  'advances only for a physical sweep observation and retains the seed through configuration changes',
  () =>
    Story.story(
      subject,
      Story.init('bars', configuration, false),
      Story.model((model) => expect(model.tick).toBe(0)),
      Story.message(BarLoadingSkeletonBlock.Message.ObservedSweepCycle()),
      Story.model((model) => expect(model.tick).toBe(1)),
      Story.inMessage(
        BarLoadingSkeletonBlock.InMessage.RequestedConfigure({
          configuration: barLoadingSkeletonConfiguration({ innerWidth: 0, innerHeight: 100 }),
        }),
      ),
      Story.model((model) => expect(model.tick).toBe(1)),
      Story.inMessage(BarLoadingSkeletonBlock.InMessage.RequestedConfigure({ configuration })),
      Story.model((model) => expect(model.tick).toBe(1)),
      Story.Command.expectNone(),
    ),
)

effectIt.effect(
  'preserves a previously observed sweep across a later preference change, as the Source stable callback does',
  () =>
    Story.story(
      subject,
      Story.init('queued-bars', configuration, false),
      Story.message(BarLoadingSkeletonBlock.Message.ObservedPreference({ reducedMotion: true })),
      Story.message(BarLoadingSkeletonBlock.Message.ObservedSweepCycle()),
      Story.model((model) => {
        expect(model.reducedMotion).toBe(true)
        expect(model.tick).toBe(1)
      }),
      Story.models(
        Story.steps(
          Story.message(
            BarLoadingSkeletonBlock.Message.ObservedPreference({ reducedMotion: true }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.Command.expectNone(),
    ),
)

it('keeps optional numeric inputs unchanged instead of clamping or coercing the Source geometry', () => {
  const unusual = barLoadingSkeletonConfiguration({
    innerWidth: Number.NaN,
    innerHeight: Number.POSITIVE_INFINITY,
    barFraction: -2,
    barCount: 2.5,
  })

  expect(Number.isNaN(unusual.innerWidth)).toBe(true)
  expect(unusual.innerHeight).toBe(Number.POSITIVE_INFINITY)
  expect(unusual.barFraction).toBe(-2)
  expect(unusual.barCount).toBe(2.5)
  expect(Object.hasOwn(configuration, 'barCount')).toBe(false)
})

it('uses the pinned Source height and slot geometry and does not replace empty counts with defaults', () => {
  expect(
    barSkeletonRects({ innerWidth: 100, innerHeight: 100, barCount: 1, barFraction: 1 }, 0),
  ).toEqual([{ key: '0.00-75', width: 100, height: 75, x: 0, y: 25 }])
  expect(barSkeletonRects({ innerWidth: 100, innerHeight: 100, barCount: 0 }, 0)).toEqual([])
  expect(barSkeletonRects({ innerWidth: 0, innerHeight: 100 }, 0)).toBeNull()
  expect(barSkeletonRects({ innerWidth: 100, innerHeight: -1 }, 0)).toBeNull()
})

effectIt.effect(
  'roundtrips the real standalone owner model and preserves its next sweep behavior',
  () =>
    Effect.gen(function* () {
      const active = yield* Story.story(
        subject,
        Story.init('serialized-bars', configuration, false),
        Story.message(BarLoadingSkeletonBlock.Message.ObservedSweepCycle()),
      )
      const codec = Schema.fromJsonString(Schema.toCodecJson(BarLoadingSkeletonBlock.Model))
      const encoded = yield* Schema.encodeEffect(codec)(active)
      const restored = yield* Schema.decodeEffect(codec)(encoded)
      expect(restored).toEqual(active)
      yield* Story.story(
        subject,
        Story.given(restored),
        Story.message(BarLoadingSkeletonBlock.Message.ObservedSweepCycle()),
        Story.model((model) => expect(model.tick).toBe(2)),
        Story.Command.expectNone(),
      )
    }),
)
