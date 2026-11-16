import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Option, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { LiveLineChart, LiveLine, LiveYAxis } from './index'
import { ResolveInput } from './lifecycle'
import { plannerRows } from './input'

const chart = LiveLineChart({ name: 'live-serialization' })
export const LiveContractKey = Symbol('live-serialization')
const LiveBlock = Block.make(chart.namespace, { ...chart.contract, key: LiveContractKey })
const subject = {
  block: LiveBlock,
  layer: LiveBlock.makeLayer(chart.plans<typeof LiveContractKey>(LiveBlock)),
}
const clock = (now: number) =>
  LiveBlock.Message.ObservedClock({
    timeOrigin: 1_000_000,
    now,
    wallNow: 102_000 + now,
    timelineNow: now,
    displayFrameMs: 1000 / 60,
  })

it.effect('preserves callback-configured active rolls through the actual Model JSON codec', () =>
  Effect.gen(function* () {
    const props = {
      data: [
        { time: 100, value: 40 },
        { time: 101, value: 50 },
        { time: 102, value: 60 },
      ],
      value: 60,
      children: [
        LiveLine({ dataKey: 'value', formatValue: (value: number) => `$${value}` }),
        LiveYAxis(),
      ],
    }
    const model = yield* Story.story(
      subject,
      Story.init('live', props.data, chart.configuration(props)),
      Story.Command.expectExact(ResolveInput({ id: 'live', generation: 1, data: props.data })),
      Story.Command.resolve(
        ResolveInput,
        LiveBlock.Message.CompletedInput({ generation: 1, identity: 'live/1', data: props.data }),
      ),
      Story.message(LiveBlock.Message.ObservedSize({ size: 400 })),
      Story.message(clock(100)),
      Story.message(clock(116)),
      Story.model((current) => expect(current.state.frame?.intro).toBe(true)),
    )
    const codec = Schema.toCodecJson(LiveBlock.Model)
    const encoded = yield* Schema.encodeEffect(codec)(model)
    const restored = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(codec))(
      JSON.stringify(encoded),
    )
    expect(restored).toEqual(model)
    const continued = yield* Story.story(subject, Story.given(model), Story.message(clock(164)))
    const resumed = yield* Story.story(subject, Story.given(restored), Story.message(clock(164)))
    expect(resumed).toEqual(continued)
  }),
)

it.effect(
  'keeps source identity in its scoped resolver and ignores previously completed stale input',
  () =>
    Effect.gen(function* () {
      const source = [{ time: 100, value: 1, price: 10, callback: () => 'outside Model' }]
      const replacement = [...source]
      const responses = yield* Effect.gen(function* () {
        const original = yield* ResolveInput({ id: 'identities', generation: 1, data: source })
          .effect
        const changed = yield* ResolveInput({ id: 'identities', generation: 2, data: replacement })
          .effect
        const restored = yield* ResolveInput({ id: 'identities', generation: 3, data: source })
          .effect
        expect(changed.identity).not.toBe(original.identity)
        expect(restored.identity).toBe(original.identity)
        expect(original.data).toEqual([{ time: 100, value: 1, price: 10 }])
        return { original, changed, restored }
      }).pipe(Effect.provide(ResolveInput.layer))
      const model = yield* Story.story(
        subject,
        Story.init(
          'identities',
          source,
          chart.configuration({
            data: source,
            value: 10,
            children: [LiveLine({ dataKey: 'price' })],
          }),
        ),
        Story.Command.expectExact(ResolveInput({ id: 'identities', generation: 1, data: source })),
        Story.Command.resolve(ResolveInput, responses.original),
        Story.inMessage(LiveBlock.InMessage.RequestedData({ data: replacement })),
        Story.Command.expectExact(
          ResolveInput({ id: 'identities', generation: 2, data: replacement }),
        ),
        Story.Command.resolve(ResolveInput, responses.changed),
        Story.model((current) =>
          expect(Option.getOrNull(current.dataIdentity)).toBe(responses.changed.identity),
        ),
        Story.inMessage(LiveBlock.InMessage.RequestedData({ data: source })),
        Story.Command.expectExact(ResolveInput({ id: 'identities', generation: 3, data: source })),
        Story.Command.resolve(ResolveInput, responses.restored),
        Story.models(Story.steps(Story.message(responses.changed)), (before, after) =>
          expect(after).toBe(before),
        ),
        Story.model((current) =>
          expect(Option.getOrNull(current.dataIdentity)).toBe(responses.original.identity),
        ),
        Story.Command.expectNone(),
      )
      const codec = Schema.toCodecJson(LiveBlock.Model)
      const restored = yield* Schema.decodeUnknownEffect(codec)(
        yield* Schema.encodeEffect(codec)(model),
      )
      expect(restored.dataIdentity).toEqual(model.dataIdentity)
      yield* Story.story(
        subject,
        Story.given(restored),
        Story.models(
          Story.steps(Story.message(LiveBlock.Message.CompletedMount())),
          (before, after) => expect(after).toBe(before),
        ),
      )
    }),
)

it.effect('preserves non-finite sample fallback through actual JSON encoding', () =>
  Effect.gen(function* () {
    const data = [
      { time: 100, value: 40, alternate: Number.NaN },
      { time: 101, value: Number.NaN, alternate: Number.POSITIVE_INFINITY },
      { time: 102, value: Number.NEGATIVE_INFINITY, alternate: 60 },
    ]
    const model = yield* Story.story(
      subject,
      Story.init(
        'live',
        data,
        chart.configuration({ data, value: 40, children: [LiveLine({ dataKey: 'value' })] }),
      ),
      Story.Command.expectExact(ResolveInput({ id: 'live', generation: 1, data })),
      Story.Command.resolve(
        ResolveInput,
        LiveBlock.Message.CompletedInput({
          generation: 1,
          identity: 'live/1',
          data: plannerRows(data),
        }),
      ),
    )
    const codec = Schema.toCodecJson(LiveBlock.Model)
    const restored = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(codec))(
      JSON.stringify(yield* Schema.encodeEffect(codec)(model)),
    )
    expect(restored).toEqual(model)
    const continued = yield* Story.story(subject, Story.given(model), Story.message(clock(100)))
    const resumed = yield* Story.story(subject, Story.given(restored), Story.message(clock(100)))
    expect(resumed).toEqual(continued)
  }),
)
