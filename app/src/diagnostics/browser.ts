import { Clock, Context, Effect, Exit, FiberSet, Layer, Option, Tracer } from 'effect'
import { FetchHttpClient } from 'effect/http'
import { OtlpExporter, OtlpTracer } from 'effect/observability'
import type { Runtime } from 'foldkit'
import { makeRecorder } from './recorder'
import { metadataSerialization } from './serialization'

export interface TraceControl {
  readonly start: (name: string) => { traceId: string; spanId: string }
  readonly stop: () => Promise<{
    count: number
    dropped: number
    excludedBeforeCapture: number
    active: boolean
  }>
  readonly finish: () => Promise<void>
}

declare global {
  interface Window {
    __showcaseTracing?: TraceControl
  }
}

const documentParent = (document: Document) => {
  const value = document.querySelector<HTMLMetaElement>(
    'meta[name="showcase-traceparent"]',
  )?.content
  const match = value?.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-01$/u)
  return match?.[1] && match[2]
    ? Option.some(Tracer.externalSpan({ traceId: match[1], spanId: match[2], sampled: true }))
    : Option.none()
}

export const createBrowserDiagnostics = (window: Window, document: Document) => {
  let onPhase: (value: Runtime.SlowContext<unknown, unknown>) => void = () => {}
  const transport = Layer.mergeAll(
    OtlpExporter.layerFlusher,
    metadataSerialization,
    FetchHttpClient.layer,
  )
  const layer = Layer.effectContext(
    Effect.gen(function* () {
      const tracer = yield* OtlpTracer.make({
        url: 'http://127.0.0.1:5491/v1/traces',
        resource: {
          serviceName: 'foldkit-showcase-browser',
          serviceVersion: 'candidate32+observability',
        },
        exportInterval: '30 seconds',
        maxBatchSize: 5000,
      })
      const clock = yield* Clock.Clock
      const flusher = yield* OtlpExporter.Flusher
      const run = yield* FiberSet.makeRuntimePromise()
      const session = tracer.span({
        name: 'showcase.browser.session',
        parent: documentParent(document),
        annotations: Context.empty(),
        links: [],
        startTime: clock.currentTimeNanosUnsafe(),
        kind: 'internal',
        root: false,
        sampled: true,
      })
      const recorder = makeRecorder(tracer, clock, session, window.performance)
      recorder.start('bootstrap')
      onPhase = recorder.phase
      const flush = flusher.flush.pipe(Effect.timeoutOption('5 seconds'))
      const control: TraceControl = {
        start: recorder.start,
        stop: () =>
          run(Effect.sync(recorder.end).pipe(Effect.andThen(flush), Effect.map(recorder.snapshot))),
        finish: () =>
          run(
            Effect.sync(() => {
              recorder.end()
              session.end(clock.currentTimeNanosUnsafe(), Exit.void)
            }).pipe(Effect.andThen(flush), Effect.asVoid),
          ),
      }
      window.__showcaseTracing = control
      const input = (event: Event) => {
        if (!event.isTrusted) return
        const target = event.target instanceof Element ? event.target : undefined
        recorder.span(`browser.input.${event.type}`, event.timeStamp, 0, {
          'browser.event': event.type,
          'browser.dispatch_delay_ms': Math.max(0, window.performance.now() - event.timeStamp),
          'browser.target_tag': target?.tagName ?? 'unknown',
          'browser.component':
            target?.closest('[data-component]')?.getAttribute('data-component') ?? 'shell',
        })
      }
      const events = [
        'pointerdown',
        'pointermove',
        'pointerup',
        'keydown',
        'input',
        'click',
        'wheel',
      ]
      for (const event of events)
        document.addEventListener(event, input, { capture: true, passive: true })
      let lastFrame = window.performance.now()
      let frame = 0
      const tick = (now: number) => {
        recorder.span('browser.frame_interval', lastFrame, now - lastFrame, {
          'browser.frame_interval_ms': now - lastFrame,
          'browser.timing_source': 'requestAnimationFrame; not compositor paint',
        })
        lastFrame = now
        frame = window.requestAnimationFrame(tick)
      }
      frame = window.requestAnimationFrame(tick)
      const observers: Array<PerformanceObserver> = []
      for (const type of ['longtask', 'long-animation-frame', 'event']) {
        if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            recorder.span(`browser.${entry.entryType}`, entry.startTime, entry.duration, {
              'browser.entry': entry.name,
              'browser.duration_ms': entry.duration,
              'browser.timing_source': 'PerformanceObserver',
            })
        })
        observer.observe({ type, ...(type === 'event' ? { durationThreshold: 16 } : {}) })
        observers.push(observer)
      }
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          onPhase = () => {}
          recorder.end()
          session.end(clock.currentTimeNanosUnsafe(), Exit.void)
          window.cancelAnimationFrame(frame)
          for (const event of events) document.removeEventListener(event, input, true)
          for (const observer of observers) observer.disconnect()
          if (window.__showcaseTracing === control) delete window.__showcaseTracing
          yield* flusher.flush.pipe(Effect.timeoutOption('5 seconds'))
        }),
      )
      return Context.make(Tracer.Tracer, tracer).pipe(Context.add(Tracer.ParentSpan, session))
    }),
  ).pipe(Layer.provide(transport))
  const slow: Runtime.SlowConfig<unknown, unknown> = {
    show: 'Always',
    thresholdOverrides: { Update: 0, View: 0, Patch: 0, SubscriptionDependencies: 0 },
    onSlow: (context) => onPhase(context),
  }
  return { layer, slow }
}
