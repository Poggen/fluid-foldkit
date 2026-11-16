import { Context, Effect, Layer } from 'effect'
import { SecureRandom } from 'effect/crypto'
import type { HoverDriver } from './hover-driver.js'

interface HoverResources {
  readonly drivers: Map<string, HoverDriver>
  readonly scopeKey: (element: Element) => string
}

export class HoverDrivers extends Context.Service<HoverDrivers, HoverResources>()(
  '@foldkit-visuals/fluid/HoverDrivers',
) {}

export const HoverDriversLayer = Layer.effect(
  HoverDrivers,
  Effect.gen(function* () {
    const random = yield* SecureRandom.SecureRandom
    const prefix = yield* random.uuidV4()
    const scopes = new WeakMap<Element, string>()
    let nextScope = 0

    return yield* Effect.acquireRelease(
      Effect.sync(() => ({
        drivers: new Map<string, HoverDriver>(),
        scopeKey: (element: Element) => {
          const previous = scopes.get(element)

          if (previous !== undefined) {
            return previous
          }

          nextScope += 1
          const key = `${prefix}:${nextScope}`
          scopes.set(element, key)

          return key
        },
      })),
      ({ drivers }) =>
        Effect.sync(() => {
          for (const driver of drivers.values()) {
            driver.dispose()
          }

          drivers.clear()
        }),
    )
  }),
).pipe(Layer.provide(SecureRandom.layerWebCrypto))
