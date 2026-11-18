import { Clock, Context, Effect, Option, Tracer } from 'effect'
import { expect, it } from 'vitest'
import { makeRecorder } from './recorder'

it('does not attribute old or crossing timing entries to a newer capture', () => {
  const spans: Array<Tracer.Span> = []
  const tracer = Tracer.make({
    span(options) {
      const span = new Tracer.NativeSpan(options)
      spans.push(span)
      return span
    },
  })
  const session = tracer.span({
    name: 'session',
    parent: Option.none(),
    annotations: Context.empty(),
    links: [],
    startTime: 0n,
    kind: 'internal',
    root: true,
    sampled: true,
  })
  const beforeCapture = performance.now()
  const recorder = makeRecorder(tracer, Effect.runSync(Clock.Clock), session, performance)
  recorder.start('new-window')
  const insideCapture = performance.now()
  recorder.span('old-longtask', beforeCapture - 10, 5, {})
  recorder.span('crossing-frame', beforeCapture - 5, insideCapture - beforeCapture + 10, {})
  recorder.span('inside', insideCapture, 3, {})
  recorder.end()
  expect(spans.map((span) => span.name)).toEqual([
    'session',
    'showcase.capture.new-window',
    'inside',
  ])
  expect(recorder.snapshot()).toMatchObject({ count: 1, excludedBeforeCapture: 2, active: false })
})
