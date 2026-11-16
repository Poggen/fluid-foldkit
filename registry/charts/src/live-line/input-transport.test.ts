import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

it.effect(
  'passes owned command inputs by reference while the captured Layer emits only dataset identities',
  () =>
    Effect.gen(function* () {
      const Message = defineMessageUnion({
        Resolved: { generation: Schema.Int, identity: Schema.Int },
      })

      const Definition = Block.makeNamespace('LiveInputTransportProof')

      const Resolve = Definition.makeCommand('Resolve', {
        args: { generation: Schema.Int, data: Schema.Array(Schema.Unknown) },
        messages: [Message.Resolved],
        *handler() {
          const identities = yield* Effect.sync(() => new WeakMap<ReadonlyArray<unknown>, number>())

          return ({ generation, data }) =>
            Effect.sync(() => {
              const identity = identities.get(data) ?? generation
              identities.set(data, identity)

              return Message.Resolved({ generation, identity })
            })
        },
      })

      const original = [{ time: 1, value: 2, callback: () => 'preserved capability' }]
      const equalButNew = [...original]
      const command = Resolve({ generation: 1, data: original })
      expect(command.args?.data).toBe(original)

      const results = yield* Effect.gen(function* () {
        const initial = yield* command.effect
        const replacement = yield* Resolve({ generation: 2, data: equalButNew }).effect
        const restore = yield* Resolve({ generation: 3, data: original }).effect

        return [initial, replacement, restore]
      }).pipe(Effect.provide(Resolve.layer))

      expect(results.map((result) => result.identity)).toEqual([1, 2, 1])
      expect(results.map((result) => result.generation)).toEqual([1, 2, 3])
      const codec = Schema.toCodecJson(Message)
      expect(results.map((result) => Schema.encodeSync(codec)(result))).toEqual(results)
    }),
)
