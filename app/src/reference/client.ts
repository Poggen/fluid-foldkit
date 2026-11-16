import { Effect, Layer, Schema } from 'effect'
import { FetchHttpClient, HttpClient } from 'effect/http'
import { ReferenceClient, ReferenceData, ReferenceUnavailable } from './data'
export const ReferenceClientLayer = Layer.effect(
  ReferenceClient,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    return ReferenceClient.of({
      load: (family, slug) =>
        Effect.gen(function* () {
          const response = yield* client.get(
            `/reference/${encodeURIComponent(family)}/${encodeURIComponent(slug)}.json`,
          )
          if (response.status !== 200)
            return yield* Effect.fail(
              new ReferenceUnavailable({
                message: `Reference request failed (${response.status})`,
              }),
            )
          const body = yield* response.json
          return yield* Schema.decodeUnknownEffect(ReferenceData)(body)
        }).pipe(
          Effect.mapError(
            () =>
              new ReferenceUnavailable({
                message: 'Component reference could not be loaded. Please retry.',
              }),
          ),
        ),
    })
  }),
).pipe(
  Layer.provide(
    FetchHttpClient.layer.pipe(
      Layer.provide(Layer.succeed(FetchHttpClient.RequestInit, { cache: 'no-cache' })),
    ),
  ),
)
