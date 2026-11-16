import { Effect, Layer } from 'effect'
import { OtlpSerialization, type OtlpTracer } from 'effect/observability'

const keep = (key: string) =>
  key === 'foldkit.model_revision' ||
  (/^(?:showcase\.|foldkit\.|browser\.)/u.test(key) &&
    !/model|payload|argument|text|value/iu.test(key))

// Native Command spans attach arguments. Remove payload attributes before network export.
export const metadataOnly = (data: OtlpTracer.TraceData): OtlpTracer.TraceData => ({
  ...data,
  resourceSpans: data.resourceSpans.map((resource) => ({
    ...resource,
    scopeSpans: resource.scopeSpans.map((scope) => ({
      ...scope,
      spans: scope.spans.map((span) => ({
        ...span,
        attributes: span.attributes.filter((attribute) => keep(attribute.key)),
        events: [],
        status: { code: span.status.code },
        links: span.links.map((link) => ({ ...link, attributes: [] })),
      })),
    })),
  })),
})

export const metadataSerialization = Layer.effect(
  OtlpSerialization.OtlpSerialization,
  Effect.gen(function* () {
    const base = yield* OtlpSerialization.OtlpSerialization
    return { ...base, traces: (data: OtlpTracer.TraceData) => base.traces(metadataOnly(data)) }
  }),
).pipe(Layer.provide(OtlpSerialization.layerJson))
