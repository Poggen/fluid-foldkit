import { Effect, FileSystem, Path, Schema, Semaphore } from 'effect'

const record = Schema.is(Schema.Record(Schema.String, Schema.Unknown))
const retainedKey = (key: string) =>
  /^(?:showcase\.|foldkit\.|browser\.|service\.|telemetry\.)/u.test(key) ||
  ['http.request.method', 'http.route', 'duration_ms', 'route'].includes(key)
const safeKey = (key: string) =>
  key === 'foldkit.model_revision' ||
  (retainedKey(key) && !/model|payload|argument|input|text|value/iu.test(key))

// Collector-side defense also covers automatically attached Command arguments.
const sanitize = (value: unknown, raw = false): unknown => {
  if (raw) return value
  if (Array.isArray(value)) return value.map((item) => sanitize(item))
  if (!record(value)) return value
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      if (key === 'events' || key === 'message') return []
      if (key === 'attributes') {
        if (!Array.isArray(item)) return [[key, []]]
        const attributes = item.filter(
          (attribute) =>
            record(attribute) &&
            typeof attribute.key === 'string' &&
            safeKey(attribute.key) &&
            record(attribute.value) &&
            Object.entries(attribute.value).every(
              ([kind, scalar]) =>
                ['stringValue', 'intValue', 'doubleValue', 'boolValue'].includes(kind) &&
                (typeof scalar === 'number' ||
                  typeof scalar === 'boolean' ||
                  (typeof scalar === 'string' && scalar.length <= 200)),
            ),
        )
        return [[key, attributes]]
      }
      return [[key, sanitize(item)]]
    }),
  )
}

export const makeDiagnosticCollector = (options: {
  readonly output: string
  readonly maxBatches: number
  readonly maxBytes: number
  readonly raw: boolean
}) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    yield* fs.makeDirectory(options.output, { recursive: true })
    const lock = yield* Semaphore.make(1)
    let sequence = 0
    const batches: Array<{ sequence: number; filename: string; data: unknown }> = []
    const accept = (request: Request) =>
      Effect.gen(function* () {
        const text = yield* Effect.tryPromise(() => request.text())
        if (text.length > options.maxBytes) return new Response('Batch too large', { status: 413 })
        const decoded = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(
          text,
        )
        if (!record(decoded) || !Array.isArray(decoded.resourceSpans))
          return new Response('Expected an OTLP JSON trace batch', { status: 400 })
        const data = sanitize(decoded, options.raw)
        const current = ++sequence
        const filename = `batch-${String((current - 1) % options.maxBatches).padStart(4, '0')}.json`
        yield* fs.writeFileString(path.join(options.output, filename), JSON.stringify(data))
        batches.push({ sequence: current, filename, data })
        if (batches.length > options.maxBatches) batches.shift()
        return Response.json({})
      }).pipe((effect) => lock.withPermit(effect))
    return {
      accept,
      snapshot: () => ({
        totalBatches: sequence,
        retainedBatches: batches.length,
        sanitized: !options.raw,
        batches,
      }),
    }
  })
