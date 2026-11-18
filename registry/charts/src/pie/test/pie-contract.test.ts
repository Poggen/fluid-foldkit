import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { DateTime, Effect, Layer, Option, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { PieChart } from '../root'

const Row = Schema.toCodecJson(
  Schema.Struct({
    label: Schema.String,
    value: Schema.Finite,
    recordedAt: Schema.DateFromString,
    note: Schema.Option(Schema.String),
  }),
)

const first = PieChart({ name: 'contract-pie-first', Row })
const second = PieChart({ name: 'contract-pie-second', Row })
export const FirstPieKey = Symbol('FirstPie')
export const SecondPieKey = Symbol('SecondPie')
const First = Block.make(first.namespace, { ...first.contract, key: FirstPieKey })
const Second = Block.make(second.namespace, { ...second.contract, key: SecondPieKey })
const layer = Layer.mergeAll(
  First.makeLayer(first.plans<typeof FirstPieKey>(First)),
  Second.makeLayer(second.plans<typeof SecondPieKey>(Second)),
)

it.effect(
  'independently declared Pie recipes retain row codecs and controlled requests without DOM',
  () =>
    Effect.gen(function* () {
      const recordedAt = DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2025, 0, 1)))
      const data = [
        Row.make({ label: 'Kept', value: 12, recordedAt, note: Option.some('metadata') }),
      ]
      const initial = yield* Story.story(
        { block: First, layer },
        Story.init('first-pie', data),
        Story.Command.expectNone(),
      )
      const modelJson = Schema.fromJsonString(Schema.toCodecJson(First.Model))
      const serialized = yield* Schema.encodeEffect(modelJson)(initial)
      const restored = yield* Schema.decodeEffect(modelJson)(serialized)
      expect(restored.data[0]?.recordedAt).toBeInstanceOf(Date)
      expect(restored.data[0]?.recordedAt.getTime()).toBe(Date.UTC(2025, 0, 1))
      expect(restored.data[0]?.note).toEqual(Option.some('metadata'))

      const changed = yield* Story.story(
        { block: First, layer },
        Story.given(restored),
        Story.inMessage(
          First.InMessage.RequestedControl({ controlled: true, index: Option.some(0) }),
        ),
        Story.message(First.Message.ObservedFocus({ index: null })),
        Story.inMessage(First.InMessage.RequestedData({ data: [] })),
      )
      expect(changed.focusedIndex).toEqual(Option.some(0))
      expect(changed.data).toEqual([])
      const serializedChanged = yield* Schema.encodeEffect(modelJson)(changed)
      const replayed = yield* Schema.decodeEffect(modelJson)(serializedChanged)
      expect(replayed).toEqual(changed)

      const other = yield* Story.story(
        { block: Second, layer },
        Story.init('second-pie', data),
        Story.inMessage(Second.InMessage.RequestedFocus({ index: 0 })),
      )
      expect(other.id).toBe('second-pie')
      expect(other.data).toEqual(data)
      expect(other.focusedIndex).toEqual(Option.some(0))
      expect(initial.focusedIndex).toEqual(Option.none())
    }),
)
