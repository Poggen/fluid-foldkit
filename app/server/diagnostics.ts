import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Config, Effect, FiberSet, Layer, Option, Path } from 'effect'
import { FetchHttpClient, Headers, HttpTraceContext } from 'effect/http'
import { OtlpExporter, OtlpSerialization, OtlpTracer } from 'effect/observability'
import { Server } from 'foldkit/experimental'
import { renderPageEffect } from '../src/entry.server'
import { initialThemeScript } from '../src/theme'
import { readDiagnosticArtifacts } from './diagnostic-artifacts'
import { makeDiagnosticCollector } from './diagnostic-collector'

const respondToError = Effect.catchCause(() =>
  Effect.succeed(new Response('Diagnostic request failed', { status: 500 })),
)
const isLoopbackRequest = (request: Request) =>
  ['127.0.0.1', 'localhost'].includes(new URL(request.url).hostname)

const program = Effect.gen(function* () {
  const config = yield* Config.all({
    sitePort: Config.Port('DIAGNOSTICS_PORT').pipe(Config.withDefault(5490)),
    collectorPort: Config.Port('DIAGNOSTICS_COLLECTOR_PORT').pipe(Config.withDefault(5491)),
    output: Config.String('DIAGNOSTICS_OUTPUT'),
    directory: Config.String('DIAGNOSTICS_DIST').pipe(
      Config.withDefault(`${import.meta.dir}/../dist`),
    ),
    maxBatches: Config.Int('DIAGNOSTICS_MAX_BATCHES').pipe(Config.withDefault(32)),
    maxBytes: Config.Int('DIAGNOSTICS_MAX_BATCH_BYTES').pipe(Config.withDefault(524288)),
    raw: Config.Boolean('DIAGNOSTICS_RAW_ATTRIBUTES').pipe(Config.withDefault(false)),
  })
  if (
    config.maxBatches < 1 ||
    config.maxBatches > 256 ||
    config.maxBytes < 1024 ||
    config.maxBytes > 2097152 ||
    config.sitePort === config.collectorPort
  )
    return yield* Effect.fail(new Error('Invalid diagnostic port or capture bounds'))
  const path = yield* Path.Path
  const artifacts = yield* readDiagnosticArtifacts(config.directory)
  const collector = yield* makeDiagnosticCollector(config)
  const runCollector = yield* FiberSet.makeRuntimePromise()
  const allowedOrigins = [
    `http://127.0.0.1:${config.sitePort}`,
    `http://localhost:${config.sitePort}`,
  ]
  const collect = (request: Request) =>
    Effect.gen(function* () {
      if (!isLoopbackRequest(request)) return new Response('Local requests only', { status: 403 })
      const origin = request.headers.get('origin')
      if (origin !== null && !allowedOrigins.includes(origin))
        return new Response('Origin refused', { status: 403 })
      const url = new URL(request.url)
      let response: Response
      if (request.method === 'OPTIONS') response = new Response(null, { status: 204 })
      else if (url.pathname === '/captures' && request.method === 'GET')
        response = Response.json({
          ...collector.snapshot(),
          build: {
            id: artifacts.buildId,
            sourceArtifact: artifacts.sourceArtifact,
            sourceSha256: artifacts.sourceSha256,
          },
        })
      else if (url.pathname === '/v1/traces' && request.method === 'POST')
        response = yield* collector.accept(request)
      else response = new Response('Not found', { status: 404 })
      if (origin !== null) response.headers.set('access-control-allow-origin', origin)
      response.headers.set('access-control-allow-methods', 'GET, POST, OPTIONS')
      response.headers.set('access-control-allow-headers', 'content-type')
      response.headers.set('vary', 'origin')
      response.headers.set('cache-control', 'no-store')
      return response
    }).pipe(respondToError)
  yield* Effect.acquireRelease(
    Effect.sync(() =>
      Bun.serve({
        hostname: '127.0.0.1',
        port: config.collectorPort,
        maxRequestBodySize: config.maxBytes,
        fetch: (request) => runCollector(collect(request), { signal: request.signal }),
      }),
    ),
    (server) => Effect.promise(() => server.stop(true)),
  )
  const tracing = yield* Layer.build(
    OtlpTracer.layer({
      url: `http://127.0.0.1:${config.collectorPort}/v1/traces`,
      resource: {
        serviceName: 'foldkit-showcase-server',
        serviceVersion: 'candidate32+observability',
      },
      exportInterval: '1 second',
      maxBatchSize: 100,
      shutdownTimeout: '3 seconds',
    }).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer)),
  )
  yield* Effect.gen(function* () {
    const flusher = yield* OtlpExporter.Flusher
    const runRequest = yield* FiberSet.makeRuntimePromise()
    const render = (request: Request) => {
      const parent = HttpTraceContext.fromHeaders(Headers.fromInput(request.headers))
      const pathname = new URL(request.url).pathname
      return Effect.gen(function* () {
        const span = yield* Effect.currentSpan
        const traceparent = HttpTraceContext.toHeaders(span).traceparent
        const result = yield* renderPageEffect(request, { buildId: artifacts.buildId, trace: true })
        const response = Server.toResponse(
          (rendered) =>
            Server.renderDocument(rendered, artifacts.assets, {
              head: `<script>${initialThemeScript}</script><meta name="showcase-traceparent" content="${traceparent}">`,
            }),
          result,
        )
        if (traceparent !== undefined) response.headers.set('x-showcase-traceparent', traceparent)
        response.headers.set('cache-control', 'no-store')
        return response
      }).pipe(
        Effect.withSpan(
          'showcase.ssr.request',
          {
            kind: 'server',
            attributes: { 'http.request.method': request.method, 'http.route': pathname },
            ...(Option.isSome(parent) ? { parent: parent.value } : {}),
          },
          { captureStackTrace: false },
        ),
      )
    }
    const handle = (request: Request) =>
      Effect.gen(function* () {
        if (!isLoopbackRequest(request)) return new Response('Local requests only', { status: 403 })
        const url = new URL(request.url)
        if (url.pathname === '/__diagnostics/flush' && request.method === 'POST') {
          yield* flusher.flush.pipe(Effect.timeoutOption('3 seconds'))
          return Response.json({ flushed: true })
        }
        if (request.method !== 'GET' && request.method !== 'HEAD')
          return new Response('Method not allowed', { status: 405 })
        const decoded = yield* Effect.try(() => decodeURIComponent(url.pathname))
        const filename = path.resolve(artifacts.clientDirectory, `.${decoded}`)
        if (
          filename.startsWith(`${artifacts.clientDirectory}${path.sep}`) &&
          !decoded.endsWith('/')
        ) {
          const file = Bun.file(filename)
          if (yield* Effect.tryPromise(() => file.exists()))
            return new Response(request.method === 'HEAD' ? null : file, {
              headers: { 'content-type': file.type, 'cache-control': 'no-store' },
            })
        }
        if (
          Server.classifyRequest(
            request.url,
            request.headers.get('sec-fetch-dest') ?? undefined,
          ) !== 'Page'
        )
          return new Response('Not found', { status: 404 })
        const response = yield* render(request)
        return request.method === 'HEAD' ? new Response(null, response) : response
      }).pipe(respondToError)
    yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve({
          hostname: '127.0.0.1',
          port: config.sitePort,
          fetch: (request) => runRequest(handle(request), { signal: request.signal }),
        }),
      ),
      (server) => Effect.promise(() => server.stop(true)),
    )
    yield* Effect.logInfo(
      `Diagnostics site http://127.0.0.1:${config.sitePort}; traces http://127.0.0.1:${config.collectorPort}/captures; build ${artifacts.buildId}; artifact ${artifacts.sourceSha256}`,
    )
    yield* Effect.never
  }).pipe(Effect.provideContext(tracing))
})

NodeRuntime.runMain(program.pipe(Effect.scoped, Effect.provide(NodeServices.layer)))
